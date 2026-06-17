import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  // 1. INICIALIZACIÓN SEGURA EN RUNTIME - Sin apiVersion hardcodeada
  const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY);
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) return new Response(JSON.stringify({ error: 'Falta la firma de Stripe' }), { status: 401 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, privateEnv.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`🔥 [Webhook Error]: ${err.message}`);
    return new Response(JSON.stringify({ error: 'Firma inválida' }), { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      let authUserId = session.client_reference_id; 
      const email = session.customer_details?.email;
      const stripeCustomerId = session.customer;
      
      const nombreComercial = session.metadata?.nombre_comercial || '';
      const subdominioDeseado = session.metadata?.subdominio || '';

      if (!email) throw new Error('Sesión sin correo asociado.');

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

      await crearAgenciaDesdeStripe({ authUserId, email, nombreComercial, subdominioDeseado, stripeCustomerId });

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
            'Authorization': `Bearer ${privateEnv.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Inmublia <bienvenida@inmublia.com>', 
            to: [email],
            subject: 'Tu cuenta Inmublia está lista. Configura tus accesos.',
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; padding: 30px;">
                <h2 style="color: #10b981; font-size: 24px; font-weight: 900; margin-bottom: 15px;">¡Pago procesado con éxito!</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #334155;">Tu infraestructura inmobiliaria ha sido aprovisionada.</p>
                <p style="font-size: 16px; line-height: 1.6; color: #334155;">Si no fuiste redirigido automáticamente tras el pago, utiliza el siguiente botón para establecer tu contraseña maestra y definir el dominio de tu agencia:</p>
                
                <div style="margin: 40px 0;">
                  <a href="${linkData.properties.action_link}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
                    Configurar mi Agencia
                  </a>
                </div>
                
                <p style="font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px;">
                  * Este es un enlace de seguridad de un solo uso. Si ya completaste la configuración en el navegador, ignora este correo.
                </p>
              </div>
            `
          })
        });
      }

    } catch (err) {
      console.error('🔥 [Webhook Error]:', err);
      return new Response(JSON.stringify({ error: 'Fallo interno' }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
