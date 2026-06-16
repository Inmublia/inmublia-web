import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;
  
  // Leemos el host real que nos pasa Cloudflare Worker, si no existe (local), leemos el normal
  const host = event.request.headers.get('x-forwarded-host') || event.url.hostname;
  const pathname = event.url.pathname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  
  // =====================================================================
  // 1. EL ESCUDO DE ENRUTAMIENTO (Rendimiento Edge)
  // =====================================================================
  // Si es un archivo estático (imágenes, CSS, JS), lo dejamos pasar DE INMEDIATO. 
  // Esto ahorra el 90% de los costos de lectura a la base de datos/KV.
  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  // Identificamos si es el dominio principal/admin o un subdominio (tenant)
  const isRootOrAdmin = isLocal || host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');

  if (!isRootOrAdmin) {
    // Es un visitante viendo la página pública de un broker
    const subdomain = host.split('.')[0];
    let brokerId = null;

    // A) Búsqueda en Memoria Ultrarrápida (Cloudflare KV)
    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${subdomain}`);
    }

    // B) Fallback Síncrono a Supabase (Rescate por si el KV aún no se propaga)
    if (!brokerId) {
      try {
        // Usamos fetch (API REST nativa) para no agotar las conexiones TCP de Postgres
        const res = await fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${subdomain}&select=id`, {
          headers: { 
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}` 
          }
        });
        
        const data = await res.json();
        if (data && data.length > 0) {
          brokerId = data[0].id;
          
          // Sincronizamos el KV en segundo plano (Non-blocking) para que la próxima visita responda en 1ms
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

    // Si después de buscar en KV y en Supabase no existe, es un subdominio falso/abandonado
    if (!brokerId) {
      return new Response('Portal inmobiliario no encontrado o inactivo.', { status: 404 });
    }

    // ¡Éxito! Inyectamos el ID del broker en el entorno de Svelte para que la página sepa qué casas cargar
    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // 2. EL CANDADO MULTI-TENANT (Sesiones y Cookies cruzadas)
  // =====================================================================
  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const cookieDomain = isLocal ? undefined : '.inmublia.com';
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

  // =====================================================================
  // 3. PROTECCIÓN DE RUTAS DE ADMINISTRACIÓN
  // =====================================================================
  if (pathname.startsWith('/admin')) {
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
