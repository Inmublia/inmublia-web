import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  depends('supabase:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  const { session, user } = await locals.safeGetSession();

  if (!user) {
    if (url.pathname.startsWith('/login')) return {};
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();
    
    // 1. Recordatorios Manuales
    const { data: recordatorios, error: errRec } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', user.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', endOfTodayISO);

    // 2. Notificaciones Explícitas del Sistema
    const { data: notificaciones, error: errNotif } = await locals.supabase
      .from('notificaciones_agente')
      .select('id, titulo, mensaje, creado_en, leida, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('leida', false);

    // 3. MOTOR DE SEMÁFORO DE ABANDONO (La nueva inteligencia)
    const { data: leadsActivos, error: errLeadsActivos } = await locals.supabase
      .from('leads')
      .select('id, nombre, estado, ultima_actividad')
      .eq('broker_id', broker.id)
      .in('estado', ['nuevo', 'contactado', 'visita', 'negociacion']);

    const formatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const formatSafe = (dateString) => {
      if (!dateString) return '';
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return formatter.format(d);
    };

    const extraerLead = (leadData) => {
      if (!leadData) return null;
      return Array.isArray(leadData) ? leadData[0] : leadData;
    };

    // Evaluamos el tiempo transcurrido para generar alertas crudas en memoria
    const alertasAbandono = (leadsActivos || []).filter(lead => {
       if (!lead.ultima_actividad) return false;
       const act = new Date(lead.ultima_actividad);
       const diffHours = (now - act) / (1000 * 60 * 60);
       
       if (lead.estado === 'nuevo' && diffHours >= 24) return true;
       if (['contactado', 'visita', 'negociacion'].includes(lead.estado) && diffHours >= 72) return true;
       
       return false;
    }).map(lead => ({
       id: `abandono-${lead.id}`, 
       tipo_alerta: 'sistema',
       titulo: lead.estado === 'nuevo' ? '¡Atención Crítica (24h)!' : 'Riesgo de Enfriamiento (72h)',
       mensaje: lead.estado === 'nuevo' ? 'Prospecto nuevo sin contactar.' : 'Han pasado 3 días sin actividad.',
       fecha: lead.ultima_actividad, 
       fecha_formateada: formatSafe(lead.ultima_actividad),
       lead: lead
    }));

    // 4. Unificar, ordenar y aplicar Paginación Estricta (Top 20)
    const alertasUnificadas = [
      ...(recordatorios || []).map(r => ({
        id: r.id,
        tipo_alerta: 'recordatorio',
        titulo: 'Seguimiento Pendiente',
        mensaje: r.contenido,
        fecha: r.fecha_recordatorio,
        fecha_formateada: formatSafe(r.fecha_recordatorio),
        lead: extraerLead(r.leads)
      })),
      ...(notificaciones || []).map(n => ({
        id: n.id,
        tipo_alerta: 'sistema',
        titulo: n.titulo,
        mensaje: n.mensaje,
        fecha: n.creado_en,
        fecha_formateada: formatSafe(n.creado_en),
        lead: extraerLead(n.leads)
      })),
      ...alertasAbandono
    ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
     .slice(0, 20); // PROTECCIÓN DE RENDIMIENTO

    return {
      session,
      user,
      broker,
      alertasGlobales: alertasUnificadas 
    };

  } catch (err) {
    console.error("Error en layout global:", err);
    return { session, user, broker: null, alertasGlobales: [] }; 
  }
}
