import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Si el usuario canceló o hubo error
  if (error || !code) {
    throw redirect(303, '/admin/configuracion/redes?error=auth_denied');
  }

  try {
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();

    if (!broker) throw new Error('Broker no encontrado');

    const redirectUri = `${PUBLIC_BASE_URL}/api/auth/instagram/callback`;

    // 1. Intercambiar 'code' por 'Short-Lived Access Token'
    const tokenForm = new URLSearchParams({
      client_id: privateEnv.META_CLIENT_ID,
      client_secret: privateEnv.META_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code
    });

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: tokenForm
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_message || 'Fallo al obtener Short Token');

    const shortToken = tokenData.access_token;
    const igUserId = tokenData.user_id;

    // 2. Intercambiar 'Short-Lived' por 'Long-Lived Access Token' (Dura 60 días)
    const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${privateEnv.META_CLIENT_SECRET}&access_token=${shortToken}`;
    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();
    
    if (!longTokenRes.ok) throw new Error(longTokenData.error?.message || 'Fallo al obtener Long Token');

    const longToken = longTokenData.access_token;
    const expires_in = longTokenData.expires_in; // Segundos (Usualmente 5184000 = 60 días)
    const expirationDate = new Date(Date.now() + expires_in * 1000).toISOString();

    // 3. Obtener el Username del Broker para mostrarlo en Inmublia
    const userRes = await fetch(`https://graph.instagram.com/v20.0/me?fields=id,username&access_token=${longToken}`);
    const userData = await userRes.json();

    // 4. Guardar en Base de Datos de manera segura (Upsert)
    // Asumiendo que has creado una función RPC en Supabase para encriptar, o lo pasas directo si RLS bloquea lectura.
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: broker.id,
        platform: 'instagram',
        platform_user_id: igUserId.toString(),
        username: userData.username,
        access_token: longToken, // 🔒 Idealmente encriptado
        token_expires_at: expirationDate,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw dbError;

    // Éxito: Regresamos a la vista
    throw redirect(303, '/admin/configuracion/redes?success=true');

  } catch (err) {
    console.error('🔥 Error en OAuth de Instagram:', err.message);
    throw redirect(303, '/admin/configuracion/redes?error=server_error');
  }
}
