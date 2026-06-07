import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

  // 1. Cliente puro SSR
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
        } catch (err) {}
      }
    }
  });

  // 2. Operador seguro de sesión
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

  // 3. Protección de consola Admin
  if (event.url.pathname.startsWith('/admin')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    event.locals.user = user;
  }

  // 4. Resolvemos la respuesta
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });

  // 🔥 5. EL PARCHE VITAL PARA CLOUDFLARE (EL QUE TE HICE BORRAR) 🔥
  // Extraemos las cookies antes de que Cloudflare las aplaste
  const setCookieHeaders = response.headers.getSetCookie();
  
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    // Clonamos la respuesta para modificar las cabeceras a la fuerza
    const newResponse = new Response(response.body, response);
    
    // Eliminamos la cabecera corrupta/aplastada
    newResponse.headers.delete('set-cookie');
    
    // Inyectamos cada cookie EXACTA y separada para que el navegador sí la guarde
    setCookieHeaders.forEach(cookie => {
      newResponse.headers.append('set-cookie', cookie);
    });

    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return newResponse;
  }

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export async function handleError({ error, event }) {
  console.error('🔥 [ERROR CRÍTICO SSR]:', error, event.url.pathname);
  return { message: 'Fallo interno del servidor.' };
}
