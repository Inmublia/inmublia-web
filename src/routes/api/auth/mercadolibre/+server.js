// src/routes/api/auth/mercadolibre/+server.js
import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

export async function GET({ url }) {
  const redirectUri = `${url.origin}/api/auth/mercadolibre/callback`;
  const clientId = privateEnv.ML_APP_ID;
  
  // Scopes de lectura y offline_access para obtener el refresh_token
  const authUrl = `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  throw redirect(302, authUrl);
}
