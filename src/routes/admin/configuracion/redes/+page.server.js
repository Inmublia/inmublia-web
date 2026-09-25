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
    // 🚀 ENTERPRISE FIX: Credencial EXCLUSIVA de Instagram (ID: 10896639...)
    const clientId = privateEnv.INSTAGRAM_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: INSTAGRAM_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_ig_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    // 🚀 ENTERPRISE FIX: Meta en 2025/2026 reemplazó 'instagram_basic' por 'instagram_business_basic'
    // para el flujo nativo de Instagram Login.
    const scopes = 'instagram_business_basic,instagram_business_content_publish';
    
    // 🚀 ENTERPRISE FIX: Endpoint nativo y exclusivo de Instagram (Evita la pantalla negra)
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  },

  conectarFacebook: async ({ url, cookies }) => {
    // 🚀 ENTERPRISE FIX: Credencial EXCLUSIVA de Facebook (ID: 38356753...)
    const clientId = privateEnv.FACEBOOK_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: FACEBOOK_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_fb_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    // 🚀 ENTERPRISE FIX: Scopes purificados. Cero rastro de Instagram aquí.
    const scopes = 'pages_show_list,pages_manage_posts';
    
    // 🚀 ENTERPRISE FIX: Endpoint Graph API v26.0 exclusivo de Facebook
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
