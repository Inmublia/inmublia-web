import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;
  
  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;
  
  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  // 1. RESOLUCIÓN DE MULTI-TENANT MÁS ROBUSTA
  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  if (!isRootOrAdmin) {
    const subdomain = host.split('.')[0];
    let brokerId = null;

    try {
      // Usamos el cliente admin directo para saltarnos RLS en la validación inicial
      const res = await fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
        headers: { 
          'apikey': supabaseAnonKey, 
          'Authorization': `Bearer ${supabaseAnonKey}` 
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        brokerId = data[0].id;
      }
    } catch (err) {
      console.error("🔥 Error Fallback Supabase:", err);
    }

    if (!brokerId) return new Response('Portal inmobiliario no encontrado.', { status: 404 });
    event.locals.tenantId = brokerId;
  }

  // 2. COOKIES WILD CARD PARA SESIONES CRUZADAS
  const isPagesDev = host.includes('.pages.dev');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  const cookieDomain = (isPagesDev || isLocal) ? undefined : '.inmublia.com';

  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return event.cookies.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cleanOptions } = options;
            event.cookies.set(name, value, { 
              ...cleanOptions, 
              path: '/', 
              domain: cookieDomain 
            });
          });
        } catch (err) {
          // Ignoramos silenciosamente si SvelteKit choca, el SSR manda
        }
      }
    }
  });

  // 3. RECUPERACIÓN DE SESIÓN (Tolerante a caídas)
  event.locals.safeGetSession = async () => {
    try {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) {
        if (error.status >= 500 || error.message.includes('fetch')) return { session, user: session.user };
        return { session: null, user: null };
      }
      return { session, user };
    } catch {
      return { session: null, user: null };
    }
  };

  // 4. EL FIX DEL 500: Redirección usando URL absoluta para no romper Cloudflare
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) {
       // Cloudflare Edge odia los paths relativos en throw redirect a veces.
       // Construimos la URL absoluta hacia el login.
       const loginUrl = new URL('/login?motivo=inactividad', event.url.origin);
       throw redirect(303, loginUrl.toString());
    }
    event.locals.user = user;
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}
