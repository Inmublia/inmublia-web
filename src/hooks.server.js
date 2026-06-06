import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  // 1. Obtenemos tu token de la cookie
  const token = event.cookies.get('inmublia-auth-token') || '';

  // 2. EL FIX MAESTRO PARA SUPABASE 2.43+ EN CLOUDFLARE
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    // ESTA LÍNEA ES LA CLAVE:
    // Obliga al cliente a usar tu JWT en cada petición a la base de datos.
    // Evita que Supabase reemplace tu identidad con la llave Anónima.
    accessToken: async () => token
  });

  // 3. Proteger la consola
  if (event.url.pathname.startsWith('/admin')) {
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      event.locals.user = user;

    } catch (err) {
      if ((typeof isRedirect === 'function' && isRedirect(err)) || err?.status === 303) {
        throw err;
      }
      
      console.error('🔥 [CRÍTICO] Fallo en validación:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  return await resolve(event);
}

export async function handleError({ event, error }) {
  console.error('🔥 [500 INTERNAL SERVER ERROR] 🔥');
  console.error('Ruta:', event.url.href);
  console.error('Detalle:', error?.message || error);
  return { message: 'Fallo interno detectado.', code: error?.code || 'INTERNAL_ERROR' };
}
