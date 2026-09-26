import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ SEGURIDAD: Encriptación Simétrica para tokens en reposo
function encryptToken(text, hexKey) {
  if (!hexKey) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(hexKey, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function GET({ url, locals, cookies }) {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  let parsedState = {};
  if (stateParam) {
    try { 
      // 🚀 FIX CRÍTICO: Decodificación robusta compatible con el servidor Node.js/V8
      const decodedString = Buffer.from(decodeURIComponent(stateParam), 'base64').toString('utf-8');
      parsedState = JSON.parse(decodedString); 
    } catch (e) {
      console.error('🔥 Error parseando state de OAuth:', e);
    }
  }
  
  const fallbackSubdomain = parsedState.sub || 'app';

  if (error || !code || !stateParam) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=access_denied`); 
  }

  // 🛡️ SEGURIDAD: Validación CSRF usando la cookie
  const savedNonce = cookies.get('oauth_nonce');
  if (!savedNonce || savedNonce !== parsedState.nonce) {
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=csrf_failed`);
  }
  cookies.delete('oauth_nonce', { path: '/' });

  try {
    if (!locals.user) throw new Error("Sesión no autorizada");

    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();
      
    if (brokerError || !broker) throw new Error("Perfil de broker no encontrado");
    const brokerId = broker.id;

    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';

    // 🚀 LECTURA EXCLUSIVA DE CREDENCIALES DE INSTAGRAM
    const clientId = privateEnv.INSTAGRAM_CLIENT_ID;
    const clientSecret = privateEnv.INSTAGRAM_CLIENT_SECRET;

    // 1. Canjear el código por un token inicial
    const tokenFormData = new FormData();
    tokenFormData.append('client_id', clientId);
    tokenFormData.append('client_secret', clientSecret);
    tokenFormData.append('grant_type', 'authorization_code');
    tokenFormData.append('redirect_uri', redirectUri);
    tokenFormData.append('code', code);

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenFormData
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_message || 'Fallo al obtener token corto');

    const shortLivedToken = tokenData.access_token;

    // 2. 🛡️ SEGURIDAD: Obtener Token Largo
    const longTokenUrl = 'https://graph.instagram.com/access_token';
    const longTokenParams = new URLSearchParams();
    longTokenParams.append('grant_type', 'ig_exchange_token');
    longTokenParams.append('client_secret', clientSecret);
    longTokenParams.append('access_token', shortLivedToken);

    let longTokenRes = await fetch(longTokenUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, 
      body: longTokenParams.toString() 
    });
    let longTokenData = await longTokenRes.json();
    
    if (!longTokenRes.ok && longTokenData.error?.type === 'OAuthException') {
      longTokenRes = await fetch(`${longTokenUrl}?${longTokenParams.toString()}`);
      longTokenData = await longTokenRes.json();
    }

    if (!longTokenRes.ok) throw new Error(longTokenData.error?.message || 'Fallo al obtener token largo');

    const longLivedToken = longTokenData.access_token;
    const expiresInSeconds = longTokenData.expires_in || 5184000; 
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 3. Obtener el ID y Nombre de la cuenta de Instagram
    const igUserRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${longLivedToken}`);
    const igUserData = await igUserRes.json();
    
    if (!igUserRes.ok || igUserData.error) throw new Error("Fallo al obtener perfil de IG");

    // 4. 🛡️ SEGURIDAD: Encriptar el token
    const encryptedToken = encryptToken(longLivedToken, privateEnv.ENCRYPTION_KEY);

    // 5. Guardar en Supabase
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

    if (dbError) throw dbError;

    // 6. Redirigir de regreso al subdominio del broker
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    console.error('Error crítico en OAuth Callback IG Nativo:', err);
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed`);
  }
}
