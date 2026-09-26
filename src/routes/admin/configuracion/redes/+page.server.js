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
  conectarInstagram: async ({ url, locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const clientId = privateEnv.INSTAGRAM_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: INSTAGRAM_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_ig_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';
    const subdominio = url.hostname.split('.')[0];

    // 🚀 ENTERPRISE STATELESS CSRF: Eliminamos la cookie frágil. Firmamos el estado con criptografía.
    const payload = JSON.stringify({ sub: subdominio, uid: locals.user.id });
    const signature = crypto.createHmac('sha256', privateEnv.ENCRYPTION_KEY).update(payload).digest('hex');
    const statePayload = JSON.stringify({ p: payload, s: signature });
    const state = encodeURIComponent(Buffer.from(statePayload).toString('base64')); 

    const scopes = 'instagram_business_basic,instagram_business_content_publish';
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  },

  conectarFacebook: async ({ url, locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const clientId = privateEnv.FACEBOOK_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: FACEBOOK_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_fb_id');
    }

    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';
    const subdominio = url.hostname.split('.')[0];

    // 🚀 ENTERPRISE STATELESS CSRF
    const payload = JSON.stringify({ sub: subdominio, uid: locals.user.id });
    const signature = crypto.createHmac('sha256', privateEnv.ENCRYPTION_KEY).update(payload).digest('hex');
    const statePayload = JSON.stringify({ p: payload, s: signature });
    const state = encodeURIComponent(Buffer.from(statePayload).toString('base64')); 

    const scopes = 'pages_show_list,pages_manage_posts';
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
