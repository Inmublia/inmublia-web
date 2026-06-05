import { redirect } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url }) {
  // 1. DESTRUCCIÓN DE CACHÉ (Solución al botón "Atrás")
  // Le ordenamos estrictamente al navegador que NUNCA guarde una copia local de las vistas de administración.
  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  // 2. VALIDACIÓN DE SESIÓN ESTRICTA
  // Dependiendo de cómo configuraste Supabase en tu hooks.server.js, el usuario suele vivir en locals.user
  const user = locals.user;

  // Si no hay usuario activo o el token expiró...
  if (!user) {
    // Evitamos redirecciones en bucle si ya está en login (por seguridad)
    if (url.pathname.startsWith('/login')) {
      return {};
    }
    
    // Código 303 (See Other) es el estándar HTTP correcto para redirecciones de autenticación
    throw redirect(303, '/login?motivo=inactividad');
  }

  // 3. EXPOSICIÓN DE DATOS SEGUROS
  // Retornamos el usuario para que cualquier +page.svelte dentro de /admin pueda usar data.user
  return {
    user
  };
}
