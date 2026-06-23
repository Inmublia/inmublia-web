import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  // El Guardián del Servidor: Verifica si el Callback logró autenticar el token PKCE
  const { session } = await locals.safeGetSession();
  
  if (!session) {
    throw redirect(303, '/login?error=enlace_expirado_u_objeto_invalido');
  }
  
  return {};
};

export const actions = {
  default: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const password = formData.get('password');
    const confirm = formData.get('confirm');

    if (password !== confirm) return fail(400, { error: 'Las contraseñas no coinciden.' });
    if (password.length < 6) return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres.' });

    // Actualiza la contraseña del usuario actualmente autenticado en la sesión activa
    const { error } = await locals.supabase.auth.updateUser({ password });

    if (error) return fail(400, { error: `Error criptográfico: ${error.message}` });

    const hostReal = request.headers.get('host') || url.host;
    const protocolo = request.headers.get('x-forwarded-proto') || 'https';
    
    // Forzamos un cierre de sesión definitivo para limpiar las cookies de recuperación
    await locals.supabase.auth.signOut();
    
    // Redirige al login notificando el éxito de la operación
    throw redirect(303, `${protocolo}://${hostReal}/login?motivo=clave_actualizada`);
  }
};
