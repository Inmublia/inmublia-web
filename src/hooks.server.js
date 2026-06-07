import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Valida de forma local si el token tiene una estructura JWT válida (header.payload.signature)
 * para evitar llamadas innecesarias a la API externa de Supabase en caso de tokens maliciosos.
 */
function isStructurallyValidJwt(token) {
  if (!token) return false;
  const parts = token.split('.');
  return parts.length === 3;
}

export async function handle({ event, resolve }) {
  const token = event.cookies.get('inmublia-auth-token');

  // Construimos las cabeceras de autorización limpias
  const headers = {};
  if (token && isStructurallyValidJwt(token)) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Configuración de borrado seguro de cookies para producción/Edge
  const secureCookieOptions = {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax'
  };

  // Instanciación del cliente optimizado para Cloudflare Edge
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { 
      headers,
      // Pasamos el fetch nativo de SvelteKit para reutilizar túneles de conexión en Edge
      fetch: event.fetch 
    }
  });

  // Protección de rutas administrativas
  if (event.url.pathname.startsWith('/admin')) {
    if (!token || !isStructurallyValidJwt(token)) {
      // Si no hay token o es estructuralmente inválido, evitamos la llamada a Supabase
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Supabase recibe el token y realiza la validación de firma y expiración
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', secureCookieOptions);
        throw redirect(303, '/login?motivo=inactividad');
      }

      // Inyectamos el usuario validado en el ciclo de vida de la petición
      event.locals.user = user;

    } catch (err) {
      // Si el error es una redirección nativa de SvelteKit, la dejamos pasar sin interferir
      if (isRedirect(err)) {
        throw err;
      }
      
      console.error('🔥 ERROR AUTH:', err);
      event.cookies.delete('inmublia-auth-token', secureCookieOptions);
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  // Resolvemos la petición e inyectamos cabeceras de seguridad indispensables para un SaaS
  const response = await resolve(event);
  
  // Protegemos el panel de administración contra Clickjacking y sniffing de contenido
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export async function handleError({ error, event }) {
  console.error('🔥 ERROR FATAL SSR:', {
    message: error instanceof Error ? error.message : error,
    path: event.url.pathname
  });
  
  return { 
    message: 'Fallo interno del servidor.' 
  };
}
