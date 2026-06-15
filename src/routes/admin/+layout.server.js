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

  let unreadAlertsCount = 0;

  try {
    // 3. EXTRACCIÓN OPTIMIZADA DEL BROKER (Usando auth_user_id en lugar de email)
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    // 4. CONTEO DE ALERTAS INACTIVAS
    if (broker && !brokerError) {
      const { count, error: countError } = await locals.supabase
        .from('notificaciones_agente')
        .select('*', { count: 'exact', head: true })
        .eq('broker_id', broker.id)
        .eq('leida', false);

      if (!countError && count) {
        unreadAlertsCount = count;
      }
    }
  } catch (err) {
    console.error("Error al cargar notificaciones globales:", err);
    // No bloqueamos la carga de la app si fallan las alertas
  }

  // 5. EXPOSICIÓN DE DATOS SEGUROS AL FRONTEND
  return {
    user,
    unreadAlertsCount
  };
}
