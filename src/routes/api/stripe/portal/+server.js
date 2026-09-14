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
    .select('stripe_customer_id, subdominio, status_suscripcion')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !broker) {
     throw redirect(303, '/login');
  }

  const status = (broker.status_suscripcion || '').toLowerCase().trim();
  const isCanceled = ['cancelada', 'canceled'].includes(status);

  // REGLA: Si no tiene ID de Stripe o su contrato murió, el Portal falla. 
  // Lo expulsamos a tu página interna de Reactivación.
  if (!broker.stripe_customer_id || isCanceled) {
     throw redirect(303, '/admin/planes');
  }

  // REGLA: Si es moroso (past_due) o activo, lo mandamos al Portal para gestionar tarjeta
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
