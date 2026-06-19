import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  // 1. EL SELLO DE SEGURIDAD SVELTEKIT
  depends('supabase:auth');

 const { session, user } = await locals.safeGetSession();

  if (!user) {
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/admin/bienvenida')) return {};
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id, auth_user_id, nombre_comercial, avatar_url')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 2. LA OPTIMIZACIÓN EXTREMA: Solo pedimos notas pendientes, no la tabla entera de Leads.
    const now = new Date().toISOString();
    const { data: alertasPendientes, error: alertasError } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', now); // Solo las vencidas o del momento

    if (alertasError) console.error("Error cargando alertas:", alertasError);

    return {
      session,
      user,
      broker,
      alertas: alertasPendientes || [] // Enviamos data ligera a la campana
    };

  } catch (err) {
    console.error("Error en layout global:", err);
    return { session, user, broker: null, alertas: [] };
  }
}
