// src/routes/api/stripe/portal/+server.js
import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function GET({ locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const { data: broker, error } = await locals.supabase
    .from('brokers')
    .select('stripe_customer_id, subdominio, status_suscripcion, auth_user_id')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !broker) {
     throw redirect(303, '/login');
  }

  // Si no tiene ID de Stripe o está cancelado definitivo, el portal de Stripe falla.
  // Expulsión a la página de ventas con inyección de ADN para reactivación.
  const status = (broker.status_suscripcion || '').toLowerCase().trim();
  const isCanceled = ['cancelada', 'canceled'].includes(status);

  if (!broker.stripe_customer_id || isCanceled) {
     const urlReactivacion = `https://inmublia.com/planes?reactivation=true&uid=${broker.auth_user_id}&cus=${broker.stripe_customer_id || ''}`;
     throw redirect(303, urlReactivacion);
  }

  // Si es past_due (moroso) o activo, lo mandamos al Portal para gestionar la tarjeta
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: broker.stripe_customer_id,
      return_url: `https://${broker.subdominio}.inmublia.com/admin/perfil`,
    });
    throw redirect(303, portalSession.url);
  } catch (err) {
    console.error("🔥 Error al generar portal Stripe:", err);
    throw redirect(303, '/admin/perfil?alerta=error_stripe');
  }
}
