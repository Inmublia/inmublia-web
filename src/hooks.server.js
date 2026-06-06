import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  // 1. Obtenemos tu token de la cookie
  const token = event.cookies.get('inmublia-auth-token');

  // 2. Preparamos tu Gafete de Identidad (Para que los leads sean visibles)
  const customHeaders = {};
  if (token) {
    customHeaders.Authorization = `Bearer ${token}`;
  }

  // 3. EL CLIENTE BLINDADO
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: event.fetch,      // <--- ESTO EVITA EL CUELGUE DE 2 MINUTOS
      headers: customHeaders   // <--- ESTO HACE QUE APAREZCA TU NOMBRE Y TUS LEADS
    }
  });

  // 4. Proteger la consola
  if (event.url.pathname.startsWith('/admin')) {
    
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Validamos tu acceso
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      // Válido: te damos luz verde
      event.locals.user = user;

    } catch (err) {
      if ((typeof isRedirect === 'function' && isRedirect(err)) || err?.status === 303) {
        throw err;
      }
      
      console.error('🔥 [CRÍTICO] Fallo en la verificación:', err);
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
