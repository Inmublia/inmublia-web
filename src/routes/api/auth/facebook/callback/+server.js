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

  // 🚀 LECTURA DE ENTORNO ENTERPRISE (Fix 1: Tolera META_ o FACEBOOK_)
  const hmacKey = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY || platform?.env?.HMAC_SECRET || platform?.env?.ENCRYPTION_KEY;
  const encryptionKey = privateEnv.ENCRYPTION_KEY || platform?.env?.ENCRYPTION_KEY;
  
  const clientSecret = privateEnv.META_CLIENT_SECRET || privateEnv.FACEBOOK_CLIENT_SECRET || platform?.env?.META_CLIENT_SECRET || platform?.env?.FACEBOOK_CLIENT_SECRET;
  const clientId = privateEnv.META_CLIENT_ID || privateEnv.FACEBOOK_CLIENT_ID || platform?.env?.META_CLIENT_ID || platform?.env?.FACEBOOK_CLIENT_ID;

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
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion_incompleta`);
  }

  if (!clientSecret || !clientId) {
    console.error('🔥 FATAL: Credenciales de Meta no encontradas (Buscando META_CLIENT_ID o FACEBOOK_CLIENT_ID)');
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=configuracion_incompleta`);
  }

  if (error || !code || !stateParam || !payloadStr) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=acceso_denegado`); 
  }

  try {
    // 🛡️ PROTECCIÓN CSRF: Validación Matemática
    const expectedSignature = crypto.createHmac('sha256', hmacKey)
      .update(Buffer.from(payloadStr, 'utf-8'))
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error('🔥 Violación CSRF detectada en FB: Firma matemática inválida');
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=seguridad_csrf`);
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
    
    // 1. Obtener Token corto (Fix 4: POST para evitar filtrar secretos en URLs/Logs)
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

    // 2. Extender a Token largo (User Token - 60 días) (Fix 4: POST)
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
    const userTokenExpiresIn = longTokenData.expires_in || 5184000; // 60 días

    // 3. Extraer las Páginas de Empresa
    const pagesRes = await fetch(`https://graph.facebook.com/v26.0/me/accounts?access_token=${longLivedUserToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=sin_paginas_empresariales`);
    }

    // ⚠️ DEUDA TÉCNICA (Fix 3): Si hay >1 página, seleccionamos la primera. Futuro: UI de selección de página.
    if (pagesData.data.length > 1) {
        console.warn(`[Aviso] El broker tiene múltiples páginas (${pagesData.data.length}). Seleccionando la primera por defecto. Se requiere implementar UI de selección.`);
    }

    const facebookPage = pagesData.data[0];
    const pageAccessToken = facebookPage.access_token; // Este token, generado por el long-lived user token, no expira.
    const pageId = facebookPage.id;
    const pageName = facebookPage.name;

    // 4. Encriptación AES-256-CBC
    const encryptedPageToken = encryptToken(pageAccessToken, encryptionKey);
    const encryptedUserToken = encryptToken(longLivedUserToken, encryptionKey); // Guardado para futuras renovaciones

    // 5. Guardado seguro en BD (Fix 2: Estructura de renovación)
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'facebook',
        platform_user_id: pageId, 
        username: pageName,
        access_token: encryptedPageToken, // Token de Página (Publicación - No expira)
        refresh_token: encryptedUserToken, // Token de Usuario (Renovación - Expira en 60 días)
        token_expires_at: new Date(Date.now() + (userTokenExpiresIn * 1000)).toISOString(), // Fecha de vida del User Token
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw new Error(`Fallo en BD FB: ${dbError.message}`);

    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    if (isRedirect(err)) throw err;

    console.error('Error crítico en OAuth Callback FB Nativo:', err.message || err);
    
    // Fix 5: Mensaje de error generalizado
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=conexion_fallida`);
  }
}
