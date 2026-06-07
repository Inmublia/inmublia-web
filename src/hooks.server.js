import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public'; // Variables dinámicas de entorno

export async function handle({ event, resolve }) {
  // Fallback de seguridad para variables de entorno en Cloudflare Pages
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🔥 [ERROR ENV]: Las variables de Supabase no están definidas en hooks.server.js.');
  }

  // 1. Instanciación oficial SSR con eliminación preventiva de dominios conflictivos
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
          // Desestructuramos el dominio para evitar el rechazo de navegador (Same-Origin Policy)
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

  // 5. SOLUCIÓN AL BUG DE CABECERAS MULTI-VALOR DE CLOUDFLARE WORKERS
  // Extraemos las cookies individuales encoladas de forma segura antes de que Cloudflare las colapse
  const setCookieHeaders = response.headers.getSetCookie();
  
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    // Clonamos la respuesta de SvelteKit para poder modificar las cabeceras en caliente
    const newResponse = new Response(response.body, response);
    
    // Eliminamos la cabecera colapsada por Cloudflare
    newResponse.headers.delete('set-cookie');
    
    // Inyectamos cada cookie de Supabase por separado de forma limpia usando headers.append()
    setCookieHeaders.forEach(cookie => {
      newResponse.headers.append('set-cookie', cookie);
    });

    // Inyectamos las cabeceras de seguridad SaaS obligatorias
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return newResponse;
  }

  // Si no hay cookies que setear, inyectamos las cabeceras de seguridad en la respuesta estándar
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
