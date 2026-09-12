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
  contactar: async ({ request, locals, params }) => {
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

    // 1. Guardar Lead (Sabemos que esto funciona porque aparecen en tu pipeline)
    const { data: lead, error: dbError } = await locals.supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (dbError) {
      return fail(500, { formId: 'contacto', error: `ERROR_DB_LEAD: ${dbError.message}` });
    }

    // 2. Buscar al broker destino
    const { data: brokerDestino, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('auth_user_id')
      .eq('id', leadData.agency_id)
      .single();

    if (brokerError || !brokerDestino?.auth_user_id) {
      return fail(500, { formId: 'contacto', error: `ERROR_BROKER_DESTINO: No se encontró auth_user_id para agency_id ${leadData.agency_id}` });
    }

    // 3. MODO DEBUG LOUD (Síncrono) - SvelteKit esperará a que esto termine
    const debugResult = await despacharWebhookN8nLoud(locals.supabase, brokerDestino.auth_user_id, lead);

    // Si el resultado no es "OK", mostramos el error técnico en la pantalla al usuario
    if (debugResult !== "OK") {
      return fail(500, { formId: 'contacto', error: `🚨 DIAGNÓSTICO WEBHOOK: ${debugResult}` });
    }

    return { formId: 'contacto', success: true };
  }
};

// --- MOTOR DE WEBHOOKS (MODO DIAGNÓSTICO ESTRICTO) ---
// En lugar de hacer console.log, esta función devuelve textos exactos para la pantalla.
async function despacharWebhookN8nLoud(supabase, auth_user_id, lead) {
  
  // PRUEBA 1: ¿Existe la variable de entorno de Cloudflare?
  if (!env.N8N_MASTER_WEBHOOK) {
    return "FALTA_VAR_ENTORNO: La variable N8N_MASTER_WEBHOOK no existe o está vacía en Cloudflare.";
  }

  // PRUEBA 2: ¿El RPC funciona y encuentra el webhook del usuario?
  const { data: webhooks, error: webhookError } = await supabase
    .rpc('get_active_webhook', { broker_auth_id: auth_user_id });

  if (webhookError) {
    return `FALLO_RPC_SUPABASE: ${webhookError.message}`;
  }

  if (!webhooks || webhooks.length === 0) {
    return `SIN_WEBHOOK_CONFIGURADO: Supabase devolvió 0 resultados para el usuario ${auth_user_id}. ¿Está el webhook inactivo o guardado bajo otro usuario?`;
  }

  const webhook = webhooks[0];

  // PRUEBA 3: Encriptación
  let signature = "";
  try {
    const payloadStr = JSON.stringify({ event: 'lead.created', data: lead });
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(webhook.secret_token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
    signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return `FALLO_CRIPTOGRAFIA: ${e.message}`;
  }

  // PRUEBA 4: Petición HTTP al Orquestador
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const res = await fetch(env.N8N_MASTER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_url: webhook.endpoint_url,
        signature: signature,
        idempotency_key: `lead_${lead.id}`,
        payload_body: { event: 'lead.created', data: lead }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return `FALLO_HTTP_N8N: El servidor maestro (Cloudflare var) rechazó la conexión. Código HTTP: ${res.status}`;
    }

    return "OK";
  } catch (err) {
    return `FALLO_DE_RED: El fetch hacia N8N_MASTER_WEBHOOK crasheó -> ${err.message}`;
  }
}
