import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  // Extraemos las variables tanto del entorno dinámico como del platform de Cloudflare
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = event.platform?.env?.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response('Error crítico: Faltan las variables de entorno de Supabase.', { status: 500 });
  }
  
  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;
  
  // Escudo protector para assets estáticos
  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  // Identificamos el contexto de enrutamiento
  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  // =====================================================================
  // 1. RESOLUCIÓN DE MULTI-TENANT (Bypasando RLS de forma segura)
  // =====================================================================
  if (!isRootOrAdmin) {
    const subdomain = host.split('.')[0];
    let brokerId = null;

    // Primero intentamos buscar en la caché ultrarrápida de Cloudflare KV
    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${subdomain}`);
    }

    // Fallback: Si no está en caché, consultamos Supabase usando la Service Role Key para saltar RLS
    if (!brokerId) {
      try {
        const authKey = supabaseServiceKey || supabaseAnonKey;
        const res = await fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
          headers: { 
            'apikey': authKey, 
            'Authorization': `Bearer ${authKey}` 
          }
        });
        
        const data = await res.json();
        if (data && data.length > 0) {
          brokerId = data[0].id;
          
          // Guardamos en KV para la siguiente petición del Edge
          if (event.platform?.context?.waitUntil && event.platform?.env?.INMUBLIA_KV) {
            event.platform.context.waitUntil(
              event.platform.env.INMUBLIA_KV.put(`tenant:${subdomain}`, brokerId)
            );
          }
        }
      } catch (err) {
        console.error("🔥 Error en resolución de Tenant:", err);
      }
    }

    if (!brokerId) {
      return new Response('Portal inmobiliario no encontrado o inactivo.', { status: 404 });
    }

    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // 2. CONTROLADOR DE COOKIES WILDCARD (Sin puntos conflictivos)
  // =====================================================================
  const isPagesDev = host.includes('.pages.dev');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  
  // FIX DEFINITIVO: Eliminamos el punto inicial para erradicar el 500 de SvelteKit
  const cookieDomain = (isPagesDev || isLocal) ? undefined : 'inmublia.com';

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
          // Mitiga colisiones de headers duplicados en redirecciones de mutación
        }
      }
    }
  });

  // 3. SEGURIDAD DE SESIÓN RESILIENTE
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

  // 4. PROTECCIÓN DE CONSOLA CON URL ABSOLUTA PARA EL EDGE
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
    const { user } = await event.locals.safeGetSession();
    if (!user) {
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
