// src/routes/logout/+server.js
import { redirect } from '@sveltejs/kit';

/**
 * Lógica unificada para destruir la sesión local y del servidor.
 */
async function handleLogout({ locals, cookies, url }) {
  // 1 Destrucción inmediata de la cookie manual (solo requiere path)
  cookies.delete('inmublia-auth-token', { path: '/' });

  // 2. Intento controlado de invalidación en el servidor de Supabase.
  if (locals.supabase) {
    try {
      await locals.supabase.auth.signOut();
    } catch (err) {
      console.warn("Aviso: No se pudo notificar la salida a Supabase (posible sesión ya expirada):", err.message);
    }
  }

  // 3. Redirección relativa dinámica (Fix Multi-Tenant / Entornos locales)
  // Si tienes un subdominio específico definido en tus variables de entorno, lo usa. Si no, usa el path relativo seguro.
  const loginBase = import.meta.env.VITE_AUTH_DOMAIN || '';
  throw redirect(303, `${loginBase}/login`);
}

// FIX Crítico (CSRF): El logout real que destruye la sesión SOLO debe ejecutarse vía POST.
export const POST = async ({ locals, cookies, url }) => {
  await handleLogout({ locals, cookies, url });
};

// FIX Crítico (CSRF): Desactivamos la destrucción de sesión por GET.
// Si un link antiguo <a> o un ataque externo llama a esta ruta por GET, 
// solo redirigimos sin destruir la sesión, protegiendo la cuenta del broker.
export const GET = async () => {
  throw redirect(303, '/login');
};
