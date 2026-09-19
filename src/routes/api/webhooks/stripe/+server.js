// src/routes/api/webhooks/stripe/+server.js
import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

// 1. Inicializar Stripe
const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' 
});

export async function POST({ request }) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = privateEnv.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // 2. Verificación criptográfica
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`[Stripe Error] Firma inválida:`, err.message);
    return json({ error: err.message }, { status: 400 });
  }

  // 3. Inicializar Supabase en God Mode
  const supabase = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 4. Protección contra eventos duplicados (Idempotencia)
    const { data: yaExiste } = await supabase
      .from('stripe_events_log')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (yaExiste) {
      return json({ received: true, duplicate: true });
    }

    // Registrar el evento
    await supabase.from('stripe_events_log').insert({
      stripe_event_id: event.id,
      tipo: event.type
    });

    // 5. Router Financiero
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const brokerId = session.metadata?.broker_id;
        
        if (brokerId) {
          await supabase.from('brokers').update({
            status_suscripcion: 'activa',
            stripe_customer_id: session.customer
          }).eq('id', brokerId);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const attemptCount = invoice.attempt_count || 1;
        
        if (invoice.customer) {
          await supabase.from('brokers').update({
            status_suscripcion: attemptCount >= 3 ? 'past_due' : 'activa',
            ultimo_fallo_pago: new Date().toISOString(),
            intentos_fallidos_pago: attemptCount,
          }).eq('stripe_customer_id', invoice.customer);
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        if (invoice.customer) {
          const { data: broker } = await supabase
            .from('brokers')
            .select('plan_suscripcion')
            .eq('stripe_customer_id', invoice.customer)
            .single();

          const creditosPorPlan = { basico: 15, pro: 125, elite: 300 };
          const planActual = broker?.plan_suscripcion || 'basico';

          await supabase.from('brokers').update({
            status_suscripcion: 'activa',
            intentos_fallidos_pago: 0,
            ia_creditos_disponibles: creditosPorPlan[planActual] || 15
          }).eq('stripe_customer_id', invoice.customer);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.customer) {
          const priceId = sub.items?.data[0]?.price?.id;
          
          const planMap = {
            'price_1UFgBoJHda98KYP8zVxz1V2h': 'basico',
            'price_1UFgCSJHda98KYP8WAfuaRCU': 'basico',
            'price_1UFgDVJHda98KYP8Hvvb7jIU': 'pro',
            'price_1UF3y9JHda98KYP83uVDd0rF': 'pro',
            'price_1UF3vVJHda98KYP8sEBcENHN': 'elite',
            'price_1UF3wrJHda98KYP82p3McSSj': 'elite',
          };
          
          const nuevoPlan = priceId ? planMap[priceId] : null;
          const updateData = { status_suscripcion: sub.status === 'active' ? 'activa' : sub.status };

          if (nuevoPlan) {
            const creditosPorPlan = { basico: 15, pro: 125, elite: 300 };
            updateData.plan_suscripcion = nuevoPlan;
            updateData.ia_creditos_disponibles = creditosPorPlan[nuevoPlan] || 15;
          }

          await supabase.from('brokers').update(updateData).eq('stripe_customer_id', sub.customer);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (subscription.customer) {
          await supabase.from('brokers').update({ status_suscripcion: 'cancelada' }).eq('stripe_customer_id', subscription.customer);
        }
        break;
      }
    }

    return json({ received: true });
    
  } catch (err) {
    console.error(`[CRÍTICO] Webhook DB Error:`, err.message);
    
    // Log a base de datos de manera silenciosa
    try {
      await supabase.from('webhook_errors_log').insert({
        stripe_event_id: event?.id || 'sin_id',
        tipo_evento: event?.type || 'desconocido',
        error_mensaje: err.message,
        payload_raw: event
      });
    } catch(e) {}

    return json({ error: 'Falla interna procesando evento' }, { status: 500 });
  }
}
