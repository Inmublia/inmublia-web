import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('inmublia-auth-token');

  // EL FIX DEFINITIVO Y AUDITADO PARA CLOUDFLARE + SUPABASE v2.43
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      // 1. EL PUENTE DE RED: Evita el cuelgue de 2 minutos en Cloudflare
      fetch: event.fetch
    },
    // 2. EL PUENTE DE IDENTIDAD: Esta es la API oficial de Supabase para SSR.
    // Le dice al interceptor de BD que siempre use este JWT, desactivando la amnesia del RLS.
    accessToken: async () => token || ''
  });

  if (event.url.pathname.startsWith('/admin')) {
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      event.locals.user = user;

    } catch (err) {
      if ((typeof isRedirect === 'function' && isRedirect(err)) || err?.status === 303) {
        throw err;
      }
      console.error('🔥 [CRÍTICO] Fallo de red/auth en Edge:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  return await resolve(event);
}

export async function handleError({ event, error }) {
  console.error('🔥 [500 INTERNAL ERROR] 🔥');
  console.error('Ruta:', event.url.href);
  console.error('Detalle:', error?.message || error);
  return { message: 'Fallo interno detectado.', code: error?.code || 'INTERNAL_ERROR' };
}
