import { error, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

export async function load({ url, locals, fetch }) {
  const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(fetch)
  });
  
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: fetch },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const sessionId = url.searchParams.get('s');
  const { session } = await locals.safeGetSession();
  
  // Si no hay sesión ni ID de Stripe, no hay nada que configurar
  if (!sessionId && !session) throw redirect(303, '/login');

  try {
    let email = session?.user?.email;
    let customerId = null;

    if (sessionId) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (checkoutSession.payment_status !== 'paid') throw error(403, 'Pago no validado.');
      email = checkoutSession.customer_details?.email;
      customerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : checkoutSession.customer?.id;
    }

    // Buscamos al broker para verificar si ya existe
    let query = supabaseAdmin.from('brokers').select('id, auth_user_id, nombre_comercial, subdominio');
    if (customerId) {
      query = query.eq('stripe_customer_id', customerId);
    } else {
      query = query.eq('email', email);
    }

    const { data: broker } = await query.maybeSingle();

    // Si no hay broker creado por el webhook todavía, esperamos (status: waiting)
    if (!broker) return { status: 'waiting', email, sessionId };

    // Si ya configuró su perfil (nombre real), lo mandamos al panel
    if (session && broker.nombre_comercial !== 'Agencia Inmublia') {
       throw redirect(303, '/admin');
    }

    // Retornamos auth_user_id para el campo oculto
    return { 
      status: 'ready', 
      email: email, 
      authUserId: broker.auth_user_id, 
      sessionId 
    };

  } catch (err) {
    if (err.status === 303) throw err;
    console.error('🔥 [Bienvenida Load Error]:', err);
    throw error(500, 'Error verificando aprovisionamiento.');
  }
}

export const actions = {
  configurarPerfil: async ({ request, fetch }) => {
    const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
      global: { fetch: fetch },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const formData = await request.formData();
    const password = formData.get('password');
    const subdominio = formData.get('subdominio')?.trim().toLowerCase();
    const nombre_comercial = formData.get('nombre_comercial')?.trim();
    const authUserId = formData.get('authUserId');
    const email = formData.get('email');

    if (!password || !subdominio || !nombre_comercial || !authUserId) {
      return { success: false, error: 'Faltan datos obligatorios para la configuración.' };
    }

    try {
      // 1. Verificación de duplicidad de subdominio
      const { data: duplicate } = await supabaseAdmin
        .from('brokers')
        .select('id')
        .eq('subdominio', subdominio)
        .not('auth_user_id', 'eq', authUserId)
        .maybeSingle();

      if (duplicate) return { success: false, error: 'Este subdominio ya está ocupado. Elige otro.' };

      // 2. Actualización de Password en Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { 
        password: password,
        email_confirm: true 
      });
      if (authError) throw authError;

      // 3. Actualización de Perfil en Tabla Brokers
      const { error: profileError } = await supabaseAdmin
        .from('brokers')
        .update({ 
          nombre_comercial: nombre_comercial, 
          subdominio: subdominio 
        })
        .eq('auth_user_id', authUserId);
      
      if (profileError) throw profileError;

      // 4. Redirección al Login para que entre con su nueva clave
      throw redirect(303, '/login?configurado=true');

    } catch (err) {
      if (err.status === 303) throw err;
      console.error('🔥 [Bienvenida Action Error]:', err);
      return { success: false, error: err.message || 'Error guardando configuración.' };
    }
  }
};
