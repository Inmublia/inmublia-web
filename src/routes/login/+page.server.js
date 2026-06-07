import { fail } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales', email });
    }

    // 1. Iniciamos sesión en Supabase
    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos', email });
    }

    // 2. ¡EL TRUCO MAESTRO DE SUPABASE SSR!:
    // Forzamos al cliente a leer la sesión recién creada. Esto obliga
    // inmediatamente a Supabase SSR a disparar el callback 'setAll' del hook,
    // volcando y escribiendo físicamente las cookies en SvelteKit antes de retornar.
    await locals.supabase.auth.getSession();

    // 3. Retornamos éxito de manera limpia con el destino de redirección
    return { success: true, redirectTo: '/admin' };
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
