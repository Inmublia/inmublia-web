import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Si el broker canceló o Meta rechazó
  if (error || !code || !stateParam) {
    throw redirect(303, 'https://inmublia.com/admin/configuracion/redes?error=access_denied'); 
  }

  try {
    // 1. Leer el pasaporte oculto (subdominio e ID)
    const state = JSON.parse(atob(stateParam));
    const brokerSubdomain = state.sub;
    const brokerId = state.brokerId;
    
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';

    // 2. Canjear el código por un token inicial (La API nativa de IG exige POST con FormData)
    const tokenFormData = new FormData();
    tokenFormData.append('client_id', privateEnv.META_CLIENT_ID);
    tokenFormData.append('client_secret', privateEnv.META_CLIENT_SECRET); // Asegura que este sea el Secret de IG
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

    // 3. BLINDAJE: Canjear por Token de Larga Duración (60 días) vía Graph API de Instagram
    const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${privateEnv.META_CLIENT_SECRET}&access_token=${shortLivedToken}`;
    
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    if (!longTokenRes.ok) throw new Error(longTokenData.error?.message || 'Fallo al obtener token largo');

    const longLivedToken = longTokenData.access_token;
    
    const expiresInSeconds = longTokenData.expires_in || 5184000; 
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Obtener el ID y Nombre (Username) de la cuenta de Instagram
    const igUserRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${longLivedToken}`);
    const igUserData = await igUserRes.json();

    // 5. Guardar en Supabase
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'instagram',
        platform_user_id: igUserData.id,
        username: igUserData.username, 
        access_token: longLivedToken,
        token_expires_at: expiresAt,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw dbError;

    // 6. Redirigir de regreso al subdominio del broker
    throw redirect(303, `https://${brokerSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    console.error('Error crítico en OAuth Callback IG Nativo:', err);
    
    // Si algo falla, devolvemos a su subdominio original para mostrar el error ahí
    const fallbackSubdomain = stateParam ? JSON.parse(atob(stateParam)).sub : 'app';
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed`);
  }
}
