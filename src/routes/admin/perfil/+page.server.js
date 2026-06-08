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

  // Cargamos la matriz lógica del SaaS para saber qué templates tiene disponibles
  const planConfig = PLANES_CONFIG[broker.plan_suscripcion] || PLANES_CONFIG['basico'];

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
    const template_seleccionado = formData.get('template_seleccionado')?.toString().trim();

    if (!nombre_comercial || !whatsapp || !subdominio) {
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // 1. Obtener datos actuales del broker para validar reglas de negocio SaaS
    const { data: brokerActual } = await locals.supabase.from('brokers').select('id, plan_suscripcion').eq('email', user.email).single();
    if (!brokerActual) return fail(403, { error: 'Perfil no autorizado.' });

    // Validar Template seleccionado contra el Plan del usuario
    if (template_seleccionado) {
      const planSaaS = PLANES_CONFIG[brokerActual.plan_suscripcion] || PLANES_CONFIG['basico'];
      if (!planSaaS.templates_autorizados.includes(template_seleccionado)) {
        return fail(403, { error: 'Tu nivel de suscripción no cubre la plantilla seleccionada.' });
      }
    }

    const updatePayload = {
      nombre_comercial,
      whatsapp,
      subdominio,
      bio,
      instagram,
      linkedin,
      template_seleccionado: template_seleccionado || undefined
    };

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
      return fail(500, { error: `Error guardando datos: ${updateError.message}` });
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

    if (error) return fail(500, { error: 'Error guardando webhook.' });
    return { success: true };
  }
};
