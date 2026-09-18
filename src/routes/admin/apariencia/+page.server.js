// src/routes/admin/apariencia/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { PLANES_CONFIG } from '$lib/config/plans';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // 🚀 BYPASS RLS: Inyectamos Cliente Dios para el God Mode
  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Buscamos el ID correcto (El tuyo, o el del cliente si estás impersonando)
  let query = db.from('brokers').select(`*, propiedades (slug)`);
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', user.id);
  }

  const { data: brokerData, error } = await query.single();

  if (error || !brokerData) {
    console.error("🔥 Error crítico extrayendo broker:", error);
    throw redirect(303, '/login');
  }

  const { propiedades, ...broker } = brokerData;

  const planActual = broker.plan_suscripcion || 'basico';
  const planConfig = PLANES_CONFIG?.[planActual] || { 
    templates_autorizados: ['classic', 'clean', 'modern', 'editorial', 'luxury', 'cinematic'] 
  };

  const previewSlug = (propiedades && propiedades.length > 0) ? propiedades[0].slug : 'propiedad-demo';

  return { 
    broker, 
    planConfig,
    previewSlug
  };
}

export const actions = {
  updateTemplate: async ({ request, locals }) => {
    // 🚀 BLOQUEO DE SEGURIDAD MODO LECTURA
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización: No puedes alterar la apariencia del portal del cliente.' });
    
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
        .eq('auth_user_id', user.id)
        .single();
        
      if (brokerError || !brokerActual) return fail(403, { error: `No se pudo obtener tu perfil: ${brokerError?.message}` });

      const niveles = { 'basico': 1, 'pro': 2, 'elite': 3 };
      const planUsuarioStr = (brokerActual.plan_suscripcion || 'basico').toLowerCase();
      const nivelUsuario = niveles[planUsuarioStr] || 1;

      let reqNivelPortal = 1;
      if (['modern', 'editorial'].includes(template_seleccionado)) reqNivelPortal = 2;
      if (['luxury', 'cinematic'].includes(template_seleccionado)) reqNivelPortal = 3;

      let reqNivelLanding = 1;
      if (template_id_catalog.includes('pro_')) reqNivelLanding = 2;
      if (template_id_catalog.includes('elite_')) reqNivelLanding = 3;

      if (nivelUsuario < reqNivelPortal || nivelUsuario < reqNivelLanding) {
        return fail(403, { error: 'Tu nivel de suscripción es insuficiente para guardar estos diseños.' });
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
        console.error("🔥 Error de Supabase al escribir broker:", updateError);
        return fail(500, { error: `FALLO AL GUARDAR EN BD: ${updateError.message}` });
      }

      const { error: propUpdateError } = await locals.supabase
        .from('propiedades')
        .update({ template_id: template_id_catalog })
        .eq('broker_id', brokerActual.id);

      if (propUpdateError) {
        console.error("🔥 Error actualizando inventario masivo:", propUpdateError);
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `Excepción no controlada: ${err.message}` });
    }
  }
};
