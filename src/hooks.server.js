import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  // 1. Instanciación oficial SSR vinculada a cookies y optimizada para Cloudflare Edge
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Robustecemos los atributos de la cookie para producción en Edge
          event.cookies.set(name, value, { 
            ...options, 
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'lax'
          });
        });
      }
    },
    // Vinculamos el fetch nativo de SvelteKit para optimizar la red en Cloudflare
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

    // ¡CORRECCIÓN CRÍTICA!: Guardamos el usuario validado para que tus páginas .server.js lo consuman
    event.locals.user = user;
  }

  // 4. Resolvemos la petición inyectando filtros necesarios para serialización de Supabase
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  // 5. Cabeceras de protección indispensables para un entorno SaaS
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
