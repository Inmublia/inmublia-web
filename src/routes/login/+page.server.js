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

    // 🔥 FIX ARQUITECTURA MULTI-TENANT: Extraer el Host Real
    // Leemos directamente las cabeceras HTTP de la solicitud. Esto ignora 
    // el enrutamiento interno de Cloudflare y respeta el subdominio exacto.
    const hostReal = request.headers.get('host') || url.host;
    const protocolo = request.headers.get('x-forwarded-proto') || 'https';
    
    // Redirección dinámica y segura
    throw redirect(303, `${protocolo}://${hostReal}/admin`);
  },

  recuperar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) return fail(400, { error: 'Falta correo.' });

    // 🔥 FIX MULTI-TENANT: Mantener la recuperación en el mismo subdominio
    const hostReal = request.headers.get('host') || url.host;
    const protocolo = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUrl = `${protocolo}://${hostReal}/recuperar-acceso`;

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) return fail(400, { error: error.message });
    return { success: true, message: 'Enlace enviado.' };
  }
};
