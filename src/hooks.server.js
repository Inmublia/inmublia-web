import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;
  
  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;
  
  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  if (!isRootOrAdmin) {
    const subdomain = host.split('.')[0];
    let brokerId = null;

    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${subdomain}`);
    }

    if (!brokerId) {
      const serviceKey = event.platform?.env?.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
      try {
        // Usar fetch global de la plataforma para no romper el Edge
        const res = await fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
          headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          brokerId = data[0].id;
          if (event.platform?.context?.waitUntil && event.platform?.env?.INMUBLIA_KV) {
            event.platform.context.waitUntil(event.platform.env.INMUBLIA_KV.put(`tenant:${subdomain}`, brokerId));
          }
        }
      } catch (e) {}
    }

    if (!brokerId) return new Response('Portal inmobiliario no encontrado.', { status: 404 });
    event.locals.tenantId = brokerId;
  }

  // FIX COOKIES: Dejamos que SvelteKit maneje el dominio nativamente
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return event.cookies.getAll(); },
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

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) {
      // FIX CLOUDFLARE: Redirecciones absolutas siempre
      const loginUrl = new URL('/login?motivo=inactividad', event.url.origin).toString();
      throw redirect(303, loginUrl);
    }
    event.locals.user = user;
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}
