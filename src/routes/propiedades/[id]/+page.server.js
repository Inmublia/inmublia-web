import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const actions = {
  contacto: async ({ request, locals, platform }) => {
    const formData = await request.formData();
    const leadData = Object.fromEntries(formData);
    
    // 1. Persistencia Inmediata en DB
    const { data: lead, error: dbError } = await locals.supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (dbError) return fail(500, { error: 'No pudimos enviar tu mensaje.' });

    // 2. Ejecución Asíncrona en el Edge (No bloquea la respuesta al usuario)
    if (platform?.context?.waitUntil) {
      platform.context.waitUntil(
        enviarAN8n(locals.supabase, leadData.agency_id, lead)
      );
    } else {
      enviarAN8n(locals.supabase, leadData.agency_id, lead).catch(console.error);
    }

    return { success: true };
  }
};

async function enviarAN8n(supabase, agency_id, lead) {
  // Verificamos configuración del cliente
  const { data: webhook } = await supabase
    .from('agency_webhooks')
    .select('endpoint_url, secret_token')
    .eq('agency_id', agency_id)
    .eq('is_active', true)
    .single();

  if (!webhook) return; 

  const payload = JSON.stringify({
    event: 'lead.created',
    timestamp: new Date().toISOString(),
    data: lead
  });

  // Generación de firma HMAC SHA-256 usando Web Crypto API pura
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhook.secret_token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Delegamos el envío final a TU n8n, pasándole a dónde debe ir
  const n8nPayload = {
    target_url: webhook.endpoint_url,
    signature: signature,
    idempotency_key: `lead_${lead.id}`,
    payload_body: JSON.parse(payload)
  };

  try {
    // AbortController para asegurar que SvelteKit no se cuelgue si n8n tarda
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    await fetch(env.N8N_MASTER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
  } catch (err) {
    console.error(`Error interno comunicando con n8n para agencia ${agency_id}:`, err);
  }
}
