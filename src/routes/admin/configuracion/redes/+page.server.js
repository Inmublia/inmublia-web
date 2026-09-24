import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_BASE_URL } from '$env/static/public'; 

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
    const clientId = privateEnv.META_CLIENT_ID; 

    // 1. URL CENTRAL ESTRICTA: Es la única que Meta va a aceptar (la que guardamos en su panel)
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    
    // 2. Extraer el subdominio en el que está navegando el broker (ej. "enrique-alzaga")
    const subdominio = url.hostname.split('.')[0];

    // 3. Obtener el ID interno del broker para relacionar su cuenta
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();

    // 4. Empaquetar estado para saber a dónde regresar al broker mágicamente
    const statePayload = JSON.stringify({ 
      sub: subdominio, 
      brokerId: broker.id 
    });
    const state = btoa(statePayload); // Convertimos a Base64 para mandarlo por la URL

    // 5. Los permisos exactos de la nueva API
    const scopes = 'instagram_business_basic,instagram_business_content_publish';

    // 6. Endpoint de Graph API moderno (Soporta el módulo donde registramos la URL)
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
