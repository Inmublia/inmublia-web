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
    // 2. EXTRACCIÓN DEL BROKER (Cargamos TODO con '*' para asegurar plan y estatus)
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 3. LA OPTIMIZACIÓN EXTREMA: Notas pendientes
    const now = new Date().toISOString();
    const { data: alertasPendientes, error: alertasError } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', now); 

    if (alertasError) console.error("Error cargando alertas:", alertasError);

    // 4. CARGA DE INMUEBLES: Extrayendo las propiedades exclusivas de este agente
    const { data: propiedades, error: propError } = await locals.supabase
      .from('propiedades')
      .select('id, titulo, slug, estatus, precio, operacion, ubicacion, imagen_url, destacada, open_houses(id, event_date, time_end)')
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) console.error("Error cargando propiedades:", propError);

    // 5. RETORNO COMPLETO PARA LA VISTA
    return {
      session,
      user,
      broker,
      alertas: alertasPendientes || [],
      propiedades: propiedades || []
    };

  } catch (err) {
    console.error("Error en admin page server:", err);
    return { session, user, broker: null, alertas: [], propiedades: [] };
  }
}
