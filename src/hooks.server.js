import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('🔥 [ERROR ENV]: Variables de Supabase no definidas.');
  }

  // Cliente puro SSR: SvelteKit 2 maneja las cookies perfectamente en Edge
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cleanOptions } = options;
            event.cookies.set(name, value, { ...cleanOptions, path: '/' });
          });
        } catch (err) {
          // Ignoramos si las cabeceras ya salieron hacia el navegador
        }
      }
    }
  });

  // Operador de sesión seguro y validado
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

  // Barrera RLS para el panel admin
  if (event.url.pathname.startsWith('/admin')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) throw redirect(303, '/login?motivo=inactividad');
    event.locals.user = user;
  }

  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  // Cabeceras estrictas de seguridad
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export async function handleError({ error, event }) {
  console.error('🔥 [ERROR CRÍTICO SSR]:', error, event.url.pathname);
  return { message: 'Fallo interno del servidor.' };
}
