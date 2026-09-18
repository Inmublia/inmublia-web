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

    resend.emails.send({
      from: 'Inmublia <bienvenida@inmublia.com>', 
      to: email,
      subject: `¡Bienvenido a Inmublia, ${agencia}!`,
      html: `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e1b4b;">Tu entorno está listo.</h2>
          <p>Hola, <strong>${agencia}</strong>.</p>
          <p>Gracias por elegir Inmublia. Tu infraestructura inmobiliaria ha sido desplegada con éxito. Guarda este correo; aquí tienes la información vital de tu cuenta:</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Enlace de acceso a consola:</strong><br> <a href="${loginUrl}" style="color: #4f46e5;">${loginUrl}</a></p>
            <p style="margin: 0 0 10px 0;"><strong>Usuario:</strong><br> ${email}</p>
            <p style="margin: 0;"><strong>Plan Actual:</strong><br> ${planNameDisplay}</p>
          </div>

          <p>Para ingresar a la consola, haz clic en el enlace de acceso e introduce la contraseña que creaste en el registro.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${loginUrl}" style="background-color: #0f172a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a mi Consola</a>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-top: 40px; text-align: center;">
            Inmublia Technologies.<br>
            Si tienes dudas, simplemente responde a este correo.
          </p>
        </div>
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
