import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  // 1. EL SELLO DE SEGURIDAD SVELTEKIT
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

    const now = new Date().toISOString();

    // 2. MOTOR DE LÍNEA DE TIEMPO (Consultas en secuencia para evitar colapso en Cloudflare)
    
    const { data: recordatorios, error: errRec } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', now);

    if (errRec) console.error("Error en recordatorios:", errRec);

    const { data: notificaciones, error: errNotif } = await locals.supabase
      .from('notificaciones_agente')
      .select('id, titulo, mensaje, creado_en, leida, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('leida', false);

    if (errNotif) console.error("Error en notificaciones:", errNotif);

    // 3. Formatear y Unificar
    const alertasUnificadas = [
      ...(recordatorios || []).map(r => ({
        id: r.id,
        tipo_alerta: 'recordatorio',
        titulo: 'Seguimiento Pendiente',
        mensaje: r.contenido,
        fecha: r.fecha_recordatorio,
        lead: r.leads
      })),
      ...(notificaciones || []).map(n => ({
        id: n.id,
        tipo_alerta: 'sistema',
        titulo: n.titulo,
        mensaje: n.mensaje,
        fecha: n.creado_en,
        lead: n.leads
      }))
    ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

    return {
      session,
      user,
      broker,
      alertas: alertasUnificadas 
    };

  } catch (err) {
    console.error("Error en layout global:", err);
    return { session, user, broker: null, alertas: [] };
  }
}
