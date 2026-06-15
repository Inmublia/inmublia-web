import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const actions = {
  configurarPassword: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan datos.' });
    }

    // Inicializamos el cliente Admin para poder actualizar al usuario sin que esté logueado
    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscamos si el usuario existe (lo debió crear el Webhook)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioDestino = userData?.users.find(u => u.email === email);

    if (!usuarioDestino) {
      return fail(400, { error: 'No encontramos una compra asociada a este correo.' });
    }

    // Le inyectamos la contraseña a la cuenta que creó el Webhook
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioDestino.id,
      { password: password }
    );

    if (updateError) {
      return fail(500, { error: 'Error configurando la llave criptográfica.' });
    }

    // Iniciamos sesión automáticamente (Reutilizando tu solución de Cloudflare Edge)
    const { data: loginData, error: loginError } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return fail(400, { error: 'Contraseña configurada, pero falló el auto-login.' });
    }

    if (loginData.session) {
      await locals.supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token
      });
    }

    throw redirect(303, '/admin');
  }
};
