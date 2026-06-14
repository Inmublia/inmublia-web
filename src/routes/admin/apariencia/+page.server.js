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

  // Extracción directa de base de datos de la primera propiedad activa del Broker
  const { data: propiedades, error: propError } = await locals.supabase
    .from('propiedades')
    .select('slug')
    .eq('broker_id', broker.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (propError) {
    console.error("🔥 Error extrayendo propiedades de la BD en apariencia:", propError);
  }

  // Si tiene propiedades reales usa el slug real, si no, usa el interceptor seguro 'propiedad-demo'
  const previewSlug = (propiedades && propiedades.length > 0) ? propiedades[0].slug : 'propiedad-demo';

  return { 
    broker, 
    planConfig,
    previewSlug
  };
}

export const actions = {
  updateTemplate: async ({ request, locals }) => {
    try {
      const user = locals.user;
      if (!user) return fail(401, { error: 'Sesión expirada. Vuelve a iniciar sesión.' });

      const formData = await request.formData();
      const template_seleccionado = formData.get('template_seleccionado')?.toString().trim();
      const template_id_catalog = formData.get('template_id_catalog')?.toString().trim();

      if (!template_seleccionado || !template_id_catalog) {
        return fail(400, { error: 'Debe seleccionar ambas plantillas (Portal y Landing Page).' });
      }

      const { data: brokerActual, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id, plan_suscripcion')
        .eq('email', user.email)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      if (PLANES_CONFIG) {
        const planSaaS = PLANES_CONFIG[brokerActual.plan_suscripcion || 'basico'];
        const ambasAutorizadas = planSaaS && 
                                 planSaaS.templates_autorizados && 
                                 planSaaS.templates_autorizados.includes(template_seleccionado) &&
                                 planSaaS.templates_autorizados.includes(template_id_catalog);

        if (!ambasAutorizadas) {
          return fail(403, { error: `Suscripción insuficiente para las plantillas seleccionadas.` });
        }
      }

      const updatePayload = {
        template_seleccionado: template_seleccionado,
        template: template_seleccionado, 
        template_id_catalog: template_id_catalog 
      };

      const { error: updateError } = await locals.supabase
        .from('brokers')
        .update(updatePayload)
        .eq('id', brokerActual.id);

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
