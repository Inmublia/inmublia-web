import { fail, redirect } from '@sveltejs/kit';
import { PLANES_CONFIG } from '$lib/config/plans';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // 1. Obtenemos el broker
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

  // 2. Extracción directa y robusta de la última propiedad del broker
  const { data: propiedades, error: propError } = await locals.supabase
    .from('propiedades')
    .select('slug')
    .eq('broker_id', broker.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (propError) {
    console.error("🔥 Error de BD al extraer propiedades para el preview:", propError.message);
  }

  // 3. Asignación del Preview (Prioridad absoluta al dato real)
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
        return fail(400, { error: 'Datos incompletos. Faltan plantillas por seleccionar.' });
      }

      // Validamos el broker y su plan real actual
      const { data: brokerActual, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id, plan_suscripcion')
        .eq('email', user.email)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      // 🔥 LÓGICA DE INGENIERÍA: Validación Jerárquica de Permisos
      // Asignamos un valor numérico a los planes para facilitar la comparación
      const niveles = { 'basico': 1, 'pro': 2, 'elite': 3 };
      const planUsuarioStr = (brokerActual.plan_suscripcion || 'basico').toLowerCase();
      const nivelUsuario = niveles[planUsuarioStr] || 1;

      // Determinamos el nivel requerido por el template del Portal
      let reqNivelPortal = 1;
      if (['modern', 'editorial'].includes(template_seleccionado)) reqNivelPortal = 2;
      if (['luxury', 'cinematic'].includes(template_seleccionado)) reqNivelPortal = 3;

      // Determinamos el nivel requerido por el template de la Landing Page
      let reqNivelLanding = 1;
      if (template_id_catalog.includes('pro_')) reqNivelLanding = 2;
      if (template_id_catalog.includes('elite_')) reqNivelLanding = 3;

      // Si el nivel del usuario es menor al requerido por cualquiera de las dos plantillas, bloqueamos
      if (nivelUsuario < reqNivelPortal || nivelUsuario < reqNivelLanding) {
        return fail(403, { error: 'Tu nivel de suscripción es insuficiente para guardar estos diseños.' });
      }

      // Si pasa la validación, procedemos a actualizar
      const updatePayload = {
        template_seleccionado: template_seleccionado,
        template: template_seleccionado, // Columna de retrocompatibilidad
        template_id_catalog: template_id_catalog 
      };

      const { error: updateError } = await locals.supabase
        .from('brokers')
        .update(updatePayload)
        .eq('id', brokerActual.id);

      if (updateError) {
        return fail(500, { error: `Fallo al escribir en la base de datos: ${updateError.message}` });
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `Excepción no controlada: ${err.message}` });
    }
  }
};
