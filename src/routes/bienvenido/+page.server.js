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
      return fail(400, { error: 'Faltan datos obligatorios.' });
    }

    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioDestino = userData?.users.find(u => u.email === email);

    if (!usuarioDestino) {
      return fail(400, { error: 'No encontramos ninguna compra asociada a este correo electrónico.' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioDestino.id,
      { password: password }
    );

    if (updateError) {
      return fail(500, { error: 'Error al configurar la contraseña en el sistema de autenticación.' });
    }

    // ELIMINADA la columna created_at. Solo inyectamos ID y Email.
    const { error: brokerError } = await supabaseAdmin
      .from('brokers')
      .insert([
        { 
          id: usuarioDestino.id, 
          email: email
        }
      ]);

    if (brokerError && brokerError.code !== '23505') { 
      return fail(500, { error: `Error de BD al inicializar broker: ${brokerError.message}` });
    }

    const { data: loginData, error: loginError } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return fail(400, { error: 'Contraseña configurada con éxito, pero falló el inicio de sesión automático.' });
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
