import { fail, redirect } from '@sveltejs/kit';
import { PLANES_CONFIG } from '$lib/config/plans';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', locals.user.id) // CORRECCIÓN
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
      .eq('auth_user_id', user.id) // CORRECCIÓN
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
  }
};
