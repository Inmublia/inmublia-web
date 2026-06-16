// forzando lectura del config.toml
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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email || session.customer_email;
    const stripeCustomerId = session.customer as string;
    
    // Extracción dinámica: Soporta 'basico', 'pro', 'elite' o cualquier plan futuro
    const planPagado = session.metadata?.plan || 'basico'; 

    // 1. Guardamos el recibo enriquecido en stripe_eventos
    const { error: insertError } = await supabaseAdmin
      .from('stripe_eventos')
      .insert([{ 
        id: event.id, 
        tipo: event.type,
        email: email,
        stripe_customer_id: stripeCustomerId,
        plan_comprado: planPagado,
        payload: event 
      }]);

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ recibido: true, nota: 'Duplicado' }), { status: 200 });
      }
      console.error('Error DB:', insertError);
      return new Response('Error de BD', { status: 500 });
    }

    // 2. Creamos la cuenta de Auth (SIN tocar la tabla brokers todavía)
    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { plan: planPagado }
      });
      
      if (authError && !authError.message.includes('already exists')) {
        console.error('Error creando usuario Auth:', authError);
      }
    }
    
  } else {
    // Para cualquier otro evento de Stripe, registramos lo básico
    const { error: insertError } = await supabaseAdmin
      .from('stripe_eventos')
      .insert([{ id: event.id, tipo: event.type }]);

    if (insertError && insertError.code !== '23505') {
      console.error('Error DB Evento Genérico:', insertError);
    }
  }

  return new Response(JSON.stringify({ recibido: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
});
