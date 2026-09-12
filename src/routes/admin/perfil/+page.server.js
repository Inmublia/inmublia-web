import { fail, redirect } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env as privateEnv } from '$env/dynamic/private';

const stripe = new Stripe(privateEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker, error } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !broker) throw redirect(303, '/login');

  // NUEVO: Cargar configuración del webhook desde la tabla dedicada
  const { data: webhook } = await locals.supabase
    .from('agency_webhooks')
    .select('*')
    .eq('agency_id', user.id)
    .single();

  return { broker, webhook };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    try {
      const user = locals.user;
      if (!user) return fail(401, { formId: 'profile', error: 'Sesión expirada. Vuelve a iniciar sesión.' });

      const formData = await request.formData();
      
      const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
      const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
      const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      const bio = formData.get('bio')?.toString().trim() || null;
      
      const facebook = formData.get('facebook')?.toString().trim() || null;
      const instagram = formData.get('instagram')?.toString().trim() || null;
      const linkedin = formData.get('linkedin')?.toString().trim() || null;
      const tiktok = formData.get('tiktok')?.toString().trim() || null;

      const comisionStr = formData.get('comision_default');
      const comision_default = comisionStr ? parseFloat(comisionStr.toString().trim()) : 5.0;

      if (!nombre_comercial || !whatsapp || !subdominio) {
        return fail(400, { formId: 'profile', error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
      }

      if (isNaN(comision_default) || comision_default < 0 || comision_default > 100) {
        return fail(400, { formId: 'profile', error: 'El porcentaje de comisión debe ser un número válido entre 0 y 100.' });
      }

      const { data: brokerActual, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id, plan_suscripcion')
        .eq('auth_user_id', user.id)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { formId: 'profile', error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      const updatePayload = {
        nombre_comercial, whatsapp, subdominio, bio,
        facebook, instagram, linkedin, tiktok,
        comision_default 
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

        if (uploadError) return fail(400, { formId: 'profile', error: `FALLO EN STORAGE: ${uploadError.message}` });

        const { data: { publicUrl } } = locals.supabase.storage.from('agencias').getPublicUrl(fileName);
        updatePayload.avatar_url = publicUrl;
      }

      const { data: checkUpdate, error: updateError } = await locals.supabase
        .from('brokers').update(updatePayload).eq('id', brokerActual.id).select();

      if (updateError) {
        if (updateError.code === '23505') return fail(400, { formId: 'profile', error: 'El subdominio ya existe.' });
        return fail(500, { formId: 'profile', error: `FALLO EN BD: ${updateError.message}` });
      }

      if (!checkUpdate || checkUpdate.length === 0) {
        return fail(500, { formId: 'profile', error: 'Fallo silencioso: La actualización no se reflejó.' });
      }

      // Retornamos el formId para que Svelte sepa qué alerta activar
      return { formId: 'profile', success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { formId: 'profile', error: `CRASH CRÍTICO: ${err.message}` });
    }
  },

  // NUEVO: Acción nombrada y refactorizada para usar la tabla segura
  guardarWebhook: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const endpoint_url = formData.get('endpoint_url')?.toString().trim();
    const is_active = true;

    if (!endpoint_url) {
       // Si el usuario vacía el input y guarda, eliminamos el webhook.
       const { error: deleteError } = await locals.supabase
         .from('agency_webhooks')
         .delete()
         .eq('agency_id', user.id);
         
       if (deleteError) return fail(500, { formId: 'webhook', error: 'No se pudo eliminar el webhook.' });
       return { formId: 'webhook', success: true };
    }

    try {
      new URL(endpoint_url);
    } catch {
      return fail(400, { formId: 'webhook', error: 'La URL es inválida. Debe incluir http:// o https://' });
    }

    const { error } = await locals.supabase
      .from('agency_webhooks')
      .upsert({ 
        agency_id: user.id, 
        endpoint_url, 
        is_active 
      }, { onConflict: 'agency_id' });
      
    if (error) {
      console.error("Error BD Webhook:", error);
      return fail(500, { formId: 'webhook', error: 'Error al conectar base de datos.' });
    }
    
    return { formId: 'webhook', success: true };
  },

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

    if (!broker.stripe_customer_id) {
      throw redirect(303, '/admin/planes');
    }

    let portalUrl;

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: broker.stripe_customer_id,
        return_url: `https://${broker.subdominio}.inmublia.com/admin/perfil`,
      });
      
      portalUrl = portalSession.url;
    } catch (err) {
      console.error("Error real de Stripe:", err);
      return fail(500, { error: err.message || 'El portal de Stripe no respondió.' });
    }

    throw redirect(303, portalUrl);
  }
};
