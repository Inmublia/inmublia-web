import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;
  
  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;
  
  // =====================================================================
  // 1. EL ESCUDO DE ENRUTAMIENTO (Rendimiento Edge)
  // =====================================================================
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
          headers: { 
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}` 
          }
        });
        
        const data = await res.json();
        if (data && data.length > 0) {
          brokerId = data[0].id;
          
          if (event.platform?.context?.waitUntil && event.platform?.env?.INMUBLIA_KV) {
            event.platform.context.waitUntil(
              event.platform.env.INMUBLIA_KV.put(`tenant:${subdomain}`, brokerId)
            );
          }
        }
      } catch (err) {
        console.error("🔥 Error en Fallback Supabase REST:", err);
      }
    }

    if (!brokerId) {
      return new Response('Portal inmobiliario no encontrado o inactivo.', { status: 404 });
    }

    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // 2. EL CANDADO MULTI-TENANT (Sesiones y Cookies Cruzadas)
  // =====================================================================
  
  // Extraemos dinámicamente el dominio base sin el punto conflictivo para SvelteKit
  // Si estás en Cloudflare Pages dev, respeta su dominio para que no explote.
  const isCloudflarePages = host.includes('pages.dev');
  const baseDomain = isCloudflarePages ? host : 'inmublia.com';

  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return event.cookies.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            // SvelteKit requiere estrictamente el path='/'
            event.cookies.set(name, value, { ...options, path: '/' });
          });
        } catch (err) {
          // El estándar de Supabase SSR dicta silenciar errores aquí
          // para evitar 500s cuando SvelteKit maneja chunks grandes.
        }
      }
    },
    // LA MAGIA OCURRE AQUÍ: Supabase inyecta el dominio a la firma interna
    // y SvelteKit lo aplica a la cabecera sin tirar 500.
    cookieOptions: {
      domain: baseDomain,
      secure: true,
      sameSite: 'lax',
      path: '/'
    }
  });

  // FIX DE RED: Añadimos tolerancia a errores de conexión momentáneos
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
  // 3. PROTECCIÓN DE RUTAS DE ADMINISTRACIÓN
  // =====================================================================
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
