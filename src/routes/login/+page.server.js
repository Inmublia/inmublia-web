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

    // Para el login regular, seguimos respetando el subdominio donde esté parado
    const hostReal = request.headers.get('x-forwarded-host') || url.hostname;
    const protocolo = request.headers.get('x-forwarded-proto') || (url.protocol.includes('https') ? 'https' : 'http');
    
    throw redirect(303, `${protocolo}://${hostReal}/admin`);
  },

  recuperar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) return fail(400, { error: 'Falta correo electrónico.' });

    // 🔥 FIX SAAS DEFINITIVO: Centralizamos la recuperación en el dominio raíz.
    // Esto evita que Supabase colapse si el usuario pidió la recuperación desde un subdominio.
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const rootDomain = isLocal ? url.origin : 'https://inmublia.com';
    
    const redirectUrl = `${rootDomain}/auth/callback?next=/recuperar-acceso`;

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) return fail(400, { error: error.message });
    return { success: true, message: 'Enlace de restablecimiento enviado con éxito.' };
  }
};
