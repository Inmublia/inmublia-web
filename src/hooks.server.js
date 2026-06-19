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

  // Omitir peticiones de archivos estáticos o internos de SvelteKit
  if (pathname.startsWith('/_app/') || pathname.includes('.')) {
    return resolve(event);
  }

  // Identificación de dominios raíz o administrativos principales
  const isRootOrAdmin = host === 'inmublia.com' || host === 'www.inmublia.com' || host.startsWith('admin.');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.includes('.pages.dev');
  
  // =====================================================================
  // 1. RESOLUCIÓN DE MULTI-TENANT (Entorno público / SEO)
  // =====================================================================
  let currentSubdomain = null;
  if (!isRootOrAdmin && !isLocal) {
    currentSubdomain = host.split('.')[0];
    let brokerId = null;

    // Intento de recuperación rápida desde la capa de caché KV si está disponible
    if (event.platform?.env?.INMUBLIA_KV) {
      brokerId = await event.platform.env.INMUBLIA_KV.get(`tenant:${currentSubdomain}`);
    }

    // Consulta de respaldo directa a la base de datos si no está en caché
    if (!brokerId) {
      try {
        const res = await event.fetch(`${supabaseUrl}/rest/v1/brokers?subdominio=eq.${currentSubdomain}&select=id`, {
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
                event.platform.env.INMUBLIA_KV.put(`tenant:${currentSubdomain}`, brokerId)
              );
            }
          }
        }
      } catch (err) {
        console.error("Error en validación perimetral:", err);
      }
    }

    if (!brokerId) {
      return new Response('Portal inmobiliario no encontrado o inactivo.', { status: 404 });
    }

    event.locals.tenantId = brokerId;
  }

  // =====================================================================
  // 2. MOTOR DE COOKIES (Wildcard + Exterminador de Cookies Fantasma)
  // =====================================================================
  const cookieDomain = (isLocal) ? undefined : 'inmublia.com';

  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: event.fetch },
    cookies: {
      getAll() { return event.cookies.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cleanOptions } = options;
            
            // A) Guardado Estándar: Usa el comodín para el SSO
            event.cookies.set(name, value, { 
              ...cleanOptions, 
              path: '/', 
              domain: cookieDomain 
            });

            // B) EL EXTERMINADOR: Si se está cerrando sesión, disparar borrado estricto 
            // al subdominio actual para aniquilar residuos de la arquitectura vieja
            if (!value || options.maxAge === 0 || options.maxAge === -1) {
              event.cookies.set(name, '', { 
                ...cleanOptions, 
                path: '/', 
                domain: undefined 
              });
            }
          });
        } catch (err) {}
      }
    }
  });

  // Recuperación segura y resiliente del estado de la sesión
  event.locals.safeGetSession = async () => {
    try {
      const { data: { session } } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };

      const { data: { user }, error } = await event.locals.supabase.auth.getUser();
      if (error) {
        if (error.status >= 500) return { session, user: session.user };
        return { session: null, user: null };
      }
      return { session, user };
    } catch {
      return { session: null, user: null };
    }
  };

  // =====================================================================
  // 3. CONTROLADOR DE RUTAS OPERATIVAS (Guardia Anti-Fugas de Datos)
  // =====================================================================
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/bienvenida')) {
    const { user } = await event.locals.safeGetSession();
    
    if (!user) {
      throw redirect(303, `https://${host}/login?motivo=inactividad`);
    }

    const { data: userBroker } = await event.locals.supabase
      .from('brokers')
      .select('subdominio')
      .eq('auth_user_id', user.id)
      .single();

    if (userBroker && userBroker.subdominio) {
      if (
        (isRootOrAdmin && !pathname.includes('/logout')) || 
        (currentSubdomain && currentSubdomain !== userBroker.subdominio)
      ) {
        throw redirect(303, `https://${userBroker.subdominio}.inmublia.com${pathname}`);
      }
    } else if (userBroker && !userBroker.subdominio) {
      throw redirect(303, `https://inmublia.com/admin/bienvenida`); 
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
// 4. MANEJO DE ERRORES GLOBALES
// =====================================================================
export function handleError({ error }) {
  console.error('🔥 [Error de Servidor Atrapado]:', error);
  return {
    message: error.message || 'Error interno del sistema',
    stack: error.stack || ''
  };
}
