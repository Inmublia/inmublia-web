// src/lib/server/ml-auth.js
import { env as privateEnv } from '$env/dynamic/private';
import { encryptToken, decryptToken } from '$lib/server/crypto';

// Parche C2: 1 hora de margen de seguridad para tokens de 6 horas
const MARGEN_RENOVACION_MS = 60 * 60 * 1000; 

export async function asegurarTokenMercadoLibreVigente(supabaseAdmin, brokerId, creds) {
  const expiresAt = new Date(creds.token_expires_at).getTime();
  const ahora = Date.now();

  if (expiresAt - ahora > MARGEN_RENOVACION_MS) {
    return creds;
  }

  const lockKey = `ml_refresh_${brokerId}`;
  
  const { data: lockAcquired, error: lockErr } = await supabaseAdmin.rpc('acquire_distributed_lock', { 
    p_lock_key: lockKey, 
    p_ttl_seconds: 15 
  });

  if (lockErr) console.error('[ML_AUTH] Error en semáforo distribuido:', lockErr);

  if (!lockAcquired) {
    await new Promise(res => setTimeout(res, 3500));
    const { data: credsActualizadas } = await supabaseAdmin.from('portal_credenciales')
      .select('portal_publisher_id, access_token_encrypted, refresh_token_encrypted, api_key_encrypted, token_expires_at, estatus')
      .eq('broker_id', brokerId).eq('portal', 'mercadolibre').single();
    return credsActualizadas;
  }

  try {
    const { data: credsFrescas } = await supabaseAdmin.from('portal_credenciales')
      .select('portal_publisher_id, access_token_encrypted, refresh_token_encrypted, api_key_encrypted, token_expires_at, estatus')
      .eq('broker_id', brokerId).eq('portal', 'mercadolibre').single();
      
    if (new Date(credsFrescas.token_expires_at).getTime() - ahora > MARGEN_RENOVACION_MS) {
      return credsFrescas; 
    }

    const refreshToken = await decryptToken(credsFrescas.refresh_token_encrypted);
    
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: privateEnv.ML_APP_ID,
        client_secret: privateEnv.ML_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenRes.ok) {
      await supabaseAdmin.from('portal_credenciales').update({ estatus: 'error_auth' })
        .eq('broker_id', brokerId).eq('portal', 'mercadolibre');
      throw new Error('Refresh Token revocado por MercadoLibre. Reconexión requerida.');
    }

    const accessEncrypted = await encryptToken(tokenData.access_token);
    const refreshEncrypted = await encryptToken(tokenData.refresh_token);
    const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { data: credencialesNuevas } = await supabaseAdmin.from('portal_credenciales').update({
      access_token_encrypted: accessEncrypted,
      refresh_token_encrypted: refreshEncrypted,
      token_expires_at: newExpiresAt,
      estatus: 'activo',
      actualizado_en: new Date().toISOString()
    })
    .eq('broker_id', brokerId)
    .eq('portal', 'mercadolibre')
    .select('portal_publisher_id, access_token_encrypted, refresh_token_encrypted, api_key_encrypted, token_expires_at, estatus').single();

    return credencialesNuevas;

  } finally {
    await supabaseAdmin.rpc('release_distributed_lock', { p_lock_key: lockKey });
  }
}
