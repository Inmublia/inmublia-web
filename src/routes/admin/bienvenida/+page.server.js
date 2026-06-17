import { error, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-10-16' });
const supabaseAdmin = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export async function load({ url, locals }) {
  const sessionId = url.searchParams.get('s');
  const { session } = await locals.safeGetSession();
  
  // Seguridad perimetral: Debe traer ID de Stripe o venir del correo con sesión viva
  if (!sessionId && !session) {
    throw redirect(303, '/login');
  }

  try {
    let email = session?.user?.email;
    let authUserId = session?.user?.id;

    // Validación Criptográfica Síncrona con Stripe
    if (sessionId) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      if (checkoutSession.payment_status !== 'paid') {
        throw error(403, 'Transacción no pagada o pendiente de verificación.');
      }
      email = checkoutSession.customer_details?.email;
    }

    // Buscamos si el Webhook (que corre en paralelo) ya aprovisionó la cuenta
    const { data: broker } = await supabaseAdmin
      .from('brokers')
      .select('id, auth_user_id, nombre_comercial, subdominio')
      .eq('email', email)
      .maybeSingle();

    // Si el webhook aún está corriendo, devolvemos estado de espera para hacer polling
    if (!broker) {
      return { status: 'waiting', email, sessionId };
    }

    // Si el perfil ya está completo, lo expulsamos del onboarding directo al CRM
    if (broker.subdominio && broker.nombre_comercial) {
      throw redirect(303, '/admin');
    }

    return {
      status: 'ready',
      email,
      authUserId: broker.auth_user_id || authUserId,
      sessionId
    };

  } catch (err) {
    if (err.status === 303) throw err;
    console.error('🔥 Error en el Load de Bienvenida:', err);
    throw error(500, 'Imposible verificar los datos de facturación.');
  }
}

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const password = formData.get('password');
    const subdominio = formData.get('subdominio').trim().toLowerCase();
    const nombreComercial = formData.get('nombreComercial').trim();
    const authUserId = formData.get('authUserId');
    const email = formData.get('email');

    if (!password || password.length < 6 || !subdominio || !nombreComercial) {
      return { success: false, error: 'Todos los campos son obligatorios (Contraseña min. 6 caracteres).' };
    }

    if (!/^[a-z0-9-]+$/.test(subdominio)) {
      return { success: false, error: 'Subdominio inválido. Usa solo letras minúsculas, números y guiones.' };
    }

    try {
      // 1. Verificación de colisión de subdominios
      const { data: duplicate } = await supabaseAdmin
        .from('brokers')
        .select('id')
        .eq('subdominio', subdominio)
        .not('auth_user_id', 'eq', authUserId)
        .maybeSingle();

      if (duplicate) {
        return { success: false, error: 'El subdominio ya está registrado por otra agencia.' };
      }

      // 2. Modificación de la Bóveda de Auth (Sobrescribimos la clave aleatoria)
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: password
      });
      if (authError) throw authError;

      // 3. Actualización de Metadata del Tenant
      const { error: profileError } = await supabaseAdmin
        .from('brokers')
        .update({ 
          nombre_comercial: nombreComercial, 
          subdominio: subdominio 
        })
        .eq('auth_user_id', authUserId);
      
      if (profileError) throw profileError;

      // Retornamos las credenciales para que el frontend haga login inmediato
      return { success: true, email, password };

    } catch (err) {
      console.error('🔥 Error en Action de Bienvenida:', err);
      return { success: false, error: 'Error interno al guardar la configuración.' };
    }
  }
};
