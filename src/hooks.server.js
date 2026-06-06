import { redirect, isRedirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function handle({ event, resolve }) {
  // 1. Inyección de la base de datos al contexto del servidor
  event.locals.supabase = supabase;

  // 2. Buscamos la cookie de sesión segura
  const token = event.cookies.get('inmublia-auth-token');

  // 3. Proteger la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Intentamos validar contra Supabase
      const { data: { user }, error } = await event.locals.supabase.auth.getUser(token);
      
      if (error || !user) {
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      // Válido: guardamos identidad del broker para que las rutas la usen
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
  console.error('Stack:', error?.stack);

  return {
    message: 'Fallo interno detectado.',
    code: error?.code || 'INTERNAL_ERROR'
  };
}
