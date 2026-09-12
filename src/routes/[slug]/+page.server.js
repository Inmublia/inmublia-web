import { supabase } from '$lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function load({ params, url }) {
  const { slug } = params;
  const templateForzado = url.searchParams.get('template')?.toString().trim() || null;
  const isSandbox = url.searchParams.get('sandbox') === 'true';

  // 🔥 INTERCEPCIÓN QUIRÚRGICA Y SANDBOX
  if (slug === 'propiedad-demo' || isSandbox) {
    return {
      propiedad: {
        id: 'demo-id',
        titulo: 'Residencia Signature de Alto Diseño',
        descripcion: 'Esta es una propiedad de demostración generada para previsualizar los acabados del catálogo de diseños de Inmublia. Arquitectura contemporánea y espacios optimizados.',
        precio: 18500000,
        moneda: 'MXN',
        operacion: 'Venta',
        ubicacion: 'Puerta de Hierro, Zapopan',
        recamaras: 4,
        banos: 4,
        medio_bano: 1,
        estacionamientos: 4,
        m2_construccion: 450,
        m2_terreno: 500,
        antiguedad: 'Nuevo',
        imagen_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000',
        galeria_urls: [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1600607687931-cece5ce21460?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=1200'
        ],
        video_url: null, // Apagado por seguridad en Sandbox (Ahorra RAM)
        recorrido_3d_url: null, // Apagado por seguridad en Sandbox
        estatus: 'Activa',
        tipo_operacion: 'Venta',
        tipo_inmueble: 'Casa'
      },
      broker: {
        id: 'demo-broker-id',
        nombre_comercial: 'Inmublia Premium Properties',
        subdominio: 'demo',
        avatar_url: 'https://ui-avatars.com/api/?name=Premium&background=0f172a&color=fff',
        whatsapp: '523312345678', // Habilita el dibujo del botón WhatsApp
        pixel_fb: null, // Píxeles en null para garantizar que no haya métricas fantasma
        pixel_google: null,
        pixel_tiktok: null
      },
      templateForzado
    };
  }

  // 1. Buscamos la propiedad exacta por su slug amigable
  const { data: propiedad, error: propError } = await supabase
    .from('propiedades')
    .select('*')
    .eq('slug', slug)
    .single();

  if (propError || !propiedad) {
    throw error(404, {
      message: 'La propiedad que buscas no está disponible o ha sido removida.'
    });
  }

  // 2. Extraemos el perfil completo del broker dueño de esta propiedad
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', propiedad.broker_id)
    .single();

  if (brokerError || !broker) {
    throw error(404, {
      message: 'La agencia encargada de esta propiedad no se encuentra activa.'
    });
  }

  return { propiedad, broker, templateForzado };
}

export const actions = {
  contacto: async ({ request }) => {
    const formData = await request.formData();
    
    // FIX: Forzamos texto plano y eliminamos cualquier espacio invisible
    const nombre = formData.get('nombre')?.toString().trim();
    const correo = formData.get('correo')?.toString().trim();
    const telefono = formData.get('telefono')?.toString().trim();
    const propiedad_id = formData.get('propiedad_id')?.toString().trim();
    const broker_id = formData.get('broker_id')?.toString().trim();
    const origen_lead = formData.get('origen_lead')?.toString().trim() || 'Tráfico Directo';

    if (!nombre || !correo || !telefono || !propiedad_id || !broker_id) {
      return fail(400, { error: 'Por favor, llena todos los campos obligatorios del formulario.' });
    }

    const leadData = {
      nombre, 
      correo, 
      telefono, 
      propiedad_id, 
      broker_id,
      origen: origen_lead, 
      estado: 'nuevo', 
      creado_en: new Date().toISOString()
    };

    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return fail(500, { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en Cloudflare.' });
    }

    // Cliente administrador con llave maestra para saltar el RLS
    const supabaseAdmin = createClient(supabase.supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: nuevoLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (insertError) {
      return fail(500, { error: `Error DB: ${insertError.message}` });
    }

    // Búsqueda del broker destino con reporte estricto de errores
    const { data: brokerDestino, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('auth_user_id')
      .eq('id', broker_id)
      .single();

    // Si falla, escupirá el ID exacto que buscó y el mensaje de Supabase en pantalla
    if (brokerError || !brokerDestino?.auth_user_id) {
      return fail(500, { 
        error: `🚨 DIAGNÓSTICO: Buscamos el ID [${broker_id}]. Error BD: ${brokerError?.message || 'Dato devuelto nulo'}` 
      });
    }

    // Ejecución Síncrona del Webhook (El depurador ruidoso sigue activo)
    const diag = await despacharWebhookN8n(supabaseAdmin, brokerDestino.auth_user_id, nuevoLead);
    
    if (diag !== "OK") {
      return fail(500, { error: `🚨 ERROR WEBHOOK: ${diag}` });
    }

    return { success: true, message: 'La información ha sido enviada con éxito.' };
  }
};

// --- MOTOR EDGE DE WEBHOOKS (MODO CHIVATO SÍNCRONO) ---
async function despacharWebhookN8n(supabaseAdmin, auth_user_id, lead) {
  if (!env.N8N_MASTER_WEBHOOK) {
    return "Variable N8N_MASTER_WEBHOOK vacía o no existe en Cloudflare.";
  }

  const { data: webhooks, error: webhookError } = await supabaseAdmin
    .rpc('get_active_webhook', { broker_auth_id: auth_user_id });

  if (webhookError) {
    return `Fallo en Supabase RPC: ${webhookError.message}`;
  }

  if (!webhooks || webhooks.length === 0) {
    return `No se encontró webhook guardado para el usuario ${auth_user_id}.`;
  }

  const webhook = webhooks[0];
  const payloadStr = JSON.stringify({ event: 'lead.created', timestamp: new Date().toISOString(), data: lead });

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
