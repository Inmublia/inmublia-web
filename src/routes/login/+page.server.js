import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals }) => {
    console.log(`[🔍 DEBUG LOGIN] Iniciando acción 'ingresar'...`);
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales' });
    }

    console.log(`[🔍 DEBUG LOGIN] Disparando signInWithPassword para: ${email}`);
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(`🔥 [ERROR signInWithPassword]:`, error.message);
      return fail(400, { error: 'Correo o contraseña incorrectos' });
    }

    console.log(`[🔍 DEBUG LOGIN] Credenciales correctas. Lanzando Redirect 303 a /admin...`);
    // CRÍTICO: Esto es lo que manda al navegador a la consola
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
