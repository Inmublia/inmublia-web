// src/routes/api/stripe/portal/+server.js
import { redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

export async function GET({ locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('stripe_customer_id, subdominio, status_suscripcion')
    .eq('auth_user_id', user.id)
    .single();

  if (!broker?.stripe_customer_id) {
    throw redirect(303, '/admin/planes');
  }

  const status = (broker.status_suscripcion || '').toLowerCase().trim();
  
  // Si está cancelado definitivo, el portal de Stripe no sirve para reactivar. 
  // Lo enviamos a tu tabla de precios para generar un checkout nuevo.
  if (['cancelada', 'canceled'].includes(status)) {
     throw redirect(303, '/admin/planes');
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: broker.stripe_customer_id,
      return_url: `https://${broker.subdominio}.inmublia.com/admin/perfil`,
    });
    throw redirect(303, portalSession.url);
  } catch (err) {
    console.error("Error al generar portal Stripe:", err);
    throw redirect(303, '/admin/perfil');
  }
}
