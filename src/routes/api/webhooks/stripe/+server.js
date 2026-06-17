import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  // Inicialización segura en Runtime
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Falta la firma de Stripe' }), { status: 401 });
  }

  let stripeEvent;
  try {
    // 🔥 EL FIX CRÍTICO PARA CLOUDFLARE PAGES: constructEventAsync
    stripeEvent = await stripe.webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`🔥 [Webhook Error] Fallo criptográfico en Edge: ${err.message}`);
    return new Response(JSON.stringify({ error: 'Firma inválida' }), { status: 400 });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      let authUserId = session.client_reference_id; 
      const email = session.customer_details?.email;
      const stripeCustomerId = session.customer;
      
      const nombreComercial = session.metadata?.nombre_comercial || '';
      // Si no trae subdominio, generamos uno seguro base
      const subdominioDeseado = session.metadata?.subdominio || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);

      if (!email) throw new Error('Sesión de Stripe no contiene un email válido.');

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
            if (!matchedUser) throw new Error('Usuario duplicado no encontrado.');
            authUserId = matchedUser.id;
          } else {
            throw uErr;
          }
        } else {
          authUserId = uData.user.id;
        }
      }

      await crearAgenciaDesdeStripe({ 
        authUserId, 
        email, 
        nombreComercial, 
        subdominioDeseado, 
        stripeCustomerId
      });

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        redirectTo: 'https://admin.inmublia.com/admin/bienvenida'
      });

      if (linkError) throw linkError;

      if (linkData?.properties?.action_link) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Inmublia <bienvenida@inmublia.com>', 
            to: [email],
            subject: 'Tu cuenta Inmublia está lista. Configura tus accesos.',
            html: `
              <div style="font-family: -apple-system, sans-serif; max-w-xl; margin: 0 auto; color: #0f172a; padding: 30px;">
                <h2 style="color: #10b981; font-size: 24px; font-weight: 900; margin-bottom: 15px;">¡Pago procesado con éxito!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #334155;">Tu infraestructura inmobiliaria ha sido aprovisionada.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #334155;">Utiliza el siguiente botón seguro para establecer tu contraseña maestra y definir el dominio de tu catálogo:</p>
                <div style="margin: 40px 0;">
                  <a href="${linkData.properties.action_link}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
                    Configurar mi Agencia
                  </a>
                </div>
              </div>
            `
          })
        });
      }

    } catch (err) {
      console.error('🔥 [Webhook Severe Fault]:', err);
      return new Response(JSON.stringify({ error: 'Fallo interno en aprovisionamiento' }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
