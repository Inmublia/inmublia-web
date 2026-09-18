import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import Stripe from 'https://esm.sh/stripe@14.14.0'

// 1. Inicializamos Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  try {
    const body = await req.text()
    // 2. Verificamos que el mensaje realmente venga de Stripe
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!)

    // 3. Inicializamos Supabase en "God Mode" (Service Role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. El Router Financiero
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any
        const brokerId = session.metadata?.broker_id
        
        if (brokerId) {
          await supabase.from('brokers').update({
            status_suscripcion: 'activa',
            stripe_customer_id: session.customer
          }).eq('id', brokerId)
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        if (invoice.customer) {
          await supabase.from('brokers').update({
            status_suscripcion: 'inactiva'
          }).eq('stripe_customer_id', invoice.customer)
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any
        if (invoice.customer) {
          await supabase.from('brokers').update({
            status_suscripcion: 'activa'
          }).eq('stripe_customer_id', invoice.customer)
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        if (subscription.customer) {
          await supabase.from('brokers').update({
            status_suscripcion: 'cancelada'
          }).eq('stripe_customer_id', subscription.customer)
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`Webhook Error:`, errorMessage)
    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 })
  }
})
