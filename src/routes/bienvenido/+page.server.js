import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const actions = {
  configurarPerfil: async ({ request, locals }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const password = formData.get('password');
    const nombre_comercial = formData.get('nombre_comercial');
    const subdominio = formData.get('subdominio')?.toString().toLowerCase();

    if (!email || !password || !nombre_comercial || !subdominio) {
      return fail(400, { error: 'Por favor, completa todos los campos del perfil.' });
    }

    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar que la compra exista
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioDestino = userData?.users.find(u => u.email === email);

    if (!usuarioDestino) {
      return fail(400, { error: 'No encontramos un pago asociado a este correo. Verifica que sea el mismo de tu compra.' });
    }

    // 2. Establecer contraseña
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioDestino.id,
      { password: password }
    );

    if (updateError) {
      return fail(500, { error: 'Error interno al cifrar la contraseña.' });
    }

    // 3. Crear el perfil del Broker con los datos exactos del usuario
    const { error: brokerError } = await supabaseAdmin
      .from('brokers')
      .insert([
        { 
          auth_user_id: usuarioDestino.id,
          email: email,
          nombre_comercial: nombre_comercial,
          subdominio: subdominio
        }
      ]);

    // 4. Manejo elegante de errores SQL
    if (brokerError) {
      // Código 23505 = Violación de Unique Constraint
      if (brokerError.code === '23505') {
        if (brokerError.message.includes('subdominio')) {
          return fail(400, { error: `El enlace "${subdominio}.inmublia.com" ya está en uso por otra agencia. Elige uno distinto.` });
        }
        if (brokerError.message.includes('auth_user_id') || brokerError.message.includes('email')) {
          return fail(400, { error: 'Esta cuenta ya fue inicializada anteriormente. Inicia sesión normalmente.' });
        }
      }
      return fail(500, { error: `Error conectando con la base de datos: ${brokerError.message}` });
    }

    // 5. Autenticación y creación de cookie segura para Cloudflare Edge
    const { data: loginData, error: loginError } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return fail(400, { error: 'Perfil creado, pero debes iniciar sesión manualmente.' });
    }

    if (loginData.session) {
      await locals.supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token
      });
    }

    // 6. Lanzamiento a la Consola
    throw redirect(303, '/admin');
  }
};
