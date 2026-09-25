import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

// 🛡️ Encriptación simétrica AES-256-GCM nativa para Cloudflare Workers
async function encryptToken(text, hexKey) {
  const keyBuffer = new Uint8Array(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey('raw', keyBuffer, 'AES-GCM', false, ['encrypt']);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const encryptedBytes = new Uint8Array(encrypted);
  
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const dataHex = Array.from(encryptedBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ivHex}:${dataHex}`;
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

    // 4. Encriptación AES-256
    const encryptedToken = await encryptToken(pageAccessToken, privateEnv.ENCRYPTION_KEY);

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
