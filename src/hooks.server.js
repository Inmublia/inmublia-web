import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

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
          // Captura silenciosa recomendada por SvelteKit
        }
      }
    }
  });

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

  if (event.url.pathname.startsWith('/admin')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) throw redirect(303, '/login?motivo=inactividad');
    event.locals.user = user;
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}
