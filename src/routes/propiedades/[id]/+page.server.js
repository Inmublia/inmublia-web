import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function load({ params, locals }) {
  // 1. Cargar los detalles de la propiedad usando el ID de la URL
  const { data: propiedad, error } = await locals.supabase
    .from('propiedades') // Asegúrate de que este sea el nombre real de tu tabla
    .select('*, broker:brokers(id, nombre_comercial, avatar_url, whatsapp)')
    .eq('id', params.id)
    .single();

  if (error || !propiedad) {
    // Si la propiedad no existe o fue eliminada
    return { status: 404, error: 'Propiedad no encontrada' };
  }

  return { propiedad };
}

export const actions = {
  contactar: async ({ request, locals, platform, params }) => {
    const formData = await request.formData();
    
    // Extraer y limpiar datos del formulario
    const leadData = {
      propiedad_id: params.id,
      agency_id: formData.get('agency_id'), // OJO: Este es el ID de la tabla 'brokers', no el de auth.users
      nombre: formData.get('nombre')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      telefono: formData.get('telefono')?.toString().trim(),
      mensaje: formData.get('mensaje')?.toString().trim(),
      origen: 'Portal Web Inmublia'
    };

    // Validaciones básicas
    if (!leadData.nombre || !leadData.email || !leadData.telefono) {
      return fail(400, { formId: 'contacto', error: 'Por favor, llena los campos obligatorios.' });
    }

    // 1. Guardar el Lead en Inmublia (Supabase)
    const { data: lead, error: dbError } = await locals.supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (dbError) {
      console.error("Error BD Guardando lead:", dbError);
      return fail(500, { formId: 'contacto', error: 'Hubo un problema al enviar tu mensaje. Intenta de nuevo.' });
    }

    // --- INICIO DEL FIX DE IDENTIDADES (TRADUCCIÓN DE UUID) ---
    // Buscamos el auth_user_id del broker al que le pertenece la propiedad
    const { data: brokerDestino, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('auth_user_id')
      .eq('id', leadData.agency_id)
      .single();

    if (brokerError) {
      console.error("Error buscando al broker destino:", brokerError);
    }

    // 2. Disparo Asíncrono usando el auth_user_id correcto
    if (brokerDestino?.auth_user_id) {
      if (platform?.context?.waitUntil) {
        platform.context.waitUntil(
          despacharWebhookN8n(locals.supabase, brokerDestino.auth_user_id, lead)
        );
      } else {
        // Fallback por si lo corres en Node localmente
        despacharWebhookN8n(locals.supabase, brokerDestino.auth_user_id, lead).catch(console.error);
      }
    }
    // --- FIN DEL FIX ---

    return { formId: 'contacto', success: true };
  }
};

// --- EL MOTOR EDGE DE WEBHOOKS ---
async function despacharWebhookN8n(supabase, auth_user_id, lead) {
  // 1. Revisar si la agencia tiene configurado y activo su Webhook Elite
  // Ahora consultamos usando el auth_user_id correcto
  const { data: webhook, error: webhookError } = await supabase
    .from('agency_webhooks')
    .select('endpoint_url, secret_token')
    .eq('agency_id', auth_user_id)
    .eq('is_active', true)
    .single();

  if (webhookError || !webhook) {
    console.log(`Abortado: No hay webhook activo para el usuario: ${auth_user_id}`);
    return; // Termina en silencio si no es agencia Pro/Elite o lo tiene apagado.
  }

  const payloadStr = JSON.stringify({
    event: 'lead.created',
    timestamp: new Date().toISOString(),
    data: lead
  });

  // 2. Firma Criptográfica (Web Crypto API Nativa)
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

  // 3. Empaquetar para el Orquestador n8n
  const n8nPayload = {
    target_url: webhook.endpoint_url,
    signature: signature,
    idempotency_key: `lead_${lead.id}`,
    payload_body: JSON.parse(payloadStr)
  };

  // DEBUGGER ACTIVO: Para monitorear en los logs de Cloudflare Pages
  console.log(`Disparando a n8n: ${env.N8N_MASTER_WEBHOOK} para la agencia: ${auth_user_id}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos max.

    // Lee la variable directamente de Cloudflare Pages
    const res = await fetch(env.N8N_MASTER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal
    });

    if (!res.ok) {
      console.error(`Error HTTP de n8n. Status: ${res.status}`);
    } else {
      console.log(`Webhook despachado con éxito a n8n para lead ${lead.id}`);
    }

    clearTimeout(timeoutId);
  } catch (err) {
    console.error(`Fallo de red disparando webhook maestro para ${auth_user_id}:`, err);
  }
}
