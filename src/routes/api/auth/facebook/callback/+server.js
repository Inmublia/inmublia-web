import { redirect, isRedirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ SEGURIDAD: Encriptación Simétrica Node.js (Compatible con Cloudflare nodejs_compat)
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

  // 🚀 LECTURA DE ENTORNO ENTERPRISE (SvelteKit + Cloudflare Bindings Fallback)
  const hmacKey = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY || platform?.env?.HMAC_SECRET || platform?.env?.ENCRYPTION_KEY;
  const encryptionKey = privateEnv.ENCRYPTION_KEY || platform?.env?.ENCRYPTION_KEY;
  const clientSecret = privateEnv.FACEBOOK_CLIENT_SECRET || platform?.env?.FACEBOOK_CLIENT_SECRET;
  const clientId = privateEnv.FACEBOOK_CLIENT_ID || platform?.env?.FACEBOOK_CLIENT_ID;

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

  // 🛡️ VALIDACIÓN ESTRICTA DE ENTORNO ANTES DE EJECUTAR
  if (!hmacKey || !encryptionKey) {
    console.error('🔥 FATAL: ENCRYPTION_KEY no está configurada en el entorno del Callback FB');
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=config_error&detalle=missing_encryption_key`);
  }

  if (!clientSecret || !clientId) {
    console.error('🔥 FATAL: Credenciales de Facebook no encontradas en Cloudflare Bindings ni Svelte Env');
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=config_error&detalle=missing_fb_credentials`);
  }

  if (error || !code || !stateParam || !payloadStr) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=access_denied`); 
  }

  try {
    // 🛡️ PROTECCIÓN CSRF: Validación Matemática
    const expectedSignature = crypto.createHmac('sha256', hmacKey)
      .update(Buffer.from(payloadStr, 'utf-8'))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('🔥 Violación CSRF detectada en FB: Firma matemática inválida');
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=csrf_failed`);
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
    const cleanCode = code.replace('#_', ''); 

    // 1. Obtener Token corto (Graph API v26.0)
    const tokenRes = await fetch(`https://graph.facebook.com/v26.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${cleanCode}`);
    const tokenData = await tokenRes.json();
    
    if (tokenData.error) throw new Error(tokenData.error.message);
    const shortLivedToken = tokenData.access_token;

    // 2. Extender a Token largo (60 días)
    const longTokenRes = await fetch(`https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
    const longTokenData = await longTokenRes.json();
    const longLivedToken = longTokenData.access_token || shortLivedToken;

    // 3. Extraer las Páginas de Empresa
    const pagesRes = await fetch(`https://graph.facebook.com/v26.0/me/accounts?access_token=${longLivedToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=sin_paginas_fb`);
    }

    const facebookPage = pagesData.data[0];
    const pageAccessToken = facebookPage.access_token; 
    const pageId = facebookPage.id;
    const pageName = facebookPage.name;

    // Meta Page Tokens no siempre devuelven expires_in, asumimos 60 días del token principal
    const expiresInSeconds = longTokenData.expires_in || (60 * 24 * 60 * 60); 
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Encriptación AES-256-CBC
    const encryptedToken = encryptToken(pageAccessToken, encryptionKey);

    // 5. Guardado seguro en BD
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'facebook',
        platform_user_id: pageId, 
        username: pageName,
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw new Error(`Fallo en BD FB: ${dbError.message}`);

    // Redirección final con URL absoluta al subdominio del cliente
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    if (isRedirect(err)) throw err;

    console.error('Error crítico en OAuth Callback FB Nativo:', err.message || err);
    
    const safeErrorMsg = encodeURIComponent(err.message || 'Error desconocido');
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed&detalle=${safeErrorMsg}`);
  }
}
