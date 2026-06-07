import { createServerClient } from '@supabase/ssr';
import { redirect, isRedirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  // 1. Instanciación oficial SSR vinculada al sistema de cookies de SvelteKit
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' });
        });
      }
    }
  });

  // 2. Operador seguro de sesión certificado para Cloudflare Edge
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
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}

export async function handleError({ error }) {
  console.error('🔥 [ERROR CRÍTICO SSR]:', error);
  return { message: 'Fallo interno del servidor.' };
}
