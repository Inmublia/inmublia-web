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

  // Cargamos la matriz lógica del SaaS. Si no existe un plan asignado, forzamos un fallback seguro.
  const planActual = broker.plan_suscripcion || 'basico';
  const planConfig = PLANES_CONFIG?.[planActual] || { templates_autorizados: ['classic', 'clean', 'modern', 'editorial', 'luxury', 'cinematic'] };

  return { broker, planConfig };
}

export const actions = {
  // Acción Principal: Perfil, Imágenes y Templates
  updateProfile: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
    const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
    const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const bio = formData.get('bio')?.toString().trim() || null;
    const instagram = formData.get('instagram')?.toString().trim() || null;
    const linkedin = formData.get('linkedin')?.toString().trim() || null;
    
    // Captura estricta del template seleccionado desde el formulario frontend
    const template_seleccionado = formData.get('template_seleccionado')?.toString().trim();

    if (!nombre_comercial || !whatsapp || !subdominio) {
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // 1. Obtener datos actuales del broker para validar reglas de negocio SaaS
    const { data: brokerActual } = await locals.supabase
      .from('brokers')
      .select('id, plan_suscripcion')
      .eq('email', user.email)
      .single();
      
    if (!brokerActual) return fail(403, { error: 'Perfil no autorizado.' });

    // Validar Template seleccionado contra el Plan del usuario (Blindado)
    if (template_seleccionado && PLANES_CONFIG) {
      const planSaaS = PLANES_CONFIG[brokerActual.plan_suscripcion || 'basico'];
      if (planSaaS && planSaaS.templates_autorizados && !planSaaS.templates_autorizados.includes(template_seleccionado)) {
        return fail(403, { error: `Tu nivel de suscripción (${brokerActual.plan_suscripcion}) no cubre la plantilla: ${template_seleccionado}` });
      }
    }

    // Construcción del Payload
    const updatePayload = {
      nombre_comercial,
      whatsapp,
      subdominio,
      bio,
      instagram,
      linkedin
    };

    // 🛡️ FIX QUIRÚRGICO: Inyección forzada a la base de datos
    // Aseguramos que la BD reciba la orden de actualización, cubriendo ambos posibles nombres de columna.
    if (template_seleccionado) {
      updatePayload.template_seleccionado = template_seleccionado;
      updatePayload.template = template_seleccionado; // Retrocompatibilidad por si tu esquema original usa "template"
    }

    // 2. Subida Segura de Avatar al Storage
    const avatarFile = formData.get('avatar');
    if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${brokerActual.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await locals.supabase
        .storage
        .from('agencias')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) return fail(400, { error: `No se pudo subir la foto: ${uploadError.message}` });

      const { data: { publicUrl } } = locals.supabase.storage.from('agencias').getPublicUrl(fileName);
      updatePayload.avatar_url = publicUrl;
    }

    // 3. Persistir en Base de Datos
    const { error: updateError } = await locals.supabase
      .from('brokers')
      .update(updatePayload)
      .eq('id', brokerActual.id);

    if (updateError) {
      if (updateError.code === '23505') return fail(400, { error: 'Ese enlace (subdominio) ya está registrado.' });
      return fail(500, { error: `Error guardando datos en DB: ${updateError.message}` });
    }

    return { success: true };
  },

  // Acción Secundaria Independiente: Webhook
  actualizarWebhook: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;

    const { error } = await locals.supabase
      .from('brokers')
      .update({ webhook_url })
      .eq('email', user.email);

    if (error) return fail(500, { error: `Error guardando webhook: ${error.message}` });
    return { success: true };
  }
};
