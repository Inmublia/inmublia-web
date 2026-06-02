import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

export async function handle({ event, resolve }) {
  // 1. Buscamos la cookie de sesión segura
  const token = event.cookies.get('inmublia-auth-token');

  // 2. Proteger la consola de administración
  if (event.url.pathname.startsWith('/admin')) {
    
    // Si no hay token, rebote directo al login
    if (!token) {
      throw redirect(303, '/login');
    }
    
    // Si hay token, lo validamos contra los servidores de Supabase por seguridad
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Si el token expiró o es falso, destruimos la cookie y rebotamos
      event.cookies.delete('inmublia-auth-token', { path: '/' });
      throw redirect(303, '/login');
    }

    // Si todo es válido, guardamos la identidad del broker para usarla en el panel
    event.locals.user = user;
  }

  // Continuar con la carga normal de la página
  return await resolve(event);
}
