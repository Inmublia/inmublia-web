import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

// 1. TRAMPA PARA ERRORES DE PÁGINAS Y LAYOUTS
// Si el 500 ocurre dentro de la página de Login o el Layout, SvelteKit lo mandará aquí.
export async function handleError({ error, event }) {
  console.error('🔥 [PAGE/LAYOUT CRASH]:', error);
  return {
    message: `[AISLAMIENTO - ERROR DE RUTA] ${error.message || 'Sin mensaje'}`,
    stack: error.stack || 'Sin stack trace'
  };
}

export async function handle({ event, resolve }) {
  try {
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
      }

      if (!brokerId) return new Response('Portal no encontrado.', { status: 404 });
      event.locals.tenantId = brokerId;
    }

    // =====================================================================
    // TRAMPA PARA ERRORES DE COOKIES Y SUPABASE
    // =====================================================================
    event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return event.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              // Limpiamos estrictamente las opciones para aislar si el dominio es el problema
              const { domain, ...cleanOptions } = options;
              event.cookies.set(name, value, { ...cleanOptions, path: '/' });
            } catch (cookieErr) {
              // Si SvelteKit rechaza la cookie, lanzamos el error para atraparlo en pantalla
              throw new Error(`[CRASH DE COOKIES] Fallo seteando '${name}': ${cookieErr.message}`);
            }
          });
        }
      }
    });

    event.locals.safeGetSession = async () => {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) return { session: null, user: null };
      
      return { session, user };
    };

    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
      const { user } = await event.locals.safeGetSession();
      if (!user) throw redirect(303, '/login?motivo=inactividad');
      event.locals.user = user;
    }

    const response = await resolve(event, {
      filterSerializedResponseHeaders(name) {
        return name === 'content-range' || name === 'x-supabase-api-version';
      }
    });

    return response;

  } catch (err) {
    // =====================================================================
    // EL ISOLADOR FINAL
    // Si el hook principal colapsa, imprimimos el error crudo en la pantalla.
    // =====================================================================
    if (err.status === 303) throw err; // Dejamos pasar las redirecciones
    
    return new Response(
      `[MODO AISLAMIENTO - CRASH EN BACKEND]\n\nMENSAJE: ${err.message}\n\nSTACK TRACE:\n${err.stack}`,
      { 
        status: 500, 
        headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
      }
    );
  }
}
