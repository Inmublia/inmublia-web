// src/routes/admin/operaciones/[broker_id]/+page.server.js
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function load({ params, locals }) {
  const brokerId = params.broker_id;

  if (!brokerId) {
    throw error(400, 'ID de Broker no proporcionado en la ruta');
  }

  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  const supabaseAdmin = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const [perfilRes, propiedadesRes, auditoriaRes] = await Promise.all([
    supabaseAdmin.from('brokers').select('*').eq('id', brokerId).single(),
    supabaseAdmin.from('propiedades').select('id', { count: 'exact', head: true }).eq('broker_id', brokerId),
    // La tabla audit_logs sí usa 'created_at' porque así la declaramos en la Fase 1
    supabaseAdmin.from('audit_logs').select('*').eq('agency_id', brokerId).eq('is_archived', false).order('created_at', { ascending: false }).limit(50)
  ]);

  if (perfilRes.error) {
    console.error('[Consola 360] Fallo al cargar perfil:', perfilRes.error);
    throw error(404, `No se encontró la información del Broker: ${perfilRes.error.message}`);
  }

  const rawLogs = auditoriaRes.data || [];
  
  const timeline = rawLogs.map(log => {
    const fecha = new Date(log.created_at);
    const tiempoFmt = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const colorMap = { 'success': 'emerald', 'error': 'red', 'critical': 'red', 'warning': 'amber' };

    let fallbackDesc = `Sistema ejecutó: ${log.action_type}`;
    if (log.action_type === 'ia.support.chat') {
      fallbackDesc = log.status === 'success' ? `Consulta IA resuelta en ${log.metadata?.latency_ms || 0}ms.` : `Fallo de IA.`;
    } else if (log.action_type.includes('login')) {
      fallbackDesc = `Acceso desde IP: ${log.metadata?.network?.ip || 'Desconocida'}`;
    }

    return {
      id: log.id,
      tiempo: tiempoFmt,
      evento: log.action_type,
      color: colorMap[log.status] || 'slate',
      descripcion: log.metadata?.descripcion || log.metadata?.error_message || fallbackDesc,
      raw_metadata: log.metadata 
    };
  });

  const b = perfilRes.data;

  return {
    broker: {
      id: brokerId,
      nombre: b.nombre_comercial || b.subdominio || 'Agencia sin nombre',
      agencia: b.nombre_comercial || 'Agencia Independiente',
      email: b.email || 'N/A',
      plan: b.plan_suscripcion || 'Básico',
      estado: b.status_suscripcion || 'Activo',
      registro: b.creado_en ? new Date(b.creado_en).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Desconocida',
      creditos_ia: b.ia_creditos_disponibles ?? 0,
      propiedades_activas: propiedadesRes.count || 0
    },
    timeline,
    miRol: locals.rol_interno 
  };
}
