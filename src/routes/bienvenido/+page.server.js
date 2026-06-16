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
    const subdominio = formData.get('subdominio')?.toString().toLowerCase().trim();

    if (!email || !password || !nombre_comercial || !subdominio) {
      return fail(400, { error: 'Por favor, completa todos los campos del perfil.' });
    }

    const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar que la cuenta exista en Auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    const usuarioDestino = userData?.users.find(u => u.email === email);

    if (!usuarioDestino) {
      return fail(400, { error: 'No encontramos un pago asociado a este correo. Verifica que sea el mismo de tu compra.' });
    }

    // 2. Buscar el recibo para extraer el plan y el customer ID de Stripe
    const { data: eventoStripe } = await supabaseAdmin
      .from('stripe_eventos')
      .select('plan_comprado, stripe_customer_id')
      .eq('email', email)
      .eq('tipo', 'checkout.session.completed')
      .order('creado_en', { ascending: false })
      .limit(1)
      .single();

    const planFinal = eventoStripe?.plan_comprado || 'basico';
    const stripeCustomerId = eventoStripe?.stripe_customer_id || null;

    // 3. Establecer la contraseña definitiva en Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      usuarioDestino.id,
      { password: password }
    );

    if (updateError) {
      return fail(500, { error: 'Error interno al cifrar la contraseña.' });
    }

    // 4. CREACIÓN INSTANTÁNEA: Insertar el registro con la estructura exacta de tu SQL
    const { error: brokerError } = await supabaseAdmin
      .from('brokers')
      .insert([
        { 
          auth_user_id: usuarioDestino.id,
          email: email,
          nombre_comercial: nombre_comercial,
          subdominio: subdominio,
          plan_suscripcion: planFinal,
          status_suscripcion: 'activa',
          stripe_customer_id: stripeCustomerId
          // Los demás campos (ia_creditos_disponibles, templates, etc.) se llenan con sus defaults del SQL automáticamente
        }
      ]);

    if (brokerError) {
      if (brokerError.code === '23505') {
        if (brokerError.message.includes('subdominio')) {
          return fail(400, { error: `El enlace "${subdominio}" ya está en uso por otra agencia. Elige uno distinto.` });
        }
        if (brokerError.message.includes('auth_user_id') || brokerError.message.includes('email')) {
          return fail(400, { error: 'Esta cuenta ya fue inicializada. Intenta iniciar sesión normalmente.' });
        }
      }
      return fail(500, { error: `Error de base de datos: ${brokerError.message}` });
    }

    // 5. Autenticación síncrona obligatoria para amarrar la sesión en Cloudflare Edge
    const { data: loginData, error: loginError } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (loginError) {
      return fail(400, { error: 'Perfil creado con éxito, pero debes iniciar sesión manualmente.' });
    }

    if (loginData.session) {
      await locals.supabase.auth.setSession({
        access_token: loginData.session.access_token,
        refresh_token: loginData.session.refresh_token
      });
    }

    // 6. REDIRECCIÓN NIVEL WORLDWIDE BEST: 
    // En lugar de ir a /admin relativo, construimos la URL absoluta apuntando a su nuevo subdominio operativo.
    throw redirect(303, `https://${subdominio}.inmuvia.com/admin`);
  }
};
