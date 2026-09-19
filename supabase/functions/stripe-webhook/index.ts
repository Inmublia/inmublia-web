import { createClient } from 'npm:@supabase/supabase-js@2.39.0'
import Stripe from 'npm:stripe@14.14.0'

// 1. Inicializamos Stripe con la API reciente
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16', // Mantenemos esta a menos que la hayas actualizado en tu panel
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req: Request) => {
  // FIX: Prevenir que el navegador tire el servidor al hacer GET (ERR_EMPTY_RESPONSE)
  if (req.method === 'GET') {
    return new Response("Webhook endpoint de Inmublia operativo.", { status: 200 })
  }

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  let eventPayload: any = null;

  try {
    const body = await req.text()
    // 2. Verificación criptográfica
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret!)
    eventPayload = event;

    // 3. Inicializamos Supabase en "God Mode"
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🔴 FIX CRÍTICO: IDEMPOTENCIA
    const { data: yaExiste } = await supabase
      .from('stripe_events_log')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single()

    if (yaExiste) {
      console.log(`Evento ${event.id} ya procesado. Ignorando.`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
    }

    // Registrar el evento para no volver a procesarlo
    await supabase.from('stripe_events_log').insert({
      stripe_event_id: event.id,
      tipo: event.type
    })

    // 4. El Router Financiero
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const brokerId = session.metadata?.broker_id
        
        if (brokerId) {
          // 🔴 FIX CRÍTICO: Verificamos errores silenciosos de Supabase
          const { error, count } = await supabase.from('brokers').update({
            status_suscripcion: 'activa',
            stripe_customer_id: session.customer as string
          }).eq('id', brokerId).select('id', { count: 'exact' })

          if (error) throw new Error(`Update broker fallido: ${error.message}`)
          if (count === 0) console.error(`ALERTA: Broker ID ${brokerId} no encontrado en BD.`)
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const attemptCount = invoice.attempt_count ?? 1
        
        if (invoice.customer) {
          // 🔴 FIX CRÍTICO: Tolerancia a fallos (No bloquear al primer intento)
          const { error } = await supabase.from('brokers').update({
            status_suscripcion: attemptCount >= 3 ? 'past_due' : 'activa',
            ultimo_fallo_pago: new Date().toISOString(),
            intentos_fallidos_pago: attemptCount,
          }).eq('stripe_customer_id', invoice.customer as string)

          if (error) throw new Error(`Error en payment_failed: ${error.message}`)
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        
        if (invoice.customer) {
          // 🔴 FIX CRÍTICO: Reset mensual de créditos IA
          const { data: broker } = await supabase
            .from('brokers')
            .select('plan_suscripcion')
            .eq('stripe_customer_id', invoice.customer as string)
            .single()

          const creditosPorPlan: Record<string, number> = { basico: 15, pro: 125, elite: 300 }
          const planActual = broker?.plan_suscripcion ?? 'basico'
          const creditosReset = creditosPorPlan[planActual] ?? 15

          const { error } = await supabase.from('brokers').update({
            status_suscripcion: 'activa',
            intentos_fallidos_pago: 0,
            ia_creditos_disponibles: creditosReset
          }).eq('stripe_customer_id', invoice.customer as string)

          if (error) throw new Error(`Error en payment_succeeded: ${error.message}`)
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        if (sub.customer) {
          // 🔴 FIX CRÍTICO: Cancelaciones por falta de pago (past_due) y Upgrades
          const priceId = sub.items?.data[0]?.price?.id
          
          // Mapeo automático de tu plan dependiendo si cambió
          const planMap: Record<string, string> = {
            'price_1UFgBoJHda98KYP8zVxz1V2h': 'basico',
            'price_1UFgCSJHda98KYP8WAfuaRCU': 'basico',
            'price_1UFgDVJHda98KYP8Hvvb7jIU': 'pro',
            'price_1UF3y9JHda98KYP83uVDd0rF': 'pro',
            'price_1UF3vVJHda98KYP8sEBcENHN': 'elite',
            'price_1UF3wrJHda98KYP82p3McSSj': 'elite',
          }
          
          const nuevoPlan = priceId ? planMap[priceId] : null
          const updateData: any = { 
            status_suscripcion: sub.status === 'active' ? 'activa' : sub.status 
          }

          if (nuevoPlan) {
            const creditosPorPlan: Record<string, number> = { basico: 15, pro: 125, elite: 300 }
            updateData.plan_suscripcion = nuevoPlan
            updateData.ia_creditos_disponibles = creditosPorPlan[nuevoPlan] ?? 15
          }

          const { error } = await supabase.from('brokers')
            .update(updateData)
            .eq('stripe_customer_id', sub.customer as string)

          if (error) throw new Error(`Error en subscription.updated: ${error.message}`)
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        if (subscription.customer) {
          const { error } = await supabase.from('brokers').update({
            status_suscripcion: 'cancelada'
          }).eq('stripe_customer_id', subscription.customer as string)
          
          if (error) throw new Error(`Error en subscription.deleted: ${error.message}`)
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
    
  } catch (err) {
    // 🔴 FIX CRÍTICO: Logging estructurado a la Base de Datos
    const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
    console.error(`[CRÍTICO] Webhook Error:`, errorMessage)
    
    // Solo intentamos guardar en BD si logramos inicializar Supabase, pero sin await para no bloquear el retorno
    try {
       const supabaseLogs = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
       )
       supabaseLogs.from('webhook_errors_log').insert({
          stripe_event_id: eventPayload?.id ?? 'sin_id',
          tipo_evento: eventPayload?.type ?? 'desconocido',
          error_mensaje: errorMessage,
          payload_raw: eventPayload,
       }).then()
    } catch(e) {}

    return new Response(`Webhook Error: ${errorMessage}`, { status: 400 })
  }
})
