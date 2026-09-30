// src/routes/api/auth/mercadolibre/callback/+server.js
import { redirect } from '@sveltejs/kit';
import { encryptToken } from '$lib/server/crypto';
import { env as privateEnv } from '$env/dynamic/private';

export async function GET({ url, locals, cookies }) {
  const code = url.searchParams.get('code');
  const errorParams = url.searchParams.get('error');
  const returnedState = url.searchParams.get('state');
  const expectedState = cookies.get('ml_oauth_state');
  
  // Limpiar cookie de estado inmediatamente para prevenir re-uso
  cookies.delete('ml_oauth_state', { path: '/' }); 

  // Validación estricta CSRF (OWASP)
  if (!returnedState || returnedState !== expectedState) {
    throw redirect(303, '/admin/configuracion/portales?error=csrf_violation');
  }

  if (errorParams || !code) throw redirect(303, '/admin/configuracion/portales?error=auth_denied');

  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
  if (!broker) throw redirect(303, '/admin/configuracion/portales?error=broker_not_found');

  const redirectUri = `${url.origin}/api/auth/mercadolibre/callback`;
  
  // Intercambio del Auth Code por Tokens de Acceso
  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({ 
      grant_type: 'authorization_code', 
      client_id: privateEnv.ML_APP_ID, 
      client_secret: privateEnv.ML_CLIENT_SECRET, 
      code, 
      redirect_uri: redirectUri 
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw redirect(303, '/admin/configuracion/portales?error=token_exchange_failed');

  // Cifrado Zero-Trust en memoria
  const accessEncrypted = await encryptToken(tokenData.access_token);
  const refreshEncrypted = await encryptToken(tokenData.refresh_token);
  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  // Guardado en BD (Soporta Key Versioning de la Fase 1)
  await locals.supabase.from('portal_credenciales').upsert({
    broker_id: broker.id, 
    portal: 'mercadolibre', 
    access_token_encrypted: accessEncrypted, 
    refresh_token_encrypted: refreshEncrypted,
    portal_publisher_id: String(tokenData.user_id), 
    token_expires_at: expiresAt, 
    estatus: 'activo', 
    key_version: 'v1'
  }, { onConflict: 'broker_id, portal' });

  throw redirect(303, '/admin/configuracion/portales?success=ml_connected');
}
