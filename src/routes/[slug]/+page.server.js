import { supabase } from '$lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function load({ params, url }) {
  const { slug } = params;
  const templateForzado = url.searchParams.get('template')?.toString().trim() || null;
  const isSandbox = url.searchParams.get('sandbox') === 'true';

  if (slug === 'propiedad-demo' || isSandbox) {
    return { /* ... tu objeto demo intacto ... */ };
  }

  const { data: propiedad, error: propError } = await supabase
    .from('propiedades')
    .select('*')
    .eq('slug', slug)
    .single();

  if (propError || !propiedad) throw error(404, { message: 'Propiedad no disponible.' });

  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', propiedad.broker_id)
    .single();

  if (brokerError || !broker) throw error(404, { message: 'Agencia inactiva.' });

  return { propiedad, broker, templateForzado };
}

export const actions = {
  contacto: async ({ request }) => {
    const formData = await request.formData();
    
    const nombre = formData.get('nombre')?.toString().trim();
    const correo = formData.get('correo')?.toString().trim();
    const telefono = formData.get('telefono')?.toString().trim();
    const propiedad_id = formData.get('propiedad_id');
    const broker_id = formData.get('broker_id');
    const origen_lead = formData.get('origen_lead')?.toString().trim() || 'Tráfico Directo';

    if (!nombre || !correo || !telefono || !propiedad_id || !broker_id) {
      return fail(400, { error: 'Llena todos los campos.' });
    }

    const leadData = {
      nombre, correo, telefono, propiedad_id, broker_id,
      origen: origen_lead, estado: 'nuevo', creado_en: new Date().toISOString()
    };

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail(500, { error: 'Falta SUPABASE_SERVICE_ROLE_KEY' });
    }

    const supabaseAdmin = createClient(supabase.supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: nuevoLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (insertError) return fail(500, { error: `Error DB: ${insertError.message}` });

    // Buscamos al dueño
    const { data: brokerDestino } = await supabaseAdmin
      .from('brokers')
      .select('auth_user_id')
      .eq('id', broker_id)
      .single();

    if (!brokerDestino?.auth_user_id) {
      return fail(500, { error: '🚨 DIAGNÓSTICO: No se encontró auth_user_id para este broker.' });
    }

    // 🔥 MODO DIAGNÓSTICO: EJECUCIÓN SÍNCRONA
    // El sistema ESPERARÁ a que el webhook termine antes de mostrar "Éxito"
    const diag = await despacharWebhookN8n(supabaseAdmin, brokerDestino.auth_user_id, nuevoLead);
    
    // Si la función devuelve algo diferente a "OK", cancelamos y mostramos el error en pantalla
    if (diag !== "OK") {
      return fail(500, { error: `🚨 ERROR WEBHOOK: ${diag}` });
    }

    return { success: true, message: 'La información ha sido enviada con éxito.' };
  }
};

// --- MOTOR EDGE DE WEBHOOKS (MODO CHIVATO) ---
// Retorna strings de error exactos en lugar de morir en silencio
async function despacharWebhookN8n(supabaseAdmin, auth_user_id, lead) {
  
  if (!env.N8N_MASTER_WEBHOOK) {
    return "Variable N8N_MASTER_WEBHOOK vacía o no existe en Cloudflare.";
  }

  // 1. Probamos si la función SQL (RPC) existe y funciona
  const { data: webhooks, error: webhookError } = await supabaseAdmin
    .rpc('get_active_webhook', { broker_auth_id: auth_user_id });

  if (webhookError) {
    return `Fallo en Supabase RPC: ${webhookError.message} (¿Ejecutaste el script SQL?)`;
  }

  // 2. Probamos si realmente el usuario tiene un webhook guardado
  if (!webhooks || webhooks.length === 0) {
    return `No se encontró webhook guardado para el usuario ${auth_user_id}. Revisa tu base de datos.`;
  }

  const webhook = webhooks[0];
  const payloadStr = JSON.stringify({ event: 'lead.created', timestamp: new Date().toISOString(), data: lead });

  // 3. Probamos encriptación
  let signature;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(webhook.secret_token), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadStr));
    signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return `Fallo de encriptación HMAC: ${err.message}`;
  }

  const n8nPayload = {
    target_url: webhook.endpoint_url,
    signature: signature,
    idempotency_key: `lead_${lead.id}`, 
    payload_body: JSON.parse(payloadStr)
  };

  // 4. Probamos red HTTP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); 

    const res = await fetch(env.N8N_MASTER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) return `El servidor n8n devolvió error HTTP ${res.status}`;

    return "OK";
  } catch (err) {
    return `Fallo de red hacia n8n: ${err.message}`;
  }
}
