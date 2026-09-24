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
    
    // ESTA URL DEBE SER IDÉNTICA A LA DEL PASO 1 Y A LA DE META
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';

    // 2. Canjear el código por un token inicial (Dura solo 1 hora)
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${privateEnv.META_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${privateEnv.META_CLIENT_SECRET}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Fallo al obtener token corto');

    const shortLivedToken = tokenData.access_token;

    // 3. BLINDAJE: Canjear el token corto por uno de Larga Duración (60 días)
    const longTokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${privateEnv.META_CLIENT_ID}&client_secret=${privateEnv.META_CLIENT_SECRET}&fb_exchange_token=${shortLivedToken}`;
    
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    if (!longTokenRes.ok) throw new Error(longTokenData.error?.message || 'Fallo al obtener token largo');

    const longLivedToken = longTokenData.access_token;
    
    // Meta devuelve 'expires_in' en segundos (aprox 5184000 = 60 días). Calculamos la fecha real.
    const expiresInSeconds = longTokenData.expires_in || 5184000; 
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // 4. Obtener el ID y Nombre de la cuenta de Meta del broker
    const igUserRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${longLivedToken}`);
    const igUserData = await igUserRes.json();

    // 5. Guardar en Supabase (Ahora sí incluimos token_expires_at para tu interfaz)
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'instagram',
        platform_user_id: igUserData.id,
        username: igUserData.name, 
        access_token: longLivedToken,
        token_expires_at: expiresAt, // Alimenta la interfaz del broker
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw dbError;

    // 6. Magia: Lo devolvemos a su subdominio como si nada hubiera pasado
    throw redirect(303, `https://${brokerSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    console.error('Error crítico en OAuth Callback:', err);
    
    // Si algo falla, intentamos devolverlo a su subdominio original para mostrar el error ahí
    const fallbackSubdomain = stateParam ? JSON.parse(atob(stateParam)).sub : 'app';
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed`);
  }
}
