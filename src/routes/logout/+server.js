import { redirect } from '@sveltejs/kit';

/**
 * Lógica unificada para destruir la sesión local y del servidor.
 */
async function handleLogout({ locals, cookies }) {
  // 1. Destrucción inmediata de la cookie manual en el navegador (Seguridad local primero)
  cookies.delete('inmublia-auth-token', {
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'lax'
  });

  // 2. Intento controlado de invalidación en el servidor de Supabase.
  // IMPORTANTE: Al ejecutar signOut(), SvelteKit dispara automáticamente 
  // el "Exterminador de Cookies" que configuramos en hooks.server.js
  if (locals.supabase) {
    try {
      // Envolvemos en try/catch para evitar que un token ya expirado 
      // o un error de red con Supabase bloquee la salida del usuario.
      await locals.supabase.auth.signOut();
    } catch (err) {
      console.warn("Aviso: No se pudo notificar la salida a Supabase (posible sesión ya expirada):", err);
    }
  }

  // 3. Redirección absoluta a la matriz principal (Fix Arquitectónico Multi-Tenant)
  throw redirect(303, 'https://inmublia.com/login');
}

// Soporte para peticiones seguras (ej. <form method="POST" action="/logout">)
export const POST = async ({ locals, cookies }) => {
  return await handleLogout({ locals, cookies });
};

// Soporte para acceso directo por URL o enlaces tradicionales (ej. <a href="/logout">)
export const GET = async ({ locals, cookies }) => {
  return await handleLogout({ locals, cookies });
};
