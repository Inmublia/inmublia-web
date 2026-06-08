import { fail, redirect } from '@sveltejs/kit';
import { PLANES_CONFIG } from '$lib/config/plans';

export const actions = {
  guardarTemplate: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const templateSolicitado = formData.get('template_id');

    // 1. Consultamos el estado real del plan en base de datos
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, plan_suscripcion')
      .eq('email', user.email)
      .single();

    if (!broker) return fail(403, { error: 'Perfil no encontrado.' });

    // 2. Cruzamos contra la matriz lógica del Cerebro SaaS
    const configuracionDelPlan = PLANES_CONFIG[broker.plan_suscripcion];
    
    if (!configuracionDelPlan.templates_autorizados.includes(templateSolicitado)) {
      return fail(403, { error: 'Tu nivel de suscripción actual no autoriza el uso de esta plantilla.' });
    }

    // 3. Si pasa la auditoría de seguridad, se autoriza el cambio en Supabase
    const { error } = await locals.supabase
      .from('brokers')
      .update({ template_seleccionado: templateSolicitado })
      .eq('id', broker.id);

    if (error) return fail(500, { error: 'Error de conectividad al guardar.' });

    return { success: true };
  }
};
