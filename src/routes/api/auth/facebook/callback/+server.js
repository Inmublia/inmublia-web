import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

// 🛡️ SEGURIDAD: Encriptación Simétrica Node.js (Compatible con Cloudflare nodejs_compat)
// Mantenemos AES-256-CBC para compatibilidad estricta con tu base de datos existente.
function encryptToken(text, hexKey) {
  if (!hexKey) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(hexKey, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export async function GET({ url, locals, cookies }) {
  if (!locals.user) throw redirect(302, '/login');

  const code = url.searchParams.get('code');
  const stateB64 = url.searchParams.get('state');
  const errorReason = url.searchParams.get('error');

  if (errorReason || !code || !stateB64) {
    throw redirect(302, '/admin/configuracion/redes?error=auth_cancelado');
  }

  // 🛡️ PROTECCIÓN CSRF
  try {
    const state = JSON.parse(atob(stateB64));
    const savedNonce = cookies.get('oauth_nonce');
    if (!savedNonce || state.nonce !== savedNonce) {
       throw new Error('Validación CSRF fallida');
    }
  } catch (e) {
    throw redirect(302, '/admin/configuracion/redes?error=csrf_invalido');
  }

  // 🚀 LECTURA EXCLUSIVA DE CREDENCIALES DE FACEBOOK
  const clientId = privateEnv.FACEBOOK_CLIENT_ID;
  const clientSecret = privateEnv.FACEBOOK_CLIENT_SECRET;
  
  const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';

  try {
    // 1. Obtener Token corto (Graph API v26.0)
    const tokenRes = await fetch(`https://graph.facebook.com/v26.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`);
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
      throw redirect(302, '/admin/configuracion/redes?error=sin_paginas');
    }

    const facebookPage = pagesData.data[0];
    const pageAccessToken = facebookPage.access_token; 
    const pageId = facebookPage.id;
    const pageName = facebookPage.name;

    // 4. Encriptación AES-256-CBC
    const encryptedToken = encryptToken(pageAccessToken, privateEnv.ENCRYPTION_KEY);

    // 5. Guardar en Base de Datos
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();

    const { error: dbError } = await locals.supabase.from('broker_social_connections').upsert({
      broker_id: broker.id,
      platform: 'facebook',
      platform_account_id: pageId, 
      username: pageName,
      access_token: encryptedToken,
      status: 'active',
      updated_at: new Date().toISOString()
    }, { onConflict: 'broker_id, platform' });

    if (dbError) throw new Error(dbError.message);

    cookies.delete('oauth_nonce', { path: '/' });
    throw redirect(302, '/admin/configuracion/redes?success=fb_conectado');

  } catch (error) {
    console.error('[FB OAuth Error]', error);
    if (error.status && error.location) throw error;
    throw redirect(302, '/admin/configuracion/redes?error=fallo_conexion');
  }
}
