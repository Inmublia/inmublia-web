// src/routes/api/webhooks/portales/[portal]/+server.js
import { json, error as svelteError } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';

async function hmacSHA256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validarFirmaWebhook(portal, request, body) {
  if (portal === 'mercadolibre' && privateEnv.ML_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-signature') || '';
    const parts = signature.split(',');
    let ts = '', v1 = '';
    parts.forEach(p => {
      if (p.startsWith('ts=')) ts = p.substring(3);
      if (p.startsWith('v1=')) v1 = p.substring(3);
    });
    if (!ts || !v1) return false;
    const expected = await hmacSHA256(privateEnv.ML_WEBHOOK_SECRET, `${ts}${body}`);
    return v1 === expected;
  }
  if (portal === 'easybroker' && privateEnv.EB_WEBHOOK_SECRET) {
    const signature = request.headers.get('X-EasyBroker-Signature');
    const expected = await hmacSHA256(privateEnv.EB_WEBHOOK_SECRET, body);
    return signature === `sha256=${expected}`;
  }
  return false;
}

export async function POST({ params, request }) {
  const { portal } = params;
  const body = await request.text(); 

  const esValido = await validarFirmaWebhook(portal, request, body);
  if (!esValido) return json({ error: 'Unauthorized' }, { status: 401 });

  let payload;
  try { payload = JSON.parse(body); } 
  catch { return json({ error: 'Body no es JSON válido' }, { status: 400 }); }

  let leadData = null;
  if (portal === 'easybroker') {
    leadData = { nombre: payload.contact?.name || 'Prospecto EB', correo: payload.contact?.email, telefono: payload.contact?.phone, origen: 'EasyBroker', portal_item_id: payload.property_id };
  } else if (portal === 'mercadolibre') {
    leadData = { nombre: payload.buyer?.name || 'Prospecto ML', correo: payload.buyer?.email, telefono: payload.buyer?.phone?.number, origen: 'MercadoLibre', portal_item_id: payload.item_id };
  }

  if (!leadData?.portal_item_id) return json({ ignored: true });

  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

  const { data: publicacion } = await supabaseAdmin.from('portal_publicaciones')
    .select('propiedad_id, broker_id').eq('portal_item_id', leadData.portal_item_id).eq('portal', portal).single();

  if (!publicacion) return json({ warning: 'Propiedad inactiva' });

  if (leadData.correo) {
    const { data: leadExistente } = await supabaseAdmin.from('leads')
      .select('id').eq('broker_id', publicacion.broker_id).eq('propiedad_id', publicacion.propiedad_id).eq('correo', leadData.correo).maybeSingle();
    if (leadExistente) return json({ success: true, message: 'Lead duplicado evitado' });
  }

  await supabaseAdmin.from('leads').insert([{
    broker_id: publicacion.broker_id, propiedad_id: publicacion.propiedad_id, nombre: leadData.nombre, correo: leadData.correo, telefono: leadData.telefono, origen: leadData.origen, estado: 'nuevo', creado_en: new Date().toISOString()
  }]);

  return json({ success: true });
}
