import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  // Verificación dura: Si falta la llave, Cloudflare aborta explícitamente
  if (!privateEnv.STRIPE_SECRET_KEY || !privateEnv.STRIPE_WEBHOOK_SECRET) {
    console.error("🔥 Faltan llaves de entorno de Stripe en Cloudflare");
    return new Response(JSON.stringify({ error: 'Configuración Edge faltante' }), { status: 500 });
  }

  const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Falta la firma de Stripe' }), { status: 401 });
  }

  let stripeEvent;
  try {
    // EL FIX DEFINITIVO PARA CLOUDFLARE: constructEventAsync 
    stripeEvent = await stripe.webhooks.constructEventAsync(rawBody, signature, privateEnv.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`🔥 [Webhook Error] Fallo criptográfico: ${err.message}`);
    return new Response(JSON.stringify({ error: 'Firma inválida' }), { status: 400 });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      let authUserId = session.client_reference_id; 
      const email = session.customer_details?.email;
      const stripeCustomerId = session.customer;
      
      const nombreComercial = session.metadata?.nombre_comercial || '';
      // Salvavidas absoluto: Generar un string alfanumérico aleatorio si Stripe falla en enviar metadata
      const subdominioDeseado = session.metadata?.subdominio || (email ? email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000) : `agencia${Math.floor(Math.random() * 10000)}`);

      if (!email) throw new Error('Sesión de Stripe no contiene email.');

      if (!authUserId) {
        const tempPassword = crypto.randomUUID() + crypto.randomUUID() + '!A1';

        const { data: uData, error: uErr } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true 
        });

        if (uErr) {
          if (uErr.message.includes('already exists') || uErr.status === 422) {
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const matchedUser = existingUsers?.users?.find(u => u.email === email);
            if (!matchedUser) throw new Error('Usuario duplicado inaccesible');
            authUserId = matchedUser.id;
          } else {
            throw uErr;
          }
        } else {
          authUserId = uData.user.id;
        }
      }

      await crearAgenciaDesdeStripe({ authUserId, email, nombreComercial, subdominioDeseado, stripeCustomerId });

      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        redirectTo: 'https://admin.inmublia.com/admin/bienvenida'
      });

      if (linkData?.properties?.action_link && privateEnv.RESEND_API_KEY) {
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
            html: `
              <div style="font-family: -apple-system, sans-serif; padding: 30px;">
                <h2 style="color: #10b981;">¡Pago procesado con éxito!</h2>
                <p>Tu infraestructura inmobiliaria ha sido aprovisionada.</p>
                <a href="${linkData.properties.action_link}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 20px;">
                  Configurar mi Agencia
                </a>
              </div>
            `
          })
        });
      }

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault]:', err);
      // Retornar 500 obliga a Stripe a marcarlo como fallido y reintentar
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  // PRUEBA DE LA VERDAD FORENSE: Si no ves "sveltekit: true" en Stripe, Cloudflare no ha actualizado la ruta.
  return new Response(JSON.stringify({ success: true, sveltekit: true }), { 
    status: 200, 
    headers: { 'Content-Type': 'application/json' } 
  });
}
