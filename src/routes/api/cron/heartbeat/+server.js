// src/routes/api/cron/heartbeat/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { procesarDifusion } from '$lib/server/portales-sync';
import { procesarLeadsEntrantes } from '$lib/server/leads-processor';

export async function GET() {
  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  const metricas = { propiedadesSincronizadas: 0, leadsProcesados: 0, errores: [] };

  // =====================================================================
  // HILO A: MOTOR DE DIFUSIÓN (Salida a Portales)
  // =====================================================================
  const ejecutarDifusion = async () => {
    // Usamos el RPC con Fair Queuing y Advisory Locks implementado en la Fase 1
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
    }
  };

  // =====================================================================
  // HILO B: MOTOR DE INGESTA (Entrada de Prospectos)
  // =====================================================================
  const ejecutarIngesta = async () => {
    try {
      metricas.leadsProcesados = await procesarLeadsEntrantes(supabaseAdmin);
    } catch (err) {
      metricas.errores.push(`Error Procesador Leads: ${err.message}`);
    }
  };

  // =====================================================================
  // EJECUCIÓN CONCURRENTE ENTERPRISE
  // =====================================================================
  await Promise.allSettled([
    ejecutarDifusion(),
    ejecutarIngesta()
  ]);

  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    metrics: metricas
  });
}
