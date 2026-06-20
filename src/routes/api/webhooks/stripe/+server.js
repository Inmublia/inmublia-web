import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';
import { createClient } from '@supabase/supabase-js';

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
  // 2. UPGRADES Y DOWNGRADES (DESDE EL PORTAL DE STRIPE)
  // ============================================================================
  else if (stripeEvent.type === 'customer.subscription.updated') {
    const subscription = stripeEvent.data.object;

    try {
      const customerId = subscription.customer;
      const status = subscription.status; // 'active', 'past_due', etc.
      const priceId = subscription.items.data[0].price.id;

      // Mapeo del nivel de acceso según el ID de precio de Stripe
      let nuevoPlan = 'basico';
      if (priceId === 'price_1TfAJKJHda98KYP8coylMcTp') nuevoPlan = 'pro';
      if (priceId === 'price_1TfAJdJHda98KYP8KzZTwXDf') nuevoPlan = 'elite';

      const { error: updateError } = await supabaseAdmin
        .from('brokers')
        .update({ 
          plan_suscripcion: nuevoPlan,
          status_suscripcion: status 
        })
        .eq('stripe_customer_id', customerId);

      if (updateError) throw new Error(`Fallo actualizando la BD: ${updateError.message}`);
      
      console.log(`[Stripe Webhook]: Upgrade/Downgrade exitoso. Cliente: ${customerId} -> Nuevo Plan: ${nuevoPlan}`);

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

      const { error: deleteError } = await supabaseAdmin
        .from('brokers')
        .update({ 
          plan_suscripcion: 'basico', // El fallback de seguridad
          status_suscripcion: 'cancelada' 
        })
        .eq('stripe_customer_id', customerId);

      if (deleteError) throw new Error(`Fallo degradando cuenta en BD: ${deleteError.message}`);

      console.log(`[Stripe Webhook]: Suscripción cancelada. Cliente: ${customerId} fue degradado a Básico.`);

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault - Delete]:', err);
      const errorReal = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error_aislado: errorReal }), { status: 500 });
    }
  }

  // Retorno universal 200 OK para confirmar recepción a Stripe
  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
