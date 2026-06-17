import { error, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

export async function load({ url, locals }) {
  // INICIALIZACIÓN SEGURA EN RUNTIME
  const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2025-10-16' });
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

  const sessionId = url.searchParams.get('s');
  const { session } = await locals.safeGetSession();
  
  if (!sessionId && !session) throw redirect(303, '/login');

  try {
    let email = session?.user?.email;
    let authUserId = session?.user?.id;

    if (sessionId) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (checkoutSession.payment_status !== 'paid') throw error(403, 'Transacción pendiente.');
      email = checkoutSession.customer_details?.email;
    }

    const { data: broker } = await supabaseAdmin
      .from('brokers')
      .select('id, auth_user_id, nombre_comercial, subdominio')
      .eq('email', email)
      .maybeSingle();

    if (!broker) return { status: 'waiting', email, sessionId };

    if (broker.subdominio && broker.nombre_comercial) throw redirect(303, '/admin');

    return { status: 'ready', email, authUserId: broker.auth_user_id || authUserId, sessionId };

  } catch (err) {
    if (err.status === 303) throw err;
    throw error(500, 'Imposible verificar los datos de facturación.');
  }
}

export const actions = {
  default: async ({ request }) => {
    // INICIALIZACIÓN SEGURA EN RUNTIME
    const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

    const formData = await request.formData();
    const password = formData.get('password');
    const subdominio = formData.get('subdominio').trim().toLowerCase();
    const nombreComercial = formData.get('nombreComercial').trim();
    const authUserId = formData.get('authUserId');
    const email = formData.get('email');

    if (!password || password.length < 6 || !subdominio || !nombreComercial) {
      return { success: false, error: 'Todos los campos son obligatorios.' };
    }

    if (!/^[a-z0-9-]+$/.test(subdominio)) {
      return { success: false, error: 'Subdominio inválido.' };
    }

    try {
      const { data: duplicate } = await supabaseAdmin
        .from('brokers')
        .select('id')
        .eq('subdominio', subdominio)
        .not('auth_user_id', 'eq', authUserId)
        .maybeSingle();

      if (duplicate) return { success: false, error: 'Subdominio ya registrado.' };

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
      if (authError) throw authError;

      const { error: profileError } = await supabaseAdmin
        .from('brokers')
        .update({ nombre_comercial: nombreComercial, subdominio: subdominio })
        .eq('auth_user_id', authUserId);
      if (profileError) throw profileError;

      return { success: true, email, password };

    } catch (err) {
      return { success: false, error: 'Error interno al guardar.' };
    }
  }
};
