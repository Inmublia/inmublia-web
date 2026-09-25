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

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: META_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_meta_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    // 🚀 FIX INSTAGRAM: Scopes de la Graph API moderna.
    // Además, solicitamos 'pages_show_list' porque los perfiles profesionales de IG
    // están vinculados a Páginas de FB, y Meta necesita ese permiso base para hacer el puente.
    const scopes = 'instagram_basic,instagram_content_publish,pages_show_list';
    
    // 🚀 FIX INSTAGRAM: Redirigimos al Login Empresarial de FB, NO a api.instagram.com
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  },

  conectarFacebook: async ({ url, cookies }) => {
    const clientId = privateEnv.META_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: META_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_meta_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    const subdominio = url.hostname.split('.')[0];
    const nonce = crypto.randomBytes(16).toString('hex');
    cookies.set('oauth_nonce', nonce, { path: '/', httpOnly: true, secure: true, maxAge: 600 });

    const statePayload = JSON.stringify({ sub: subdominio, nonce: nonce });
    const state = btoa(statePayload); 

    // 🚀 FIX FACEBOOK: Scopes purificados. 
    // Quitamos 'pages_read_user_content' y 'pages_read_engagement' que causaban el crash.
    // Con estos dos es suficiente para publicar en una página.
    const scopes = 'pages_show_list,pages_manage_posts';
    
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
