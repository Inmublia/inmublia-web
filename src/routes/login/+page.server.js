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

    // Extracción robusta de hosts para evitar la fuga del subdominio en Cloudflare
    const hostReal = request.headers.get('host') || url.host;
    const protocolo = request.headers.get('x-forwarded-proto') || 'https';
    
    throw redirect(303, `${protocolo}://${hostReal}/admin`);
  },

  recuperar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) return fail(400, { error: 'Falta correo electrónico.' });

    const hostReal = request.headers.get('host') || url.host;
    const protocolo = request.headers.get('x-forwarded-proto') || 'https';
    
    // El enlace del correo enviará al usuario al callback, pidiendo ir luego a /recuperar-acceso
    const redirectUrl = `${protocolo}://${hostReal}/auth/callback?next=/recuperar-acceso`;

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) return fail(400, { error: error.message });
    return { success: true, message: 'Enlace de restablecimiento enviado con éxito.' };
  }
};
