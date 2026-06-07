import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
  const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

  console.log(`[🔍 DEBUG HOOK] Ruta solicitada: ${event.url.pathname}`);
  console.log(`[🔍 DEBUG HOOK] Cookies recibidas del navegador:`, event.cookies.getAll().map(c => c.name));

  event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    // FIX CLOUDFLARE: Vincula el fetch al contexto global para evitar "Illegal Invocation"
    global: {
      fetch: fetch.bind(globalThis)
    },
    cookies: {
      getAll() {
        return event.cookies.getAll();
      },
      setAll(cookiesToSet) {
        console.log(`[🔍 DEBUG HOOK] Intentando escribir ${cookiesToSet.length} cookies...`);
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const { domain, ...cleanOptions } = options;
            // Forzamos compatibilidad máxima
            event.cookies.set(name, value, { 
              ...cleanOptions, 
              path: '/',
              sameSite: 'lax',
              secure: true
            });
            console.log(`[🔍 DEBUG HOOK] Éxito escribiendo cookie: ${name}`);
          });
        } catch (err) {
          console.error(`🔥 [ERROR SET-COOKIE]:`, err.message);
        }
      }
    }
  });

  event.locals.safeGetSession = async () => {
    try {
      console.log(`[🔍 DEBUG SESSION] Verificando getSession...`);
      const { data: { session }, error: sessionError } = await event.locals.supabase.auth.getSession();
      
      if (sessionError) console.error(`🔥 [ERROR getSession]:`, sessionError);
      if (!session) {
        console.log(`[🔍 DEBUG SESSION] Sesión es null (El navegador no envió cookies válidas).`);
        return { session: null, user: null };
      }

      console.log(`[🔍 DEBUG SESSION] Verificando getUser en Supabase...`);
      const { data: { user }, error: userError } = await event.locals.supabase.auth.getUser();
      
      if (userError) {
        console.error(`🔥 [ERROR getUser]:`, userError);
        return { session: null, user: null };
      }

      console.log(`[🔍 DEBUG SESSION] ¡Identidad confirmada! Broker: ${user?.email}`);
      return { session, user };
    } catch (e) {
      console.error(`🔥 [EXCEPTION FATAL safeGetSession]:`, e);
      return { session: null, user: null };
    }
  };

  if (event.url.pathname.startsWith('/admin')) {
    console.log(`[🔍 DEBUG ADMIN] Barrera de seguridad para /admin activada.`);
    const { user } = await event.locals.safeGetSession();
    if (!user) {
      console.log(`[🔍 DEBUG ADMIN] Acceso denegado. Pateando a /login?motivo=inactividad`);
      throw redirect(303, '/login?motivo=inactividad');
    }
    event.locals.user = user;
  }

  return await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}

export async function handleError({ error }) {
  console.error('🔥 [ERROR SSR NO CONTROLADO]:', error);
  return { message: 'Fallo interno.' };
}
