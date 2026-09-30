// src/routes/api/auth/mercadolibre/+server.js
import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

export async function GET({ url, cookies }) {
  const redirectUri = `${url.origin}/api/auth/mercadolibre/callback`;
  const clientId = privateEnv.ML_APP_ID;
  
  const state = crypto.randomUUID();
  // Parche I1: Soporte de cookies en subdominios
  const cookieDomain = url.hostname.includes('localhost') ? 'localhost' : '.inmublia.com';

  cookies.set('ml_oauth_state', state, { 
    path: '/', 
    domain: cookieDomain,
    httpOnly: true, 
    secure: !url.hostname.includes('localhost'), 
    sameSite: 'lax',
    maxAge: 600 
  });
  
  const authUrl = `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  throw redirect(302, authUrl);
}
