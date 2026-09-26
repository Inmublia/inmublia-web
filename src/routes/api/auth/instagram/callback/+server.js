import { redirect, isRedirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ SEGURIDAD: Encriptación Simétrica (Se mantiene CBC por compatibilidad estricta con desencriptador actual)
function encryptToken(text, hexKey) {
  if (!hexKey) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(hexKey, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  let parsedState = {};
  let payloadStr = '';
  let signature = '';

  if (stateParam) {
    try {
      const decodedString = Buffer.from(decodeURIComponent(stateParam), 'base64').toString('utf-8');
      const wrapper = JSON.parse(decodedString);
      payloadStr = wrapper.p;
      signature = wrapper.s;
      parsedState = JSON.parse(payloadStr);
    } catch (e) {
      console.error('🔥 Error parseando state de OAuth:', e);
    }
  }
  
  const fallbackSubdomain = parsedState.sub || 'app';

  if (error || !code || !stateParam) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=access_denied`); 
  }

  try {
    if (!locals.user) throw new Error("Sesión no autorizada");

    const hmacSecret = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY;
    const expectedSignature = crypto.createHmac('sha256', hmacSecret).update(payloadStr).digest('hex');
    
    if (signature !== expectedSignature || parsedState.uid !== locals.user.id) {
      console.error('🔥 Violación CSRF detectada: Firma inválida o ID no coincide');
      throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=csrf_failed`);
    }

    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();
      
    if (brokerError || !broker) throw new Error("Perfil de broker no encontrado");
    const brokerId = broker.id;

    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    const clientId = privateEnv.INSTAGRAM_CLIENT_ID;
    const clientSecret = privateEnv.INSTAGRAM_CLIENT_SECRET;

    // 🚀 FIX: Endpoint moderno de Graph API (v26.0) + URLSearchParams estricto
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', clientId);
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('grant_type', 'authorization_code');
    tokenParams.append('redirect_uri', redirectUri);
    tokenParams.append('code', code);

    const tokenRes = await fetch('https://graph.instagram.com/v26.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString()
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_message || tokenData.error?.message || 'Fallo al obtener token corto de Meta');

    const shortLivedToken = tokenData.access_token;

    // 🚀 FIX: Las peticiones ig_exchange_token por estándar Graph API son GET
    const longTokenParams = new URLSearchParams();
    longTokenParams.append('grant_type', 'ig_exchange_token');
    longTokenParams.append('client_secret', clientSecret);
    longTokenParams.append('access_token', shortLivedToken);

    const longTokenUrl = `https://graph.instagram.com/v26.0/access_token?${longTokenParams.toString()}`;
    const longTokenRes = await fetch(longTokenUrl, { method: 'GET' });
    const longTokenData = await longTokenRes.json();
    
    if (!longTokenRes.ok) throw new Error(longTokenData.error?.message || 'Fallo al intercambiar por token largo');

    const longLivedToken = longTokenData.access_token;
    const expiresInSeconds = longTokenData.expires_in || 5184000; 
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const igUserRes = await fetch(`https://graph.instagram.com/v26.0/me?fields=id,username&access_token=${longLivedToken}`);
    const igUserData = await igUserRes.json();
    
    if (!igUserRes.ok || igUserData.error) throw new Error(igUserData.error?.message || "Fallo al obtener el perfil de usuario de IG");

    const encryptedToken = encryptToken(longLivedToken, privateEnv.ENCRYPTION_KEY);

    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'instagram',
        platform_user_id: igUserData.id,
        username: igUserData.username, 
        access_token: encryptedToken,
        token_expires_at: expiresAt,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw new Error(`Fallo en BD: ${dbError.message}`);

    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    if (isRedirect(err)) throw err;

    console.error('Error crítico en OAuth Callback IG Nativo:', err.message || err);
    
    // 🔥 ENTERPRISE DEBUG: Enviamos el error real a la URL para no volar a ciegas
    const safeErrorMsg = encodeURIComponent(err.message || 'Error desconocido');
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed&detalle=${safeErrorMsg}`);
  }
}
