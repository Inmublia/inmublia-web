// src/routes/login/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  ingresar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    // 🚀 FIX DE SEGURIDAD: Incluso si faltan campos, devolvemos el error genérico.
    if (!email || !password) {
      return fail(400, { error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' });
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString()
    });

    if (error) {
      // 🚀 FIX DE SEGURIDAD (Timing Attacks / Enumeration):
      // NUNCA devolver error.message porque Supabase podría filtrar si el correo existe o no.
      // Siempre devolvemos exactamente la misma cadena genérica.
      return fail(400, { error: 'Credenciales incorrectas. Verifica tu correo y contraseña.' });
    }

    // Para el login regular, seguimos respetando el subdominio donde esté parado
    const hostReal = request.headers.get('x-forwarded-host') || url.hostname;
    const protocolo = request.headers.get('x-forwarded-proto') || (url.protocol.includes('https') ? 'https' : 'http');
    
    throw redirect(303, `${protocolo}://${hostReal}/admin`);
  },

  recuperar: async ({ request, locals, url }) => {
    const formData = await request.formData();
    const email = formData.get('email');

    if (!email) {
      return fail(400, { error: 'Por favor, ingresa un correo electrónico.' });
    }

    // 🔥 FIX SAAS DEFINITIVO: Centralizamos la recuperación en el dominio raíz.
    // Esto evita que Supabase colapse si el usuario pidió la recuperación desde un subdominio.
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const rootDomain = isLocal ? url.origin : 'https://inmublia.com';
    
    const redirectUrl = `${rootDomain}/auth/callback?next=/recuperar-acceso`;

    const { error } = await locals.supabase.auth.resetPasswordForEmail(email.toString(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      // 🚀 FIX DE SEGURIDAD: 
      // Registramos el error de manera interna en los logs del servidor para debugear,
      // PERO no se lo mostramos al usuario para evitar que un atacante sepa qué correos NO están registrados.
      console.error('[Recuperación Fallida]:', error.message);
    }
    
    // 🚀 Ocultamos el resultado real: Si falló o si tuvo éxito, el cliente ve lo mismo.
    return { 
      success: true, 
      message: 'Si el correo está registrado en nuestro sistema, recibirás un enlace seguro de recuperación en breve.' 
    };
  }
};
