import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales', email });
    }

    // El inicio de sesión se efectúa sobre locals.supabase, escribiendo las cookies automáticamente
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos', email });
    }

    throw redirect(303, '/admin');
  },

  recuperar: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) {
      return fail(400, { error: 'Por favor, ingresa tu correo electrónico.' });
    }

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://inmublia.com/recuperar-acceso',
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    return { success: true, message: 'Te hemos enviado un enlace al correo para recuperar tu contraseña.' };
  }
};
