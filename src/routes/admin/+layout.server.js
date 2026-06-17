import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  // 1. REGISTRO DE DEPENDENCIA (La clave para evitar la colisión)
  // Le dice a SvelteKit que re-ejecute este archivo si el frontend lo pide
  depends('supabase:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  // 2. OBTENER SESIÓN Y USUARIO DE FORMA SEGURA
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

    const { data: leads, error: leadsError } = await locals.supabase
      .from('leads')
      .select(`id, nombre, lead_notas(id, contenido, tipo, fecha_recordatorio, completado)`)
      .eq('broker_id', broker.id);

    if (leadsError) throw leadsError;

    return {
      session, // <-- CRÍTICO: Exponemos la sesión al cliente para que la vigile
      user,
      broker,
      leads: leads || []
    };

  } catch (err) {
    console.error("Error al cargar datos globales:", err);
    return { session, user, broker: null, leads: [] };
  }
}
