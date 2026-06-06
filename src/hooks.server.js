import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  // 1. Buscamos tu "gafete" seguro en las cookies
  const token = event.cookies.get('inmublia-auth-token');

  // 2. EL FIX MAESTRO: Creamos el cliente de Supabase pero INYECTAMOS TU IDENTIDAD.
  // Sin esta cabecera, el servidor hace consultas "Anónimas" y RLS oculta tus leads.
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      }
    }
  });

  // 3. Proteger la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    
    // Si no hay token, rebote directo al login
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Intentamos validar la sesión con Supabase
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      // Válido: guardamos identidad del broker
      event.locals.user = user;

    } catch (err) {
      // Dejamos pasar los redireccionamientos propios de SvelteKit
      if ((typeof isRedirect === 'function' && isRedirect(err)) || err?.status === 303) {
        throw err;
      }
      
      console.error('🔥 [CRÍTICO] Fallo de sesión en el servidor:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  return await resolve(event);
}

// Registro de errores para la terminal en Cloudflare
export async function handleError({ event, error }) {
  console.error('🔥 [500 INTERNAL SERVER ERROR] 🔥');
  console.error('Ruta:', event.url.href);
  console.error('Detalle:', error?.message || error);

  return {
    message: 'Fallo interno detectado.',
    code: error?.code || 'INTERNAL_ERROR'
  };
}
