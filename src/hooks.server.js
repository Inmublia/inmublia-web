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

  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  if (!isRootOrAdmin) {
    const subdomain = host.split('.')[0];
    let brokerId = null;

    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${subdomain}`);
    }

    if (!brokerId) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          brokerId = data[0].id;
          if (event.platform?.context?.waitUntil && event.platform?.env?.INMUBLIA_KV) {
            event.platform.context.waitUntil(event.platform.env.INMUBLIA_KV.put(`tenant:${subdomain}`, brokerId));
          }
        }
      } catch (err) {
        console.error("🔥 Error Fallback Supabase:", err);
      }
    }

    if (!brokerId) return new Response('Portal no encontrado.', { status: 404 });
    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // EL CANDADO MULTI-TENANT FINAL
  // =====================================================================
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return event.cookies.getAll(); },
      setAll(cookiesToSet) {
        try {
          // Identificamos el entorno para no romper Cloudflare Pages ni Localhost
          const isPagesDev = host.includes('.pages.dev');
          const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
          
          // CRÍTICO: El punto inicial permite que la cookie cruce subdominios (RFC 6265)
          const cookieDomain = (isPagesDev || isLocal) ? undefined : '.inmublia.com';
          
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cleanOptions } = options;
            event.cookies.set(name, value, { 
              ...cleanOptions, 
              path: '/', 
              domain: cookieDomain 
            });
          });
        } catch (err) {
          // Silenciamos este catch. Si SvelteKit tira error de headers aquí, 
          // el layout de Svelte ya lo manejó y no queremos un doble crash.
        }
      }
    }
  });

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

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
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
