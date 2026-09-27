import { redirect, isRedirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

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

  // 🚀 REDUNDANCIA ENTERPRISE: Cross-Service Credential Coalescing
  // Si la variable específica de FB no está en la memoria del Worker (por falta de redeploy), 
  // enrutamos a la de IG que comparte exactamente el mismo App ID en Meta.
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

  // 🛡️ AUDITORÍA DE ENTORNO AISLADA
  if (!hmacKey || !encryptionKey) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion&detalle=missing_encryption_key`);
  }

  if (!clientId) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion&detalle=missing_client_id`);
  }

  if (!clientSecret) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion&detalle=missing_client_secret`);
  }

  if (error || !code || !stateParam || !payloadStr) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=acceso_denegado_oauth`); 
  }

  try {
    const expectedSignature = crypto.createHmac('sha256', hmacKey)
      .update(Buffer.from(payloadStr, 'utf-8'))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=violacion_seguridad_csrf`);
    }

    const validUserId = parsedState.uid;
    if (!validUserId) throw new Error("Firma válida pero UID ausente en el estado");

    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', validUserId)
      .single();
      
    if (brokerError || !broker) throw new Error("Perfil de broker no encontrado");
    const brokerId = broker.id;

    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    
    // 1. Obtener Token corto vía POST (Protegiendo Secretos en Logs)
    const tokenParams = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        client_secret: clientSecret,
        code: code 
    });

    const tokenRes = await fetch('https://graph.facebook.com/v26.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    const shortLivedToken = tokenData.access_token;

    // 2. Extender a Token largo (User Token)
    const exchangeParams = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken
    });

    const longTokenRes = await fetch('https://graph.facebook.com/v26.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: exchangeParams
    });
    
    const longTokenData = await longTokenRes.json();
    const longLivedUserToken = longTokenData.access_token || shortLivedToken;
    const userTokenExpiresIn = longTokenData.expires_in || 5184000;

    // 3. Extraer Páginas
    const pagesRes = await fetch(`https://graph.facebook.com/v26.0/me/accounts?access_token=${longLivedUserToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=sin_paginas_empresariales`);
    }

    if (pagesData.data.length > 1) {
        console.warn(`[Inmublia Router] Multi-páginas detectadas. Enlazando página índice 0. Frontend UI selector en backlog.`);
    }

    const facebookPage = pagesData.data[0];
    const pageAccessToken = facebookPage.access_token; 
    const pageId = facebookPage.id;
    const pageName = facebookPage.name;

    const encryptedPageToken = encryptToken(pageAccessToken, encryptionKey);
    const encryptedUserToken = encryptToken(longLivedUserToken, encryptionKey); 

    // 4. Guardado transaccional en Supabase
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

    if (dbError) throw new Error(`Fallo en BD: ${dbError.message}`);

    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    if (isRedirect(err)) throw err;
    console.error('Error crítico en FB Callback:', err.message || err);
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=conexion_fallida`);
  }
}
