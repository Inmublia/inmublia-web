import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public'; // Variables dinámicas de entorno

export async function handle({ event, resolve }) {
  // Fallback robusto para leer variables tanto de SvelteKit como del entorno de Cloudflare Pages
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🔥 [ERROR ENV]: Las variables de Supabase no están definidas en hooks.server.js.');
  }

  // 1. Instanciación oficial SSR utilizando las opciones exactas dictadas por Supabase SSR
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const svelteKitCookies = event.cookies.getAll();
        if (svelteKitCookies && svelteKitCookies.length > 0) {
          return svelteKitCookies;
        }

        // Failsafe: Parser manual de cookies en crudo si SvelteKit tiene lag de lectura en Edge
        const rawCookieHeader = event.request.headers.get('cookie') || '';
        const parsedCookies = [];
        rawCookieHeader.split(';').forEach(cookieStr => {
          const parts = cookieStr.split('=');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            parsedCookies.push({ name, value });
          }
        });
        return parsedCookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // ⚠️ FIX DE SEGURIDAD CRÍTICO: Desestructuramos para ELIMINAR 'domain' de las opciones.
          // Esto evita que el navegador rechace silenciosamente la cookie por Same-Origin Policy.
          const { domain, ...cleanOptions } = options;
          
          event.cookies.set(name, value, { 
            ...cleanOptions, 
            path: '/' 
          });
        });
      }
    }
  });

  // 2. Operador seguro de sesión certificado
  event.locals.safeGetSession = async () => {
    try {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) return { session: null, user: null };

      return { session, user };
    } catch {
      return { session: null, user: null };
    }
  };

  // 3. Barrera de seguridad para la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    const { user } = await event.locals.safeGetSession();
    
    if (!user) {
      throw redirect(303, '/login?motivo=inactividad');
    }

    event.locals.user = user;
  }

  // 4. Resolvemos la petición
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  // 5. Cabeceras de seguridad indispensables para un entorno SaaS
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export async function handleError({ error, event }) {
  console.error('🔥 [ERROR CRÍTICO SSR]:', {
    message: error instanceof Error ? error.message : error,
    path: event.url.pathname
  });
  return { message: 'Fallo interno del servidor.' };
}
