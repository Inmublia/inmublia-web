import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export async function handle({ event, resolve }) {
  const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Error crítico: Variables de Supabase ausentes', { status: 500 });
  }

  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;

  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  // =====================================================================
  // 1. RESOLUCIÓN DE MULTI-TENANT
  // =====================================================================
  if (!isRootOrAdmin) {
    const subdomain = host.split('.')[0];
    let brokerId = null;

    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${subdomain}`);
    }

    if (!brokerId) {
      try {
        const res = await event.fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
          headers: {
            'apikey': supabaseServiceKey || supabaseAnonKey,
            'Authorization': `Bearer ${supabaseServiceKey || supabaseAnonKey}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            brokerId = data[0].id;
            if (event.platform?.context?.waitUntil && event.platform?.env?.INMUBLIA_KV) {
              event.platform.context.waitUntil(
                event.platform.env.INMUBLIA_KV.put(`tenant:${subdomain}`, brokerId)
              );
            }
          }
        }
      } catch (err) {
        console.error("Error en validacion Edge:", err);
      }
    }

    if (!brokerId) {
      return new Response('Portal inmobiliario no encontrado o inactivo.', { status: 404 });
    }

    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // 2. CONFIGURACIÓN LIMPIA DE COOKIES (Nativa de SvelteKit)
  // =====================================================================
  const isPagesDev = host.includes('.pages.dev');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  
  const cookieDomain = (isPagesDev || isLocal) ? undefined : 'inmublia.com';

  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: event.fetch },
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
        } catch (err) {}
      }
    }
  });

  // =====================================================================
  // 3. RECUPERACIÓN DE SESIÓN RESILIENTE
  // =====================================================================
  event.locals.safeGetSession = async () => {
    try {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) {
        if (error.status >= 500 || error.message.includes('fetch')) {
          return { session, user: session.user };
        }
        return { session: null, user: null };
      }
      return { session, user };
    } catch {
      return { session: null, user: null };
    }
  };

  // =====================================================================
  // 4. PROTECCIÓN DE RUTAS
  // =====================================================================
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) {
      throw redirect(303, `https://${host}/login?motivo=inactividad`);
    }
    event.locals.user = user;
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}

// =====================================================================
// 5. EXTRACTOR DE ERRORES (Pasa el rastro exacto a +error.svelte)
// =====================================================================
export function handleError({ error, event }) {
  console.error('🔥 [ERROR CRÍTICO REVELADO]:', error);
  
  return {
    message: error.message || 'Error interno desconocido',
    stack: error.stack || 'No hay stack trace disponible'
  };
}
