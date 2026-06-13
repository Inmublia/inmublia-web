import { fail, redirect } from '@sveltejs/kit';
import { PLANES_CONFIG } from '$lib/config/plans';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker, error } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error || !broker) throw redirect(303, '/login');

  const planActual = broker.plan_suscripcion || 'basico';
  const planConfig = PLANES_CONFIG?.[planActual] || { 
    templates_autorizados: ['classic', 'clean', 'modern', 'editorial', 'luxury', 'cinematic'] 
  };

  // Extracción directa de la base de datos de la primera propiedad del broker
  const { data: propiedad } = await locals.supabase
    .from('propiedades')
    .select('slug')
    .eq('broker_id', broker.id)
    .limit(1)
    .maybeSingle();

  return { 
    broker, 
    planConfig,
    previewSlug: propiedad?.slug || 'propiedad-demo'
  };
}

export const actions = {
  updateTemplate: async ({ request, locals }) => {
    try {
      const user = locals.user;
      if (!user) return fail(401, { error: 'Sesión expirada. Vuelve a iniciar sesión.' });

      const formData = await request.formData();
      const template_seleccionado = formData.get('template_seleccionado')?.toString().trim();

      if (!template_seleccionado) {
        return fail(400, { error: 'Debe seleccionar una plantilla válida.' });
      }

      const { data: brokerActual, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id, plan_suscripcion')
        .eq('email', user.email)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      if (PLANES_CONFIG) {
        const planSaaS = PLANES_CONFIG[brokerActual.plan_suscripcion || 'basico'];
        if (planSaaS && planSaaS.templates_autorizados && !planSaaS.templates_autorizados.includes(template_seleccionado)) {
          return fail(403, { error: `Suscripción insuficiente para la plantilla: ${template_seleccionado}` });
        }
      }

      const updatePayload = {
        template_seleccionado: template_seleccionado,
        template: template_seleccionado 
      };

      const { data: checkUpdate, error: updateError } = await locals.supabase
        .from('brokers').update(updatePayload).eq('id', brokerActual.id).select();

      if (updateError) {
        return fail(500, { error: `FALLO EN BD: ${updateError.message}` });
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `CRASH CRÍTICO: ${err.message}` });
    }
  }
};
