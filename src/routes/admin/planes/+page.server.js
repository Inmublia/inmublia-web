// src/routes/admin/planes/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';

// Inicializamos Stripe con tu clave secreta de entorno
const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function load({ locals, url }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  // 🚀 BYPASS RLS: Inyectamos Cliente Dios para el God Mode
  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Buscamos el ID correcto (El tuyo, o el del cliente si estás impersonando)
  let query = db.from('brokers').select('plan_suscripcion, status_suscripcion');
  
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', user.id);
  }

  const { data: broker } = await query.single();

  const alerta = url.searchParams.get('alerta');

  return { broker, alerta };
}

export const actions = {
  checkout: async ({ request, locals }) => {
    // 🚀 BLOQUEO DE SEGURIDAD MODO LECTURA
    if (locals.isImpersonating) {
      return fail(403, { error: 'Modo Visualización: No puedes modificar la suscripción ni acceder a la pasarela de pagos del cliente.' });
    }

    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'Sesión expirada' });

    const formData = await request.formData();
    const priceId = formData.get('price_id');

    if (!priceId) return fail(400, { error: 'No se detectó el plan seleccionado.' });

    // 1. Extraemos el ADN del cliente para no crear duplicados
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('stripe_customer_id, subdominio, email')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(400, { error: 'Perfil de agencia no encontrado.' });

    try {
      const sessionConfig = {
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        // Redirige al perfil con un flag de éxito
        success_url: `https://${broker.subdominio}.inmublia.com/admin/perfil?alerta=pago_exitoso`,
        // Si se arrepiente, vuelve a esta misma página
        cancel_url: `https://${broker.subdominio}.inmublia.com/admin/planes`,
        allow_promotion_codes: true,
      };

      // Si ya era cliente, lo enlazamos para evitar dobles registros. 
      if (broker.stripe_customer_id) {
        sessionConfig.customer = broker.stripe_customer_id;
      } else {
        sessionConfig.customer_email = broker.email;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      throw redirect(303, session.url);

    } catch (err) {
      if (err.status === 303) throw err; // Es un redirect de SvelteKit, lo dejamos pasar
      console.error("🔥 Error Stripe Checkout:", err);
      return fail(500, { error: err.message || 'Error al conectar con la pasarela de pagos.' });
    }
  }
};
