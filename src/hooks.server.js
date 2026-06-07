import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public'; // Evita vacíos en compilación de Cloudflare

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🔥 [ERROR ENV]: Las variables de Supabase no están definidas en el entorno dinámico de Cloudflare.');
  }

  // Detectamos si el usuario final está bajo SSL real o proxy de Cloudflare (Flexible SSL)
  const isHttps = event.url.protocol === 'https:' || event.request.headers.get('x-forwarded-proto') === 'https';

  // 1. Instanciación oficial SSR con parser tolerante a fallos de Cloudflare
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Método primario: Intentar usar el cargador nativo de SvelteKit
        const svelteKitCookies = event.cookies.getAll();
        if (svelteKitCookies && svelteKitCookies.length > 0) {
          return svelteKitCookies;
        }

        // FALLBACK FAILSAFE: Si SvelteKit falla en el Edge, leemos la cabecera HTTP cruda directa
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
          // Desestructuramos el dominio para evitar bloqueos en entornos de Cloudflare Pages
          const { domain, ...cleanOptions } = options;
          
          event.cookies.set(name, value, { 
            ...cleanOptions, 
            path: '/',
            secure: isHttps // Forzamos SSL si el usuario está en HTTPS (soluciona Flexible SSL)
          });
        });
      }
    },
    fetch: event.fetch
  });

  // 2. Operador seguro de sesión certificado
  event.locals.safeGetSession = async () => {
    try {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) return { session: null, user: null };

      return { session, user };
    } catch (err) {
      console.error('🔥 Error en safeGetSession:', err);
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
