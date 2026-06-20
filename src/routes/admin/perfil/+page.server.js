import { fail, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Usa la versión anclada de tu cuenta
});

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // Búsqueda estricta por ID de Autenticación
  const { data: broker, error } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !broker) throw redirect(303, '/login');

  return { broker };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    try {
      const user = locals.user;
      if (!user) return fail(401, { error: 'Sesión expirada. Vuelve a iniciar sesión.' });

      const formData = await request.formData();
      
      const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
      const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
      const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      const bio = formData.get('bio')?.toString().trim() || null;
      
      const facebook = formData.get('facebook')?.toString().trim() || null;
      const instagram = formData.get('instagram')?.toString().trim() || null;
      const linkedin = formData.get('linkedin')?.toString().trim() || null;
      const tiktok = formData.get('tiktok')?.toString().trim() || null;

      if (!nombre_comercial || !whatsapp || !subdominio) {
        return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
      }

      // Búsqueda estricta por ID de Autenticación
      const { data: brokerActual, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id, plan_suscripcion')
        .eq('auth_user_id', user.id)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      const updatePayload = {
        nombre_comercial, whatsapp, subdominio, bio,
        facebook, instagram, linkedin, tiktok
      };

      const plan = brokerActual.plan_suscripcion || 'basico';
      const isPro = plan === 'pro' || plan === 'elite';
      const isElite = plan === 'elite';

      if (isPro) {
        updatePayload.pixel_fb = formData.get('pixel_fb')?.toString().trim() || null;
        updatePayload.pixel_google = formData.get('pixel_google')?.toString().trim() || null;
      }
      if (isElite) {
        updatePayload.pixel_tiktok = formData.get('pixel_tiktok')?.toString().trim() || null;
      }

      const avatarFile = formData.get('avatar');
      if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${brokerActual.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await locals.supabase
          .storage.from('agencias').upload(fileName, avatarFile, { upsert: true });

        if (uploadError) return fail(400, { error: `FALLO EN STORAGE: ${uploadError.message}` });

        const { data: { publicUrl } } = locals.supabase.storage.from('agencias').getPublicUrl(fileName);
        updatePayload.avatar_url = publicUrl;
      }

      const { data: checkUpdate, error: updateError } = await locals.supabase
        .from('brokers').update(updatePayload).eq('id', brokerActual.id).select();

      if (updateError) {
        if (updateError.code === '23505') return fail(400, { error: 'El subdominio ya existe.' });
        return fail(500, { error: `FALLO EN BD: ${updateError.message}` });
      }

      if (!checkUpdate || checkUpdate.length === 0) {
        return fail(500, { error: 'Fallo silencioso: La actualización no se reflejó.' });
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `CRASH CRÍTICO: ${err.message}` });
    }
  },

  actualizarWebhook: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;

    // Actualización estricta por ID de Autenticación
    const { error } = await locals.supabase
      .from('brokers')
      .update({ webhook_url })
      .eq('auth_user_id', user.id);
      
    if (error) return fail(500, { error: `Error webhook: ${error.message}` });
    return { success: true };
  },

  // LA CONEXIÓN A STRIPE
  abrirPortalFacturacion: async ({ locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('stripe_customer_id, subdominio')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !broker) {
      return fail(500, { error: 'Error al recuperar perfil comercial.' });
    }

    // LÓGICA CORREGIDA: Si no tiene ID de Stripe, lo enviamos al flujo de ventas/planes
    if (!broker.stripe_customer_id) {
      throw redirect(303, '/admin/planes');
    }

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: broker.stripe_customer_id,
        return_url: `https://${broker.subdominio}.inmublia.com/admin/perfil`,
      });

      throw redirect(303, portalSession.url);
    } catch (err) {
      console.error("Error Stripe Portal:", err);
      return fail(500, { error: err.message || 'El portal de facturación no está disponible.' });
    }
  }
};
