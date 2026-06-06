import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('inmublia-auth-token');

  // Construimos las cabeceras limpias
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Cliente instanciado sin trucos de fetch que rompan el RLS
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: { headers }
  });

  if (event.url.pathname.startsWith('/admin')) {
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Supabase recibe el token intacto y valida
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
      console.error('🔥 ERROR AUTH:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  return await resolve(event);
}

export async function handleError({ error }) {
  console.error('🔥 ERROR FATAL SSR:', error);
  return { message: 'Fallo interno del servidor.' };
}
