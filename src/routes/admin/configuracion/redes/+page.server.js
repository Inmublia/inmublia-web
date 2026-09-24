import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (!broker) return { conexiones: [] };

  const { data: conexiones } = await locals.supabase
    .from('broker_social_connections')
    .select('platform, username, status, token_expires_at')
    .eq('broker_id', broker.id);

  return { conexiones: conexiones || [] };
};

export const actions = {
  conectarInstagram: async ({ url, locals }) => {
    // IMPORTANTE: Asegúrate de que en tu archivo .env la variable META_CLIENT_ID 
    // sea exactamente 1089663933438622 (El ID de la app de Instagram)
    const clientId = privateEnv.META_CLIENT_ID; 

    // 1. URL CENTRAL ESTRICTA en la lista blanca de Meta
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    
    // 2. Extraer el subdominio actual (ej. "enrique-alzaga")
    const subdominio = url.hostname.split('.')[0];

    // 3. Obtener el ID del broker
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();

    // 4. Empaquetar estado para la redirección dinámica
    const statePayload = JSON.stringify({ 
      sub: subdominio, 
      brokerId: broker.id 
    });
    const state = btoa(statePayload); 

    // 5. Permisos exclusivos de Instagram
    const scopes = 'instagram_business_basic,instagram_business_content_publish';

    // 6. Endpoint de Autorización Nativo de Instagram API
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
