import { redirect, isRedirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ SEGURIDAD: Encriptación Simétrica Node.js
function encryptToken(text, hexKey) {
  if (!text) return '';
  if (!hexKey) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(hexKey, 'hex'), iv);
  
  let encrypted = cipher.update(Buffer.from(text, 'utf-8'));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function GET({ url, locals, platform }) {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // 🚀 REDUNDANCIA ENTERPRISE
  const hmacKey = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY || platform?.env?.HMAC_SECRET || platform?.env?.ENCRYPTION_KEY;
  const encryptionKey = privateEnv.ENCRYPTION_KEY || platform?.env?.ENCRYPTION_KEY;
  
  const clientId = privateEnv.FACEBOOK_CLIENT_ID || privateEnv.META_CLIENT_ID || privateEnv.INSTAGRAM_CLIENT_ID || platform?.env?.FACEBOOK_CLIENT_ID;
  const clientSecret = privateEnv.FACEBOOK_CLIENT_SECRET || privateEnv.META_CLIENT_SECRET || privateEnv.INSTAGRAM_CLIENT_SECRET || platform?.env?.FACEBOOK_CLIENT_SECRET;

  let parsedState = {};
  let payloadStr = '';
  let signature = '';
  let fallbackSubdomain = 'app';

  if (stateParam) {
    try {
      const decodedString = Buffer.from(decodeURIComponent(stateParam), 'base64').toString('utf-8');
      const wrapper = JSON.parse(decodedString);
      payloadStr = wrapper.p || '';
      signature = wrapper.s || '';
      if (payloadStr) {
        parsedState = JSON.parse(payloadStr);
        fallbackSubdomain = parsedState.sub || 'app';
      }
    } catch (e) {
      console.error('🔥 Error parseando state de OAuth en FB:', e);
    }
  }

  // 🛡️ VALIDACIONES ESTRICTAS
  if (!hmacKey || !encryptionKey) throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion&detalle=missing_encryption_key`);
  if (!clientId || !clientSecret) throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion&detalle=missing_meta_credentials`);
  if (error || !code || !stateParam || !payloadStr) throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=acceso_denegado`); 

  try {
    // 🛡️ PROTECCIÓN CSRF
    const expectedSignature = crypto.createHmac('sha256', hmacKey).update(Buffer.from(payloadStr, 'utf-8')).digest('hex');
    if (signature !== expectedSignature) throw new Error("Violacion_CSRF");

    const validUserId = parsedState.uid;
    if (!validUserId) throw new Error("UID_Ausente");

    const { data: broker, error: brokerError } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', validUserId).single();
    if (brokerError || !broker) throw new Error("Broker_No_Encontrado");
    const brokerId = broker.id;

    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    
    // 1. Obtener Token corto (RESTAURADO AL ESTÁNDAR GET OFICIAL DE META)
    const tokenUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', clientId);
    tokenUrl.searchParams.append('redirect_uri', redirectUri);
    tokenUrl.searchParams.append('client_secret', clientSecret);
    tokenUrl.searchParams.append('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) throw new Error(`Meta_API_Token1: ${tokenData.error.message}`);
    const shortLivedToken = tokenData.access_token;

    // 2. Extender a Token largo (User Token)
    const exchangeUrl = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
    exchangeUrl.searchParams.append('grant_type', 'fb_exchange_token');
    exchangeUrl.searchParams.append('client_id', clientId);
    exchangeUrl.searchParams.append('client_secret', clientSecret);
    exchangeUrl.searchParams.append('fb_exchange_token', shortLivedToken);

    const longTokenRes = await fetch(exchangeUrl.toString());
    const longTokenData = await longTokenRes.json();
    
    if (longTokenData.error) throw new Error(`Meta_API_Token2: ${longTokenData.error.message}`);
    const longLivedUserToken = longTokenData.access_token || shortLivedToken;
    const userTokenExpiresIn = longTokenData.expires_in || 5184000; // 60 días fallback

    // 3. Extraer Páginas
    const pagesRes = await fetch(`https://graph.facebook.com/v26.0/me/accounts?access_token=${longLivedUserToken}`);
    const pagesData = await pagesRes.json();

    if (pagesData.error) throw new Error(`Meta_API_Pages: ${pagesData.error.message}`);
    if (!pagesData.data || pagesData.data.length === 0) {
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=sin_paginas_empresariales`);
    }

    const facebookPage = pagesData.data[0];
    const pageAccessToken = facebookPage.access_token; 
    const pageId = facebookPage.id;
    const pageName = facebookPage.name;

    const encryptedPageToken = encryptToken(pageAccessToken, encryptionKey);
    const encryptedUserToken = encryptToken(longLivedUserToken, encryptionKey); 

    // 4. Guardado en Supabase
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'facebook',
        platform_user_id: pageId, 
        username: pageName,
        access_token: encryptedPageToken, 
        refresh_token: encryptedUserToken, 
        token_expires_at: new Date(Date.now() + (userTokenExpiresIn * 1000)).toISOString(), 
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw new Error(`DB_Error: ${dbError.message}`);

    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    if (isRedirect(err)) throw err;
    
    console.error('🔥 Error crítico en FB Callback:', err.message || err);
    
    // BUBBLING DE ERROR: Mostrará la falla exacta de Facebook en la barra de direcciones
    const cleanErrorMsg = (err.message || 'Error_desconocido').substring(0, 150);
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=conexion_fallida&detalle=${encodeURIComponent(cleanErrorMsg)}`);
  }
}
