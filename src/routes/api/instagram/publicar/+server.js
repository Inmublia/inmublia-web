import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ FIX (Bug 10): Centralizar versión de la API de Meta (Actualizado a v26.0 para coincidir con el token)
const META_GRAPH_VERSION = 'v26.0';
const META_GRAPH_URL = `https://graph.instagram.com/${META_GRAPH_VERSION}`;

// 🛡️ FIX (Bug 6): Función para desencriptar el token de la BD
function decryptToken(encryptedText) {
  if (!privateEnv.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY no configurada en el entorno');
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedData = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(privateEnv.ENCRYPTION_KEY, 'hex'), iv);
  
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}

export async function POST({ request, locals }) {
  // 🚀 RECUPERACIÓN DINÁMICA DE SESIÓN (Adiós al bloqueo "No autorizado" de SvelteKit)
  let user = locals.user;
  if (!user && locals.supabase) {
    const { data } = await locals.supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { image_url, caption } = await request.json();

    if (!image_url) throw new Error('Se requiere la URL de la imagen (CDN)');

    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id) // 🚀 FIX: Usamos el ID del usuario dinámicamente recuperado
      .single();

    if (brokerError || !broker) throw new Error('No se encontró el perfil del broker');

    // 🛡️ FIX (Bug 9): Traer token_expires_at para validarlo
    const { data: connection, error: connError } = await locals.supabase
      .from('broker_social_connections')
      .select('platform_user_id, access_token, token_expires_at')
      .eq('broker_id', broker.id)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .single();

    if (connError || !connection) {
      throw new Error('La cuenta de Instagram no está conectada o está inactiva');
    }

    // 🛡️ FIX (Bug 9): Validar vencimiento del token antes de gastar recursos
    if (new Date(connection.token_expires_at) < new Date()) {
      await locals.supabase.from('broker_social_connections').update({ status: 'expired' }).eq('broker_id', broker.id).eq('platform', 'instagram');
      return json({ error: 'Tu conexión de Instagram venció. Ve a Configuración → Redes y reconecta tu cuenta.' }, { status: 401 });
    }

    const { platform_user_id } = connection;
    // 🛡️ FIX (Bug 6): Desencriptar token para hablar con Meta
    const access_token = decryptToken(connection.access_token);

    // 🛡️ FIX (Mejora menor): Checar Rate Limit de Meta antes de intentar publicar
    const limitRes = await fetch(`${META_GRAPH_URL}/${platform_user_id}/content_publishing_limit?fields=quota_usage&access_token=${access_token}`);
    if (limitRes.ok) {
       const limitData = await limitRes.json();
       if (limitData.data?.[0]?.quota_usage >= 25) {
          throw new Error("Has excedido el límite de 25 publicaciones diarias permitidas por Instagram.");
       }
    }

    // ==========================================
    // PASO 1 DE META: CREAR EL CONTENEDOR DE MEDIA
    // ==========================================
    const containerUrl = `${META_GRAPH_URL}/${platform_user_id}/media`;
    const containerParams = new URLSearchParams({
      image_url: image_url, 
      caption: caption || '',
      access_token: access_token
    });

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      body: containerParams
    });
    
    const containerData = await containerRes.json();
    
    if (!containerRes.ok || containerData.error) {
      throw new Error(`Fallo al crear contenedor IG: ${containerData.error?.message || 'Error desconocido'}`);
    }

    const creationId = containerData.id;

    // ==========================================
    // PASO 2 DE META: PUBLICAR EN EL FEED
    // ==========================================
    const publishUrl = `${META_GRAPH_URL}/${platform_user_id}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: access_token
    });

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      body: publishParams
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      throw new Error(`Fallo al publicar en feed IG: ${publishData.error?.message || 'Error desconocido'}`);
    }

    return json({ 
      success: true, 
      instagram_post_id: publishData.id,
      message: 'Publicación exitosa en Instagram'
    });

  } catch (error) {
    console.error('Error crítico en Endpoint IG Publish:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
