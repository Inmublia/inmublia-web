// src/routes/api/webhooks/[portal]/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';

// Motor criptográfico nativo de Edge (Sin dependencias de Node.js)
async function hmacSHA256(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', 
    encoder.encode(secret), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validarFirmaWebhook(portal, request, bodyStr) {
  if (portal === 'mercadolibre' && privateEnv.ML_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-signature') || '';
    const parts = signature.split(',');
    let ts = '', v1 = '';
    for (const p of parts) {
      if (p.startsWith('ts=')) ts = p.substring(3);
      if (p.startsWith('v1=')) v1 = p.substring(3);
    }
    if (!ts || !v1) return false;
    // MercadoLibre firma el payload junto con el timestamp
    const expected = await hmacSHA256(privateEnv.ML_WEBHOOK_SECRET, `${ts}${bodyStr}`);
    return v1 === expected;
  }
  
  if (portal === 'easybroker' && privateEnv.EB_WEBHOOK_SECRET) {
    const signature = request.headers.get('x-easybroker-signature') || '';
    const expected = await hmacSHA256(privateEnv.EB_WEBHOOK_SECRET, bodyStr);
    return signature === `sha256=${expected}`;
  }
  
  return false;
}

export async function POST({ params, request, platform }) {
  const { portal } = params;
  const PORTALES_VALIDOS = ['mercadolibre', 'easybroker', 'proppit'];
  
  if (!PORTALES_VALIDOS.includes(portal)) {
    return json({ error: 'Portal no soportado' }, { status: 400 });
  }

  const bodyStr = await request.text();

  // 1. Validación de seguridad (Zero-Trust)
  const esValido = await validarFirmaWebhook(portal, request, bodyStr);
  if (!esValido) {
    console.warn(`[WEBHOOK] Firma inválida rechazada para portal: ${portal}`);
    return json({ error: 'Firma criptográfica inválida' }, { status: 401 });
  }

  // 2. Validación estructural básica
  let payloadJson;
  try {
    payloadJson = JSON.parse(bodyStr);
  } catch (err) {
    return json({ error: 'Payload malformado' }, { status: 400 });
  }

  // 3. Ingesta Asíncrona a la DLQ (Dead Letter Queue)
  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  
  // Guardamos y liberamos la conexión inmediatamente
  const tareaIngesta = supabaseAdmin.from('inbound_webhooks_raw').insert([{
    portal,
    payload_jsonb: payloadJson,
    estatus: 'pendiente'
  }]);

  // Si estamos en Cloudflare, usamos waitUntil para no bloquear el hilo HTTP
  if (platform?.ctx?.waitUntil) {
    platform.ctx.waitUntil(tareaIngesta);
  } else {
    await tareaIngesta;
  }

  // 4. MercadoLibre requiere un 200 OK rápido.
  return json({ success: true, message: 'Evento recibido y encolado' }, { status: 200 });
}
