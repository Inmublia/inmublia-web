import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, cookies, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales', email });
    }

    // EL FIX MAESTRO: Usamos 'locals.supabase' (que ya tiene el fetch configurado para Cloudflare)
    // en lugar del cliente global que causa el bucle infinito.
    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos', email });
    }

    // Generar la cookie de sesión segura (dura 1 semana)
    cookies.set('inmublia-auth-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 
    });

    // Redirigir al broker directamente a su panel de control
    throw redirect(303, '/admin');
  },

  recuperar: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) {
      return fail(400, { error: 'Por favor, ingresa tu correo electrónico.' });
    }

    // También arreglado aquí
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://inmublia.com/recuperar-acceso',
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    return { success: true, message: 'Te hemos enviado un enlace al correo para recuperar tu contraseña.' };
  }
};
