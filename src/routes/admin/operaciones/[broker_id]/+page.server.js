import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const brokerId = params.broker_id;

  if (!brokerId) {
    throw error(400, 'ID de Broker no proporcionado en la ruta');
  }

  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  const [perfilRes, propiedadesRes, auditoriaRes] = await Promise.all([
    // 🚀 FIX: Apuntamos a 'brokers' y usamos status_suscripcion
    locals.supabase
      .from('brokers')
      .select('nombre, agencia, email, plan, status_suscripcion, created_at, creditos_ia')
      .eq('id', brokerId)
      .single(),

    locals.supabase
      .from('propiedades')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId)
      .in('estatus', ['publica', 'pre-mercado']),

    locals.supabase
      .from('audit_logs')
      .select('*')
      .eq('agency_id', brokerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  if (perfilRes.error) {
    console.error('[Consola 360] Fallo al cargar perfil:', perfilRes.error.message);
    throw error(404, 'No se encontró el registro del Broker');
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
      nombre: b.nombre || 'Sin Nombre',
      agencia: b.agencia || 'Agencia Independiente',
      email: b.email || 'sin-correo@inmublia.com',
      plan: b.plan || 'Básico',
      estado: b.status_suscripcion || 'Activo',
      registro: new Date(b.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
      creditos_ia: b.creditos_ia ?? 0,
      propiedades_activas: propiedadesRes.count || 0
    },
    timeline,
    miRol: locals.rol_interno 
  };
}
