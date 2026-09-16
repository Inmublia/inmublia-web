// src/routes/admin/perfil/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker, error } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (error || !broker) throw redirect(303, '/login');

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

      const plan = (brokerActual.plan_suscripcion || 'basico').toLowerCase().trim();
      const isPro = plan === 'pro' || plan === 'profesional' || plan === 'elite';
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

      return { formId: 'profile', success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { formId: 'profile', error: `CRASH CRÍTICO: ${err.message}` });
    }
  },

  guardarWebhook: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const endpoint_url = formData.get('endpoint_url')?.toString().trim();
    const is_active = true;

    if (!endpoint_url) {
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
      .upsert({ agency_id: user.id, endpoint_url, is_active }, { onConflict: 'agency_id' });
      
    if (error) return fail(500, { formId: 'webhook', error: 'Error al conectar base de datos.' });
    
    return { formId: 'webhook', success: true };
  },

  // 🚀 NUEVA ACCIÓN: PING SEGURO DESDE EL SERVIDOR (Adiós errores de CORS)
  probarWebhook: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const url = formData.get('endpoint_url');

    // Validación básica de URL
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return fail(400, { error: 'Solo se permiten URLs HTTP/HTTPS válidas.' });
      }
    } catch {
      return fail(400, { error: 'El formato de la URL es inválido.' });
    }

    try {
      // Ejecuta la petición desde SvelteKit (Servidor) hacia el CRM del cliente
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Inmublia-Test': 'true'
        },
        body: JSON.stringify({ 
          test: true, 
          source: 'inmublia_admin_ping', 
          mensaje: '¡Ping de prueba exitoso desde Inmublia!',
          timestamp: Date.now() 
        }),
        // Timeout protector para que si el servidor del cliente está caído, no se cuelgue nuestra app
        signal: AbortSignal.timeout(8000) 
      });
      
      return { 
        success: true, 
        status: res.status, 
        ok: res.ok 
      };
      
    } catch (err) {
      console.error("[Webhook Test Error]:", err.message);
      
      // Controlar Timeout explícitamente para dar mejor feedback
      if (err.name === 'TimeoutError') {
         return fail(504, { error: 'Tiempo de espera agotado. El servidor destino tardó más de 8 segundos en responder.' });
      }
      return fail(500, { error: `Rechazo de conexión: ${err.message}` });
    }
  }
};
