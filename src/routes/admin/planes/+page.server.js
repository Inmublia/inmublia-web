// src/routes/admin/planes/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function load({ locals, url }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('plan_suscripcion, status_suscripcion')
    .eq('auth_user_id', user.id)
    .single();

  const alerta = url.searchParams.get('alerta');

  return { broker, alerta };
}

export const actions = {
  checkout: async ({ request, locals }) => {
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

      // 🔥 EL SECRETO INDUSTRIAL: Si ya era cliente, lo enlazamos. 
      // Si por un error extraño no tenía ID, le pasamos su email para que Stripe lo cree.
      if (broker.stripe_customer_id) {
        sessionConfig.customer = broker.stripe_customer_id;
      } else {
        sessionConfig.customer_email = broker.email;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      
      throw redirect(303, session.url);

    } catch (err) {
      if (err.status === 303) throw err; // SvelteKit redirections
      console.error("🔥 Error Stripe Checkout:", err);
      return fail(500, { error: err.message || 'Error al conectar con la pasarela de pagos.' });
    }
  }
};
