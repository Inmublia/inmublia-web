export const actions = {
  updateTemplate: async ({ request, locals }) => {
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
        .eq('email', user.email)
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

      // 1. ACTUALIZAMOS AL BROKER
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

      // 🔥 2. MAGIA: ACTUALIZACIÓN MASIVA DE INVENTARIO
      // Esto sobreescribe el template de TODAS las casas de este broker al instante.
      const { error: propUpdateError } = await locals.supabase
        .from('propiedades')
        .update({ template_id: template_id_catalog })
        .eq('broker_id', brokerActual.id);

      if (propUpdateError) {
        console.error("🔥 Error actualizando inventario masivo:", propUpdateError);
        // No fallamos toda la petición si esto falla, pero lo registramos
      }

      return { success: true };

    } catch (err) {
      console.error("🔥 CRASH DEL SERVIDOR:", err);
      return fail(500, { error: `Excepción no controlada: ${err.message}` });
    }
  }
};
