import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url }) {
  // 1. DESTRUCCIÓN DE CACHÉ (Solución de seguridad al botón "Atrás")
  // La mantenemos para seguridad, pero ya no causará el bug porque usaremos safeGetSession()
  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  // 2. VALIDACIÓN DE SESIÓN ESTRICTA (EL FIX)
  // En lugar de confiar solo en el valor residual de la cookie (locals.user),
  // obligamos a Supabase a validar y auto-renovar el token si está a punto de caducar
  // por culpa de la navegación cruzada de subdominios.
  const { user } = await locals.safeGetSession();

  // Si no hay usuario activo incluso después de forzar la validación de Supabase...
  if (!user) {
    if (url.pathname.startsWith('/login')) {
      return {};
    }
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    // 3. EXTRACCIÓN DEL BROKER (Mantenemos la seguridad UUID)
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 4. DESCARGA DE LEADS PARA NOTIFICACIONES GLOBALES (La campana)
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
    return {
      user,
      broker: null,
      leads: []
    };
  }
}
