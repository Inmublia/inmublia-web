// src/lib/server/leads-processor.js

export async function procesarLeadsEntrantes(supabaseAdmin) {
  // 1. Extraer lote de webhooks pendientes (Máximo 50 por ciclo para evitar timeouts)
  const { data: webhooks, error: fetchErr } = await supabaseAdmin
    .from('inbound_webhooks_raw')
    .select('id, portal, payload_jsonb')
    .eq('estatus', 'pendiente')
    .order('creado_en', { ascending: true })
    .limit(50);

  if (fetchErr || !webhooks?.length) return 0;

  // 2. Bloquear lote en proceso para evitar Race Conditions si el cron se solapa
  const ids = webhooks.map(w => w.id);
  await supabaseAdmin.from('inbound_webhooks_raw')
    .update({ estatus: 'procesando' })
    .in('id', ids);

  let procesados = 0;

  for (const hook of webhooks) {
    try {
      const { portal, payload_jsonb: payload } = hook;
      let leadData = null;

      // 3. Mapeo estructural según la última doc de cada API
      if (portal === 'easybroker') {
        // En EasyBroker, el webhook de lead contiene contact y property_id
        leadData = {
          nombre: payload.contact?.name || 'Prospecto EB',
          correo: payload.contact?.email?.trim(),
          telefono: payload.contact?.phone?.trim(),
          origen: 'EasyBroker',
          portal_item_id: payload.property_id
        };
      } else if (portal === 'mercadolibre') {
        // En ML, los leads pueden venir como "questions" o "messages"
        leadData = {
          nombre: payload.sender_name || payload.buyer?.name || 'Prospecto ML',
          correo: payload.buyer?.email?.trim(),
          telefono: payload.buyer?.phone?.number?.trim(),
          origen: 'MercadoLibre',
          portal_item_id: payload.item_id || payload.resource_id
        };
      }

      // Si el webhook es un evento irrelevante (ej. ping de sistema), lo descartamos
      if (!leadData?.portal_item_id || (!leadData.correo && !leadData.telefono)) {
        await supabaseAdmin.from('inbound_webhooks_raw')
          .update({ estatus: 'procesado', error_detalle: 'Evento sin datos de contacto o ID' })
          .eq('id', hook.id);
        continue;
      }

      // 4. Búsqueda de Contexto: ¿A qué broker y propiedad pertenece este ID de portal?
      const { data: publicacion } = await supabaseAdmin.from('portal_publicaciones')
        .select('propiedad_id, broker_id')
        .eq('portal_item_id', String(leadData.portal_item_id))
        .eq('portal', portal)
        .single();

      if (!publicacion) {
        await supabaseAdmin.from('inbound_webhooks_raw')
          .update({ estatus: 'error', error_detalle: 'Propiedad no encontrada en sistema activo' })
          .eq('id', hook.id);
        continue;
      }

      // 5. Idempotencia: Deduplicación estricta para no inflar el CRM
      let queryDeduplicacion = supabaseAdmin.from('leads')
        .select('id')
        .eq('broker_id', publicacion.broker_id)
        .eq('propiedad_id', publicacion.propiedad_id);

      // Buscamos coincidencia exacta por correo o teléfono
      if (leadData.correo && leadData.telefono) {
        queryDeduplicacion = queryDeduplicacion.or(`correo.eq.${leadData.correo},telefono.eq.${leadData.telefono}`);
      } else if (leadData.correo) {
        queryDeduplicacion = queryDeduplicacion.eq('correo', leadData.correo);
      } else {
        queryDeduplicacion = queryDeduplicacion.eq('telefono', leadData.telefono);
      }

      const { data: leadExistente } = await queryDeduplicacion.maybeSingle();

      if (leadExistente) {
        await supabaseAdmin.from('inbound_webhooks_raw')
          .update({ estatus: 'duplicado' })
          .eq('id', hook.id);
        continue;
      }

      // 6. Inserción al CRM
      await supabaseAdmin.from('leads').insert([{
        broker_id: publicacion.broker_id,
        propiedad_id: publicacion.propiedad_id,
        nombre: leadData.nombre,
        correo: leadData.correo || null,
        telefono: leadData.telefono || null,
        origen: leadData.origen,
        estado: 'nuevo',
        creado_en: new Date().toISOString()
      }]);

      await supabaseAdmin.from('inbound_webhooks_raw')
        .update({ estatus: 'procesado' })
        .eq('id', hook.id);

      procesados++;

    } catch (err) {
      console.error(`[LEADS PROCESSOR] Error en hook ${hook.id}:`, err);
      await supabaseAdmin.from('inbound_webhooks_raw')
        .update({ estatus: 'error', error_detalle: err.message })
        .eq('id', hook.id);
    }
  }

  return procesados;
}
