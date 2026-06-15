// Despertando el webhook
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Faltan credenciales de webhook.', { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.error(`⚠️ Error de firma: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  // Muro de Idempotencia
  const { error: insertError } = await supabaseAdmin
    .from('stripe_eventos')
    .insert([{ id: event.id, tipo: event.type }]);

  if (insertError && insertError.code === '23505') {
    return new Response(JSON.stringify({ recibido: true }), { status: 200 });
  } else if (insertError) {
    return new Response('Error de BD', { status: 500 });
  }

  // Aprovisionamiento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;
    const stripeCustomerId = session.customer as string;
    const planPagado = session.metadata?.plan || 'basico'; 

    if (email) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { plan: planPagado }
      });

      if (authData?.user && !authError) {
        await supabaseAdmin.from('brokers').insert([{
          auth_user_id: authData.user.id,
          stripe_customer_id: stripeCustomerId,
          plan_suscripcion: planPagado,
          email_contacto: email,
          estado_cuenta: 'activa'
        }]);
      }
    }
  }

  return new Response(JSON.stringify({ recibido: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
});
