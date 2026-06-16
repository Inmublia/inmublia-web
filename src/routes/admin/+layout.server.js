import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url }) {
  // 1. DESTRUCCIÓN DE CACHÉ (Solución de seguridad al botón "Atrás")
  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  // 2. VALIDACIÓN DE SESIÓN ESTRICTA
  const user = locals.user;

  // Si no hay usuario activo o el token expiró...
  if (!user) {
    if (url.pathname.startsWith('/login')) {
      return {};
    }
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    // 3. EXTRACCIÓN OPTIMIZADA DEL BROKER (Usando auth_user_id en lugar de email)
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 4. DESCARGA DE LEADS PARA NOTIFICACIONES GLOBALES
    // Se descargan los leads con sus notas para que el NotificationBell pueda calcular los recordatorios
    const { data: leads, error: leadsError } = await locals.supabase
      .from('leads')
      .select(`id, nombre, lead_notas(id, contenido, tipo, fecha_recordatorio, completado)`)
      .eq('broker_id', broker.id);

    if (leadsError) throw leadsError;

    // 5. EXPOSICIÓN DE DATOS SEGUROS AL FRONTEND
    return {
      user,
      broker,
      leads: leads || []
    };

  } catch (err) {
    console.error("Error al cargar datos globales del admin:", err);
    // En caso de fallo en BD, no rompemos la app completa, regresamos arrays vacíos
    return {
      user,
      broker: null,
      leads: []
    };
  }
}
