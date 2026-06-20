import { fail, redirect } from '@sveltejs/kit';
import { PLANES_CONFIG } from '$lib/config/plans';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // O la versión que uses
});

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  const planActual = broker.plan_suscripcion || 'basico';
  const planConfig = PLANES_CONFIG?.[planActual] || { templates_autorizados: ['classic'] };

  return { broker, planConfig };
};

export const actions = {
  guardarTemplate: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const templateSolicitado = formData.get('template_id');

    // 1. Consultamos el estado real del plan
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, plan_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil no encontrado.' });

    // 2. Cruzamos contra la matriz lógica
    const configuracionDelPlan = PLANES_CONFIG[broker.plan_suscripcion || 'basico'] || { templates_autorizados: ['classic'] };
    
    if (!configuracionDelPlan.templates_autorizados.includes(templateSolicitado)) {
      return fail(403, { error: 'Tu nivel de suscripción actual no autoriza el uso de esta plantilla.' });
    }

    // 3. Autorizamos el cambio
    const { error } = await locals.supabase
      .from('brokers')
      .update({ template_seleccionado: templateSolicitado })
      .eq('id', broker.id);

    if (error) return fail(500, { error: 'Error de conectividad al guardar.' });

    return { success: true };
  },

  // 4. NUEVA ACCIÓN: Conectar con el Customer Portal de Stripe
  abrirPortalFacturacion: async ({ locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'No autorizado' });

    // Necesitamos el ID de Stripe y el subdominio para saber a dónde regresarlo
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('stripe_customer_id, subdominio')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !broker) {
      return fail(500, { error: 'Error al recuperar perfil comercial.' });
    }

    // Si nunca ha pagado, se le manda a los planes
    if (!broker.stripe_customer_id) {
      throw redirect(303, '/admin/planes');
    }

    try {
      // Generamos el ticket del portal
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: broker.stripe_customer_id,
        return_url: `https://${broker.subdominio}.inmublia.com/admin/configuracion`,
      });

      throw redirect(303, portalSession.url);
    } catch (err) {
      console.error("Error Stripe Portal:", err);
      return fail(500, { error: 'El servicio de facturación no está disponible actualmente.' });
    }
  }
};
