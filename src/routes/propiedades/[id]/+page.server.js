import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function load({ params, locals }) {
  const { data: propiedad, error } = await locals.supabase
    .from('propiedades') 
    .select('*, broker:brokers(id, nombre_comercial, avatar_url, whatsapp)')
    .eq('id', params.id)
    .single();

  if (error || !propiedad) {
    return { status: 404, error: 'Propiedad no encontrada' };
  }

  return { propiedad };
}

export const actions = {
  contactar: async ({ request, locals, platform, params }) => {
    const formData = await request.formData();
    
    const leadData = {
      propiedad_id: params.id,
      agency_id: formData.get('agency_id'), 
      nombre: formData.get('nombre')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      telefono: formData.get('telefono')?.toString().trim(),
      mensaje: formData.get('mensaje')?.toString().trim(),
      origen: 'Portal Web Inmublia'
    };

    if (!leadData.nombre || !leadData.email || !leadData.telefono) {
      return fail(400, { formId: 'contacto', error: 'Por favor, llena los campos obligatorios.' });
    }

    const { data: lead, error: dbError } = await locals.supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (dbError) {
      console.error("Error BD Guardando lead:", dbError);
      return fail(500, { formId: 'contacto', error: 'Hubo un problema al enviar tu mensaje.' });
    }

    const { data: brokerDestino, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('auth_user_id')
      .eq('id', leadData.agency_id)
      .single();

    if (brokerError) {
      console.error("Error buscando al broker destino:", brokerError);
    }

    if (brokerDestino?.auth_user_id) {
      if (platform?.context?.waitUntil) {
        platform.context.waitUntil(
          despacharWebhookN8n(locals.supabase, brokerDestino.auth_user_id, lead)
        );
      } else {
        despacharWebhookN8n(locals.supabase, brokerDestino.auth_user_id, lead).catch(console.error);
      }
    }

    return { formId: 'contacto', success: true };
  }
};

// --- EL MOTOR EDGE DE WEBHOOKS (REFACTORIZADO) ---
async function despacharWebhookN8n(supabase, auth_user_id, lead) {
  // 1. DIAGNÓSTICO ESTRICTO DE ENTORNO
  if (!env.N8N_MASTER_WEBHOOK) {
    console.error("🔥 ERROR CRÍTICO: La variable N8N_MASTER_WEBHOOK no está definida en Cloudflare Pages.");
    return;
  }

  // 2. BYPASS DE RLS CON RPC (SECURITY DEFINER)
  // Como el usuario es anónimo, usamos la función SQL para leer la URL de forma segura
  const { data: webhooks, error: webhookError } = await supabase
    .rpc('get_active_webhook', { broker_auth_id: auth_user_id });

  // Validamos si falló o si el array viene vacío
  if (webhookError || !webhooks || webhooks.length === 0) {
    console.log(`Abortado: Sin webhook activo o fallo RLS para agencia: ${auth_user_id}`);
    return; 
  }

  const webhook = webhooks[0]; // Extraemos el primer resultado del RPC

  const payloadStr = JSON.stringify({
    event: 'lead.created',
    timestamp: new Date().toISOString(),
    data: lead
  });

  // 3. Firma Criptográfica
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhook.secret_token),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const n8nPayload = {
    target_url: webhook.endpoint_url,
    signature: signature,
    idempotency_key: `lead_${lead.id}`,
    payload_body: JSON.parse(payloadStr)
  };

  console.log(`Intentando despachar a n8n: ${env.N8N_MASTER_WEBHOOK}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); 

    const res = await fetch(env.N8N_MASTER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal
    });

    if (!res.ok) {
      console.error(`🔥 Error HTTP de n8n. Status: ${res.status}`);
    } else {
      console.log(`✅ Webhook despachado con éxito a n8n para lead ${lead.id}`);
    }

    clearTimeout(timeoutId);
  } catch (err) {
    console.error(`🔥 Fallo de red disparando webhook maestro para ${auth_user_id}:`, err);
  }
}
