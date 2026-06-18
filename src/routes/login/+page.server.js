import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales' });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos' });
    }

    // FIX DEFINITIVO CLOUDFLARE: Forzamos URL absoluta para evitar "Failed to parse URL"
    const urlAbsoluta = new URL('/admin', url.origin).toString();
    throw redirect(303, urlAbsoluta);
  },

  recuperar: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) return fail(400, { error: 'Falta correo.' });

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://inmublia.com/recuperar-acceso',
    });

    if (error) return fail(400, { error: error.message });
    return { success: true, message: 'Enlace enviado.' };
  }
};
