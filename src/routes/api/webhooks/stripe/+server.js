// src/routes/api/webhooks/stripe/+server.js
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';
import { createClient } from '@supabase/supabase-js';

// DICCIONARIO DE PRECIOS EXACTO DE TU DISEÑO (src/routes/admin/planes/+page.svelte)
const PLAN_MAPPING = {
  'price_1UFgBoJHda98KYP8zVxz1V2h': 'basico', // Básico Mensual
  'price_1UFgCSJHda98KYP8WAfuaRCU': 'basico', // Básico Anual
  'price_1UFgDVJHda98KYP8Hvvb7jIU': 'pro',    // Pro Mensual
  'price_1UF3y9JHda98KYP83uVDd0rF': 'pro',    // Pro Anual
  'price_1UF3vVJHda98KYP8sEBcENHN': 'elite',  // Elite Mensual
  'price_1UF3wrJHda98KYP82p3McSSj': 'elite'   // Elite Anual
};

export async function POST({ request, fetch }) {
  if (!privateEnv.STRIPE_SECRET_KEY || !privateEnv.STRIPE_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Faltan llaves de entorno de Stripe en Cloudflare' }), { status: 500 });
  }

  const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: fetch },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) return new Response(JSON.stringify({ error: 'Falta firma' }), { status: 401 });

  let stripeEvent;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(rawBody, signature, privateEnv.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(JSON.stringify({ error: `Firma inválida: ${err.message}` }), { status: 400 });
  }

  // ============================================================================
  // 1. CREACIÓN DE USUARIO Y AGENCIA (NUEVOS CLIENTES)
  // ============================================================================
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      let authUserId = session.client_reference_id; 
      const email = session.customer_details?.email;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
      
      const nombreComercial = session.metadata?.nombre_comercial || 'Agencia Inmublia';
      const subdominioDeseado = session.metadata?.subdominio || (email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000) : `agencia${Math.floor(Math.random() * 10000)}`);

      if (!email) throw new Error('Sesión de Stripe sin email.');

      // 1.1 GESTIÓN SEGURA DEL USUARIO EN AUTH
      if (!authUserId) {
        const tempPassword = crypto.randomUUID() + '!A1';

        const { data: uData, error: uErr } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true 
        });

        if (uErr) {
          // Búsqueda profunda paginada
          if (uErr.status === 422 || uErr.message.toLowerCase().includes('already exists')) {
            let foundUser = null;
            let page = 1;
            while (!foundUser && page <= 5) {
              const { data: pageData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
              if (!pageData || !pageData.users || pageData.users.length === 0) break;
              foundUser = pageData.users.find(u => u.email === email);
              page++;
            }
            if (!foundUser) throw new Error('El usuario existe pero no se pudo recuperar su ID de Auth.');
            authUserId = foundUser.id;
          } else {
            throw new Error(`Error creando usuario: ${uErr.message}`);
          }
        } else {
          authUserId = uData.user.id;
        }
      }

      // 1.2 APROVISIONAMIENTO EN BASE DE DATOS
      await crearAgenciaDesdeStripe({ 
        authUserId, email, nombreComercial, subdominioDeseado, stripeCustomerId, svelteFetch: fetch 
      });

      // 1.3 ENVÍO DE CORREO (Tolerante a fallos)
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          redirectTo: 'https://admin.inmublia.com/admin/bienvenida'
        });

        if (!linkError && linkData?.properties?.action_link && privateEnv.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${privateEnv.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'Inmublia <bienvenida@inmublia.com>', 
              to: [email],
              subject: 'Tu cuenta Inmublia está lista. Configura tus accesos.',
              html: `<div style="font-family: sans-serif; padding: 20px;">
                      <h2>¡Pago procesado con éxito!</h2>
                      <p>Tu infraestructura inmobiliaria ha sido aprovisionada.</p>
                      <a href="${linkData.properties.action_link}" style="background-color: #0f172a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Configurar mi Agencia</a>
                    </div>`
            })
          });
        }
      } catch (mailErr) {
        console.warn('Advertencia: No se pudo enviar el correo de bienvenida.', mailErr);
      }

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault - Checkout]:', err);
      const errorReal = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : 'Sin stack trace';
      
      return new Response(JSON.stringify({ 
        error_aislado: errorReal, 
        detalle: errorStack 
      }), { status: 500 });
    }
  }

  // ============================================================================
  // 2. UPGRADES Y DOWNGRADES (DESDE EL PORTAL DE STRIPE O REACTIVACIÓN)
  // ============================================================================
  else if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object;

    try {
      const customerId = subscription.customer;
      const status = subscription.status; // 'active', 'past_due', etc.
      const priceId = subscription.items.data[0].price.id;

      // FIX CRÍTICO: Recarga y ajuste de billetera de IA automático + Mapeo correcto de Planes
      const nuevoPlan = PLAN_MAPPING[priceId] || 'basico';
      let nuevosCreditos = 15; // Créditos por defecto para Básico

      if (nuevoPlan === 'pro') nuevosCreditos = 125;
      if (nuevoPlan === 'elite') nuevosCreditos = 500;

      const { error: updateError } = await supabaseAdmin
        .from('brokers')
        .update({ 
          plan_suscripcion: nuevoPlan,
          status_suscripcion: status,
          ia_creditos_disponibles: nuevosCreditos // Se sincroniza la billetera con el plan
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) throw new Error(`Fallo actualizando la BD: ${updateError.message}`);
      
      console.log(`[Stripe Webhook]: Upgrade/Downgrade exitoso. Cliente: ${customerId} -> Nuevo Plan: ${nuevoPlan} con ${nuevosCreditos} créditos`);

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault - Update]:', err);
      const errorReal = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error_aislado: errorReal }), { status: 500 });
    }
  }

  // ============================================================================
  // 3. CANCELACIONES DEFINITIVAS O FALLOS DE COBRO IRRECUPERABLES
  // ============================================================================
  else if (stripeEvent.type === 'customer.subscription.deleted') {
    const subscription = stripeEvent.data.object;

    try {
      const customerId = subscription.customer;

      // PARCHE DE SEGURIDAD (RACE CONDITION): Evitamos cancelar la cuenta si el usuario solo hizo un Upgrade
      const activeSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
      });

      if (activeSubscriptions.data.length === 0) {
        // Si la lista regresa vacía, la cancelación es real. Bloqueamos.
        const { error: deleteError } = await supabaseAdmin
          .from('brokers')
          .update({ 
            status_suscripcion: 'canceled', 
            ia_creditos_disponibles: 0      // Billetera congelada a cero por morosidad/cancelación
          })
          .eq('stripe_customer_id', customerId);

        if (deleteError) throw new Error(`Fallo actualizando cuenta en BD: ${deleteError.message}`);

        console.log(`[Stripe Webhook]: Suscripción cancelada de raíz. Cliente: ${customerId} bloqueado.`);
      } else {
        console.log(`[Stripe Webhook]: Falsa alarma (Race Condition). El cliente ${customerId} tiene otra suscripción activa. No se canceló la cuenta.`);
      }

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault - Delete]:', err);
      const errorReal = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error_aislado: errorReal }), { status: 500 });
    }
  }

  // Retorno universal 200 OK para confirmar recepción a Stripe
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
