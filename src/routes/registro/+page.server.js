// src/routes/registro/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

const STRIPE_PRICES = {
  basico: { mensual: 'price_1UFgBoJHda98KYP8zVxz1V2h', anual: 'price_1UFgCSJHda98KYP8WAfuaRCU' },
  pro:    { mensual: 'price_1UFgDVJHda98KYP8Hvvb7jIU', anual: 'price_1UF3y9JHda98KYP83uVDd0rF' },
  elite:  { mensual: 'price_1UF3vVJHda98KYP8sEBcENHN', anual: 'price_1UF3wrJHda98KYP82p3McSSj' }
};

// 🚀 FIX: Asignador Dinámico de Créditos IA (Valores Ajustados)
const CREDITOS_IA_POR_PLAN = {
  trial: 15,
  basico: 15,
  pro: 125,
  elite: 300
};

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const resend = new Resend(privateEnv.RESEND_API_KEY);

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();
    const agencia = formData.get('agencia')?.toString().trim();
    const subdominio = formData.get('subdominio')?.toString().trim();
    const planId = formData.get('planId')?.toString().trim() || 'trial';
    const ciclo = formData.get('ciclo')?.toString().trim() || 'anual';

    if (!email || !password || !agencia || !subdominio) {
      return fail(400, { error: 'Por favor completa todos los campos.' });
    }

    // 1. Crear identidad en Supabase Auth
    const { data: authData, error: authError } = await locals.supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre_comercial: agencia } }
    });

    if (authError) {
      console.error("🔥 Error Auth:", authError);
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        return fail(400, { error: 'Este correo ya tiene una cuenta. Inicia sesión.' });
      }
      return fail(500, { error: 'No pudimos crear tu cuenta. Verifica tus datos e intenta nuevamente.' });
    }

    // 2. Definir banderas operativas
    const isTrial = planId === 'trial';
    const finalPlan = isTrial ? 'elite' : planId;
    const finalStatus = isTrial ? 'trial' : 'inactiva'; 
    
    const trialEndsAt = new Date();
    if (isTrial) {
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    }
    
    // Asignamos los créditos basados en el plan seleccionado
    const creditosAsignados = CREDITOS_IA_POR_PLAN[planId] || 15;

    // 3. Crear Infraestructura Tenant
    const db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

    const { data: newBroker, error: dbError } = await db.from('brokers').insert({
      auth_user_id: authData.user.id,
      email: email,
      nombre_comercial: agencia,
      subdominio: subdominio,
      plan_suscripcion: finalPlan,
      status_suscripcion: finalStatus,
      trial_ends_at: isTrial ? trialEndsAt.toISOString() : null,
      ia_creditos_disponibles: creditosAsignados // 🚀 FIX: Inyectando los créditos aquí
    }).select('id').single();

    if (dbError) {
      console.error("🔥 Error Creando Agencia:", dbError);
      if (dbError.code === '23505') {
        return fail(400, { error: 'Este subdominio ya está ocupado. Por favor elige otro.' });
      }
      return fail(500, { error: `Falla en BD: ${dbError.message}` });
    }

    // 4. El Correo de Onboarding (Fire and Forget)
    const planNameDisplay = isTrial ? 'Trial Élite (14 días)' : `Plan ${finalPlan.charAt(0).toUpperCase() + finalPlan.slice(1)}`;
    const loginUrl = `https://${subdominio}.inmublia.com/login`;

    // 🚀 UX/UI FIX: Obra de arte en HTML para el correo de bienvenida. Diseño oscuro, elegante y psicológicamente potente.
    resend.emails.send({
      from: 'Inmublia <bienvenida@inmublia.com>', 
      to: email,
      subject: `Bienvenido a la élite inmobiliaria, ${agencia}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 60px 20px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #09090b;">
                  
                  <!-- Logo Inmublia en caja blanca (igual que el login) -->
                  <tr>
                    <td align="center" style="padding-bottom: 40px;">
                      <div style="background-color: #ffffff; padding: 16px 32px; border-radius: 16px; display: inline-block; border: 1px solid rgba(255,255,255,0.1);">
                        <!-- Es crucial usar una URL absoluta para los correos -->
                        <img src="https://inmublia.com/logo.png" alt="Inmublia" style="height: 36px; display: block; border: 0;">
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Título de Impacto -->
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.02em; line-height: 1.2;">
                        Tu infraestructura comercial<br>
                        <span style="color: #6366f1;">está en línea.</span>
                      </h1>
                    </td>
                  </tr>

                  <!-- Cuerpo del Mensaje -->
                  <tr>
                    <td style="color: #a1a1aa; font-size: 16px; line-height: 1.6; padding-bottom: 40px; text-align: center;">
                      Hola, <strong style="color: #ffffff;">${agencia}</strong>.<br><br>
                      Has dado el paso definitivo para escalar tus operaciones. Tu entorno de trabajo en Inmublia ha sido aprovisionado con éxito y está listo para recibir tu inventario.
                    </td>
                  </tr>

                  <!-- Tarjeta de Credenciales Oscura -->
                  <tr>
                    <td style="background-color: #111827; border: 1px solid #27272a; border-radius: 24px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
                      <p style="margin: 0 0 24px 0; font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; text-align: center;">Tus Credenciales Seguras</p>
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Enlace de Consola</p>
                            <p style="margin: 0;"><a href="${loginUrl}" style="color: #6366f1; font-size: 16px; text-decoration: none; font-weight: 700;">${loginUrl}</a></p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 16px;">
                            <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Usuario Asignado</p>
                            <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 600;">${email}</p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Suscripción Activa</p>
                            <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 700;">${planNameDisplay}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Botón Call to Action -->
                  <tr>
                    <td align="center" style="padding: 48px 0;">
                      <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; font-weight: 700; font-size: 16px; text-decoration: none; padding: 18px 40px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);">
                        Acceder al Sistema
                      </a>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top: 32px; border-top: 1px solid #27272a;">
                      <p style="color: #52525b; font-size: 12px; line-height: 1.6; font-weight: 500; margin: 0;">
                        &copy; 2026 Inmublia Technologies. Secured Platform.<br>
                        Si no solicitaste la creación de esta infraestructura, por favor ignora este correo.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }).catch(e => console.error("Error enviando email de bienvenida:", e));

    // 5. DIRECCIONAMIENTO DUAL
    if (isTrial) {
      throw redirect(303, `https://${subdominio}.inmublia.com/admin`);
    } else {
      const priceId = STRIPE_PRICES[planId]?.[ciclo];
      if (!priceId) return fail(400, { error: 'El plan seleccionado no está disponible en este momento.' });

      try {
        const session = await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          metadata: { broker_id: newBroker.id }, 
          success_url: `https://${subdominio}.inmublia.com/admin/perfil?alerta=pago_exitoso`,
          cancel_url: `https://inmublia.com/planes`
        });
        
        throw redirect(303, session.url);
      } catch (err) {
        if (err.status === 303) throw err;
        console.error("Stripe Error:", err);
        return fail(500, { error: 'Error de conexión con la pasarela de pagos. Intenta de nuevo.' });
      }
    }
  }
};
