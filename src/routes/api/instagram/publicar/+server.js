import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

const META_GRAPH_VERSION = 'v26.0';
const META_GRAPH_URL = `https://graph.instagram.com/${META_GRAPH_VERSION}`;

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

// 🚀 FIX: Función para crear un retraso artificial (Delay)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST({ request, locals }) {
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
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error('No se encontró el perfil del broker');

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

    if (new Date(connection.token_expires_at) < new Date()) {
      await locals.supabase.from('broker_social_connections').update({ status: 'expired' }).eq('broker_id', broker.id).eq('platform', 'instagram');
      return json({ error: 'Tu conexión de Instagram venció. Ve a Configuración → Redes y reconecta tu cuenta.' }, { status: 401 });
    }

    const { platform_user_id } = connection;
    const access_token = decryptToken(connection.access_token);

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
    // PASO 2 DE META: PUBLICAR EN EL FEED (Con Retraso y Reintentos)
    // ==========================================
    const publishUrl = `${META_GRAPH_URL}/${platform_user_id}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: access_token
    });

    let publishRes;
    let publishData;
    let attempt = 0;
    const maxAttempts = 3; // Intentar publicar 3 veces

    while (attempt < maxAttempts) {
      attempt++;
      // Esperar 3 segundos antes del primer intento y 5 segundos entre reintentos
      await delay(attempt === 1 ? 3000 : 5000); 

      publishRes = await fetch(publishUrl, {
        method: 'POST',
        body: publishParams
      });

      publishData = await publishRes.json();

      // Si la publicación fue exitosa, salir del bucle
      if (publishRes.ok && !publishData.error) {
        break; 
      }

      // Si hay un error diferente a "Media ID is not available", detener los reintentos
      if (publishData.error?.message && !publishData.error.message.includes('Media ID is not available')) {
          break;
      }
      
      console.warn(`[IG Publish] Intento ${attempt} fallido: Media aún no disponible. Reintentando...`);
    }

    if (!publishRes.ok || publishData.error) {
      throw new Error(`Fallo al publicar en feed IG tras ${maxAttempts} intentos: ${publishData.error?.message || 'Error desconocido'}`);
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
