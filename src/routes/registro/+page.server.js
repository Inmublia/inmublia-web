// src/routes/registro/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

// 🚀 Los IDs de Stripe de Inmublia
const STRIPE_PRICES = {
  basico: { mensual: 'price_1UFgBoJHda98KYP8zVxz1V2h', anual: 'price_1UFgCSJHda98KYP8WAfuaRCU' },
  pro:    { mensual: 'price_1UFgDVJHda98KYP8Hvvb7jIU', anual: 'price_1UF3y9JHda98KYP83uVDd0rF' },
  elite:  { mensual: 'price_1UF3vVJHda98KYP8sEBcENHN', anual: 'price_1UF3wrJHda98KYP82p3McSSj' }
};

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

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

    // 3. Crear Infraestructura Tenant (Service Role para bypass de RLS)
    const db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

    const { data: newBroker, error: dbError } = await db.from('brokers').insert({
      auth_user_id: authData.user.id,
      email: email,
      nombre_comercial: agencia,
      subdominio: subdominio,
      plan_suscripcion: finalPlan,
      status_suscripcion: finalStatus,
      trial_ends_at: isTrial ? trialEndsAt.toISOString() : null
    }).select('id').single();

    if (dbError) {
      console.error("🔥 Error Creando Agencia:", dbError);
      if (dbError.code === '23505') {
        return fail(400, { error: 'Este subdominio ya está ocupado. Por favor elige otro.' });
      }
      return fail(500, { error: 'Error al inicializar tu entorno de trabajo.' });
    }

    // 4. DIRECCIONAMIENTO DUAL
    if (isTrial) {
      // Vía Rápida: Lo metemos directo a su nuevo dashboard
      throw redirect(303, `https://${subdominio}.inmublia.com/admin`);
    } else {
      // Vía Premium: Lo mandamos al cajero de Stripe
      const priceId = STRIPE_PRICES[planId]?.[ciclo];
      
      if (!priceId) {
         return fail(400, { error: 'El plan seleccionado no está disponible en este momento.' });
      }

      try {
        const session = await stripe.checkout.sessions.create({
          customer_email: email,
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          metadata: { broker_id: newBroker.id }, // El webhook lo usará para activar la cuenta
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
