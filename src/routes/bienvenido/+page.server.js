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

    // Inicializamos el cliente con la Service Role para poder escribir en tablas protegidas
    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar si el usuario existe en la tabla de autenticación interna de Supabase
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioDestino = userData?.users.find(u => u.email === email);

    if (!usuarioDestino) {
      return fail(400, { error: 'No encontramos ninguna compra asociada a este correo electrónico.' });
    }

    // 2. Guardar la contraseña en su cuenta de autenticación
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioDestino.id,
      { password: password }
    );

    if (updateError) {
      return fail(500, { error: 'Error al configurar la contraseña en el sistema de autenticación.' });
    }

    // 3. ¡EL ESLABÓN PERDIDO!: Crear el registro real en la tabla de 'brokers'
    // Vinculamos el ID de la cuenta auth con la fila pública para que la consola lo reconozca
    const { error: brokerError } = await supabaseAdmin
      .from('brokers')
      .insert([
        { 
          id: usuarioDestino.id, 
          email: email,
          created_at: new Date().toISOString()
        }
      ]);

    if (brokerError) {
      // Si el registro ya existía (error de clave duplicada), lo dejamos pasar, si es otra cosa, tronamos
      if (brokerError.code !== '23505') { 
        return fail(500, { error: `Error de base de datos al inicializar broker: ${brokerError.message}` });
      }
    }

    // 4. Iniciar sesión síncronamente (Tu solución blindada para Cloudflare Edge)
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

    // 5. Redirección final segura: el guardián de /admin ahora sí validará la fila existente
    throw redirect(303, '/admin');
  }
};
