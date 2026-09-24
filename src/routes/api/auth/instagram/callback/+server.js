import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ url, locals }) {
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Si el broker canceló el proceso
  if (error || !code || !stateParam) {
    throw redirect(303, 'https://inmublia.com'); // O a una página central de error
  }

  try {
    // 1. Desempaquetar el state para saber de dónde venía el broker
    // Usamos atob() nativo de la Web API
    const state = JSON.parse(atob(stateParam));
    const brokerSubdomain = state.sub;
    const brokerId = state.brokerId;
    
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';

    // 2. Intercambiar el Código por el Token de Acceso (Graph API v20.0)
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${env.META_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${env.META_CLIENT_SECRET}&code=${code}`;
    
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) throw new Error(tokenData.error?.message || 'Error al canjear token');

    const longLivedToken = tokenData.access_token; // Este token dura 60 días

    // 3. Obtener el ID de la cuenta de Instagram conectada
    const igUserRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${longLivedToken}`);
    const igUserData = await igUserRes.json();

    // 4. Guardar en Supabase
    const { error: dbError } = await locals.supabase
      .from('broker_social_connections')
      .upsert({
        broker_id: brokerId,
        platform: 'instagram',
        platform_user_id: igUserData.id,
        username: igUserData.name, // Nombre de la página/cuenta profesional
        access_token: longLivedToken,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'broker_id, platform' });

    if (dbError) throw dbError;

    // 5. El toque final: Redirigir de regreso al subdominio del broker
    throw redirect(303, `https://${brokerSubdomain}.inmublia.com/admin/configuracion/redes?success=true`);

  } catch (err) {
    console.error('Error en callback de Meta:', err);
    // Si falla, regresarlo a su subdominio pero con bandera de error
    const fallbackSubdomain = stateParam ? JSON.parse(atob(stateParam)).sub : 'app';
    throw redirect(303, `https://${fallbackSubdomain}.inmublia.com/admin/configuracion/redes?error=auth_failed`);
  }
}
