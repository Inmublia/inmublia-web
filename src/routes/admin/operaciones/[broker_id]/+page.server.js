// src/routes/admin/operaciones/[broker_id]/+page.server.js
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const brokerId = params.broker_id;

  if (!brokerId) {
    throw error(400, 'ID de Broker no proporcionado en la ruta');
  }

  // 1. Autenticación de la Consola (Protección nivel Operaciones)
  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  // 2. Telemetría de Alta Velocidad (Consultas en Paralelo)
  const [perfilRes, propiedadesRes, auditoriaRes] = await Promise.all([
    // A. Identidad y Economía del Broker
    locals.supabase
      .from('perfiles') // Ajusta esto si tu tabla se llama 'brokers' o 'usuarios'
      .select('nombre, agencia, email, plan, estado, created_at, creditos_ia')
      .eq('id', brokerId)
      .single(),

    // B. Métrica Atómica (Count exacto sin descargar la data pesada)
    locals.supabase
      .from('propiedades')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', brokerId)
      .in('estatus', ['publica', 'pre-mercado']),

    // C. El Ledger Inmutable (Últimos 50 eventos, descartando los archivados por ti)
    locals.supabase
      .from('audit_logs')
      .select('*')
      .eq('agency_id', brokerId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50)
  ]);

  // Si no existe el broker, cortamos la ejecución con un 404 limpio
  if (perfilRes.error) {
    console.error('[Consola 360] Fallo al cargar perfil:', perfilRes.error.message);
    throw error(404, 'No se encontró el registro del Broker');
  }

  // 3. Motor de Transformación (Parsing para la UI)
  const rawLogs = auditoriaRes.data || [];
  
  const timeline = rawLogs.map(log => {
    const fecha = new Date(log.created_at);
    // Formato de hora impecable: "10:02 AM"
    const tiempoFmt = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    // Mapeo semántico de colores del Timeline
    const colorMap = {
      'success': 'emerald',
      'error': 'red',
      'critical': 'red',
      'warning': 'amber'
    };

    // Inteligencia de descripciones basada en el Action Type
    let fallbackDesc = `Sistema ejecutó: ${log.action_type}`;
    if (log.action_type === 'ia.support.chat') {
      fallbackDesc = log.status === 'success' 
        ? `Consulta IA resuelta en ${log.metadata?.latency_ms || 0}ms.` 
        : `Fallo de IA en Cloudflare. Reembolso activado.`;
    } else if (log.action_type.includes('login')) {
      fallbackDesc = `Acceso desde IP: ${log.metadata?.network?.ip || 'Desconocida'}`;
    }

    return {
      id: log.id,
      tiempo: tiempoFmt,
      evento: log.action_type,
      color: colorMap[log.status] || 'slate',
      descripcion: log.metadata?.descripcion || log.metadata?.error_message || fallbackDesc,
      raw_metadata: log.metadata // Viaja al frontend para cuando hagamos clic en el "Inspector IA"
    };
  });

  const b = perfilRes.data;

  // 4. Entrega de Payload al Frontend
  return {
    broker: {
      id: brokerId,
      nombre: b.nombre || 'Sin Nombre',
      agencia: b.agencia || 'Agencia Independiente',
      email: b.email || 'sin-correo@inmublia.com',
      plan: b.plan || 'Básico',
      estado: b.estado || 'Activo',
      registro: new Date(b.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
      creditos_ia: b.creditos_ia ?? 0,
      propiedades_activas: propiedadesRes.count || 0
    },
    timeline
  };
}
