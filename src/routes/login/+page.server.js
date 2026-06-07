import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales' });
    }

    const { data, error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos' });
    }

    // 🛡️ SEGURO DE VIDA PARA CLOUDFLARE EDGE:
    // Aunque actualizamos las librerías, forzamos la asignación de la sesión activa al cliente SSR.
    // Esto obliga a disparar 'setAll' de forma síncrona, amarrando la cookie al navegador.
    if (data.session) {
      await locals.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    }

    throw redirect(303, '/admin');
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
