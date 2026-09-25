import { redirect } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import crypto from 'crypto';

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
  conectarInstagram: async ({ url, cookies }) => {
    const clientId = privateEnv.META_CLIENT_ID; 

    // 🚀 ENTERPRISE FIX: URL canónica estricta para evitar bloqueos por dominios Preview/Web
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    const scopes = 'instagram_business_basic,instagram_business_content_publish';
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  },

  conectarFacebook: async ({ url, cookies }) => {
    const clientId = privateEnv.META_CLIENT_ID; 

    // 🚀 ENTERPRISE FIX: URL canónica estricta idéntica a la lista blanca de Meta
    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    const scopes = 'pages_show_list,pages_read_engagement,pages_manage_engagement,pages_manage_posts';
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
