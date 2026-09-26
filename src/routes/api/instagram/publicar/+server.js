import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

const META_GRAPH_VERSION = 'v26.0';
const IG_API_URL = `https://graph.instagram.com/${META_GRAPH_VERSION}`;

// 🚀 FIX: Timeout global para proteger los recursos del Worker
const fetchConTimeout = (url, options = {}, ms = 15000) => 
  Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout llamando a Meta API')), ms))
  ]);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🛡️ FIX CRÍTICO: Función de descifrado blindada sin fugas en stack trace
function decryptToken(encryptedText) {
  if (!privateEnv.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY'); 
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  
  try {
    const textParts = encryptedText.split(':');
    const ivHex = textParts.shift();
    if (!ivHex) throw new Error();
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedData = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(privateEnv.ENCRYPTION_KEY, 'hex'), iv);
    
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf-8');
  } catch {
    throw new Error('FALLO_CRIPTO');
  }
}

// 🛡️ FIX: Validación estricta de la URL de la imagen
function validarImageUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('HTTPS_REQUERIDO');
    if (parsed.hostname === 'localhost' || parsed.hostname.startsWith('192.168')) throw new Error('URL_LOCAL');
    return true;
  } catch {
    throw new Error('URL_INVALIDA');
  }
}

export async function POST({ request, locals }) {
  let user = locals.user;
  if (!user && locals.supabase) {
    const { data } = await locals.supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) return json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { image_url, caption } = await request.json();

    if (!image_url) throw new Error('URL_INVALIDA');
    validarImageUrl(image_url);

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

    if (connError || !connection) throw new Error('IG_NO_CONECTADO');

    if (new Date(connection.token_expires_at) < new Date()) {
      await locals.supabase.from('broker_social_connections').update({ status: 'expired' }).eq('broker_id', broker.id).eq('platform', 'instagram');
      throw new Error('IG_VENCIDO');
    }

    const { platform_user_id } = connection;
    const access_token = decryptToken(connection.access_token);

    // 🛡️ FIX CRÍTICO: Rate Limit check usando Headers en lugar de Query String
    const limitRes = await fetchConTimeout(`${IG_API_URL}/${platform_user_id}/content_publishing_limit?fields=quota_usage`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    if (limitRes.ok) {
       const limitData = await limitRes.json();
       if (limitData.data?.[0]?.quota_usage >= 25) throw new Error('IG_LIMITE');
    }

    // ==========================================
    // PASO 1 DE META: CREAR EL CONTENEDOR DE MEDIA
    // ==========================================
    // 🛡️ FIX CRÍTICO: Mover el token al header Authorization y mandar datos como JSON
    const containerRes = await fetchConTimeout(`${IG_API_URL}/${platform_user_id}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: image_url,
        caption: caption || ''
      })
    });
    
    const containerData = await containerRes.json();
    
    // 🛡️ FIX: Detectar si el usuario revocó permisos desde la app de Meta
    if (containerData.error?.code === 190) {
      await locals.supabase.from('broker_social_connections').update({ status: 'expired' }).eq('broker_id', broker.id).eq('platform', 'instagram');
      throw new Error('IG_REVOCADO');
    }

    if (!containerRes.ok || containerData.error) {
      throw new Error(`Contenedor Error: ${containerData.error?.message || 'Error desconocido'}`);
    }

    const creationId = containerData.id;

    // ==========================================
    // PASO 2 DE META: PUBLICAR EN EL FEED (Backoff Exponencial)
    // ==========================================
    const BACKOFF_MS = [1000, 3000, 7000]; // 🚀 FIX: Intentos rápidos primero
    let publishRes;
    let publishData;
    let post_id = null;

    for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
      await delay(BACKOFF_MS[attempt]);

      publishRes = await fetchConTimeout(`${IG_API_URL}/${platform_user_id}/media_publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ creation_id: creationId })
      });

      publishData = await publishRes.json();

      if (publishRes.ok && !publishData.error) {
        post_id = publishData.id;
        break; 
      }

      // Código 9007 = Media procesando. Solo si es este código reintentamos.
      if (publishData.error?.code !== 9007) break;
      console.warn(`[IG Publish] Intento ${attempt + 1}: Media procesando (9007). Reintentando...`);
    }

    if (!post_id) {
      throw new Error(`Publicación Error: ${publishData?.error?.message || 'Media timeout'}`);
    }

    // 🚀 FIX: Guardar el historial de publicación en el CRM
    await locals.supabase.from('social_posts').insert({
      broker_id: broker.id,
      platform: 'instagram',
      post_id: post_id,
      image_url: image_url,
      caption: caption || '',
      status: 'published',
      published_at: new Date().toISOString()
    });

    return json({ 
      success: true, 
      instagram_post_id: post_id,
      message: 'Publicación exitosa en Instagram'
    });

  } catch (error) {
    // 🛡️ FIX CRÍTICO: Diccionario de errores sanitizados para el Frontend
    const ERROR_MAP = {
      'ENCRYPTION_KEY': 'Error de configuración del servidor.',
      'FALLO_CRIPTO': 'Error de seguridad con tu conexión. Reconecta Instagram.',
      'IG_NO_CONECTADO': 'Tu cuenta de Instagram no está vinculada.',
      'IG_VENCIDO': 'Tu sesión de Instagram venció. Reconecta tu cuenta.',
      'IG_REVOCADO': 'Permisos revocados desde Meta. Reconecta tu cuenta.',
      'IG_LIMITE': 'Alcanzaste el límite de publicaciones diarias (25 max).',
      'HTTPS_REQUERIDO': 'La imagen debe estar alojada en una red segura (HTTPS).',
      'URL_LOCAL': 'La imagen no es accesible desde internet.',
      'URL_INVALIDA': 'La URL de la imagen no es válida.',
      'Contenedor Error': 'Error preparando la imagen para Instagram. Intenta con otra foto.',
      'Publicación Error': 'La foto se preparó pero Meta no la publicó a tiempo. Intenta de nuevo.'
    };

    const mensajeSeguro = Object.entries(ERROR_MAP).find(([key]) => error.message?.includes(key))?.[1] || 'Error de comunicación con Meta. Inténtalo de nuevo.';
    
    console.error('[IG Publish Error]', { message: error.message, userId: user?.id });
    return json({ error: mensajeSeguro }, { status: 500 });
  }
}
