// src/routes/api/cron/heartbeat/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { procesarDifusion } from '$lib/server/portales-sync';
import { procesarLeadsEntrantes } from '$lib/server/leads-processor';

export async function GET({ request }) {
  // =====================================================================
  // 1. BARRERA DE SEGURIDAD ZERO-TRUST (Estándar 2026)
  // Solo permite la ejecución si el orquestador externo (n8n) envía la llave correcta.
  // =====================================================================
  const authHeader = request.headers.get('Authorization');
  
  if (!privateEnv.CRON_SECRET || authHeader !== `Bearer ${privateEnv.CRON_SECRET}`) {
    console.warn('[HEARTBEAT] Intento de ejecución rechazado. Firma no autorizada.');
    return json({ error: 'Acceso Denegado' }, { status: 401 });
  }

  // Cliente con permisos bypass RLS para operaciones internas de sistema
  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  const metricas = { propiedadesSincronizadas: 0, leadsProcesados: 0, errores: [] };

  // =====================================================================
  // HILO A: MOTOR DE DIFUSIÓN (Salida a Portales)
  // =====================================================================
  const ejecutarDifusion = async () => {
    try {
      // Usamos el RPC atómico (Fair Queuing) para evitar choques entre servidores
      const { data: jobs, error } = await supabaseAdmin.rpc('tomar_jobs_cola', { p_limite: 15 });
      
      if (error) {
        metricas.errores.push(`Error Extracción Cola: ${error.message}`);
        return;
      }
      
      if (jobs && jobs.length > 0) {
        const resultados = await Promise.allSettled(
          jobs.map(job => procesarDifusion(supabaseAdmin, job))
        );
        
        metricas.propiedadesSincronizadas = resultados.filter(r => r.status === 'fulfilled').length;
        
        // Registrar errores individuales sin detener el flujo general
        resultados.forEach((r, i) => {
          if (r.status === 'rejected') {
            metricas.errores.push(`Sincronización Job ${jobs[i].id} falló: ${r.reason?.message || r.reason}`);
          }
        });
      }
    } catch (err) {
      metricas.errores.push(`Fallo crítico Hilo A (Difusión): ${err.message}`);
    }
  };

  // =====================================================================
  // HILO B: MOTOR DE INGESTA (Entrada de Prospectos - DLQ)
  // =====================================================================
  const ejecutarIngesta = async () => {
    try {
      metricas.leadsProcesados = await procesarLeadsEntrantes(supabaseAdmin);
    } catch (err) {
      metricas.errores.push(`Fallo crítico Hilo B (Leads): ${err.message}`);
    }
  };

  // =====================================================================
  // EJECUCIÓN CONCURRENTE ENTERPRISE
  // Promise.allSettled aísla los procesos. Si ML está caído, la entrada de EB sigue viva.
  // =====================================================================
  await Promise.allSettled([
    ejecutarDifusion(),
    ejecutarIngesta()
  ]);

  // Retornamos 200 OK para que n8n registre la operación como exitosa,
  // inyectando las métricas precisas para tu panel de observabilidad.
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    metrics: metricas
  });
}
