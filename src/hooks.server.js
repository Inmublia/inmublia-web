import { redirect, isRedirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function handle({ event, resolve }) {
  const token = event.cookies.get('inmublia-auth-token');

  // 1. EL FIX QUE TE DEVUELVE EL ACCESO: 
  // Creamos el cliente de Supabase. SÓLO agregamos la cabecera si el token EXISTE.
  // Si no hay token (estás en el Login), dejamos que Supabase trabaje normal.
  const customHeaders = {};
  if (token) {
    customHeaders.Authorization = `Bearer ${token}`;
  }

  // Desactivamos persistSession porque en el servidor no hay localStorage
  event.locals.supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false 
    },
    global: {
      fetch: event.fetch, // Esto evita que Cloudflare se confunda de conexión
      headers: customHeaders
    }
  });

  // 2. Proteger la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Validamos el token
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
      
      console.error('🔥 [CRÍTICO] Fallo en Supabase.auth.getUser:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  return await resolve(event);
}

export async function handleError({ event, error }) {
  console.error('🔥 [500 INTERNAL SERVER ERROR] 🔥');
  console.error('Ruta:', event.url.href);
  console.error('Detalle:', error?.message || error);

  return {
    message: 'Fallo interno detectado.',
    code: error?.code || 'INTERNAL_ERROR'
  };
}
