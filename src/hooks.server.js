import { redirect, isRedirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function handle({ event, resolve }) {
  // 1. Buscamos la cookie de sesión segura
  const token = event.cookies.get('inmublia-auth-token');

  // 2. Proteger la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    
    // Si no hay token, rebote directo al login
    if (!token) {
      throw redirect(303, '/login?motivo=inactividad');
    }
    
    try {
      // Intentamos validar contra Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        // Token expirado o falso: destruimos cookie y rebotamos
        event.cookies.delete('inmublia-auth-token', { path: '/' });
        throw redirect(303, '/login?motivo=inactividad');
      }

      // Válido: guardamos identidad del broker
      event.locals.user = user;

    } catch (err) {
      // SvelteKit usa "throws" para hacer redirecciones. Debemos dejarlas pasar intactas.
      if ((typeof isRedirect === 'function' && isRedirect(err)) || err?.status === 303) {
        throw err;
      }
      
      // EL BLOQUEO: Si Supabase lanza una excepción (Network Error, JWT malformado), 
      // lo atrapamos aquí. El servidor NO colapsa.
      console.error('🔥 [CRÍTICO] Fallo en Supabase.auth.getUser:', err);
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login?motivo=inactividad');
    }
  }

  // Continuar con la carga normal
  return await resolve(event);
}

// 3. REGISTRO DE ERRORES EN PRODUCCIÓN
// Esto enviará los detalles reales a la terminal de tu hosting si algo más explota.
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
