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

  // Buscamos 1 propiedad real para que los enlaces de preview estén vivos
  const { data: propiedades, error: propError } = await locals.supabase
    .from('propiedades')
    .select('slug')
    .eq('broker_id', broker.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (propError) {
    console.error("🔥 Error extrayendo propiedades de la BD:", propError.message);
  }

  // Si hay propiedad, usamos su slug. Si no, usamos 'propiedad-demo' como fallback seguro
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
      // Capturamos AMBAS selecciones
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

      // LÓGICA DE VALIDACIÓN POR PESO/JERARQUÍA DE PLAN
      const niveles = { 'basico': 1, 'pro': 2, 'elite': 3 };
      const planUsuarioStr = (brokerActual.plan_suscripcion || 'basico').toLowerCase();
      const nivelUsuario = niveles[planUsuarioStr] || 1;

      // Evaluamos qué nivel exige el template global
      let reqNivelPortal = 1;
      if (['modern', 'editorial'].includes(template_seleccionado)) reqNivelPortal = 2;
      if (['luxury', 'cinematic'].includes(template_seleccionado)) reqNivelPortal = 3;

      // Evaluamos qué nivel exige la landing page
      let reqNivelLanding = 1;
      if (template_id_catalog.includes('pro_')) reqNivelLanding = 2;
      if (template_id_catalog.includes('elite_')) reqNivelLanding = 3;

      if (nivelUsuario < reqNivelPortal || nivelUsuario < reqNivelLanding) {
        return fail(403, { error: 'Tu nivel de suscripción es insuficiente para guardar estos diseños.' });
      }

      // Guardamos en la base de datos de manera explícita y real
      const updatePayload = {
        template_seleccionado: template_seleccionado,
        template: template_seleccionado, // Retenemos esto si otras partes de tu app aún lo usan
        template_id_catalog: template_id_catalog 
      };

      const { error: updateError } = await locals.supabase
        .from('brokers')
        .update(updatePayload)
        .eq('id', brokerActual.id);

      if (updateError) {
        return fail(500, { error: `FALLO AL GUARDAR EN BD: ${updateError.message}` });
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `Excepción no controlada: ${err.message}` });
    }
  }
};
