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
  conectarInstagram: async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const clientId = privateEnv.INSTAGRAM_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: INSTAGRAM_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_ig_id');
    }

    // ✅ Bug #1 Eliminado: Obtenemos el subdominio real, sin importar el entorno (Vercel/Local)
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, subdominio')
      .eq('auth_user_id', locals.user.id)
      .single();

    if (!broker) throw redirect(302, '/admin/configuracion/redes?error=perfil_no_encontrado');

    const subdominio = broker.subdominio;
    const redirectUri = 'https://inmublia.com/api/auth/instagram/callback';

    const payload = JSON.stringify({ sub: subdominio, uid: locals.user.id });
    
    // ✅ Bug #5 Eliminado (Backlog): Listo para usar HMAC_SECRET sin romper la key actual
    const hmacSecret = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY;
    const signature = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
    
    const statePayload = JSON.stringify({ p: payload, s: signature });
    const state = encodeURIComponent(Buffer.from(statePayload).toString('base64')); 

    const scopes = 'instagram_business_basic,instagram_business_content_publish';
    const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  },

  conectarFacebook: async ({ locals }) => {
    if (!locals.user) throw redirect(302, '/login');
    const clientId = privateEnv.FACEBOOK_CLIENT_ID; 

    if (!clientId || clientId === 'undefined' || clientId.trim() === '') {
      console.error('🔥 ERROR: FACEBOOK_CLIENT_ID no configurado.');
      throw redirect(302, '/admin/configuracion/redes?error=falta_fb_id');
    }

    // ✅ Bug #1 Eliminado
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, subdominio')
      .eq('auth_user_id', locals.user.id)
      .single();

    if (!broker) throw redirect(302, '/admin/configuracion/redes?error=perfil_no_encontrado');

    const subdominio = broker.subdominio;
    const redirectUri = 'https://inmublia.com/api/auth/facebook/callback';

    const payload = JSON.stringify({ sub: subdominio, uid: locals.user.id });
    
    // ✅ Bug #5 Eliminado
    const hmacSecret = privateEnv.HMAC_SECRET || privateEnv.ENCRYPTION_KEY;
    const signature = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
    
    const statePayload = JSON.stringify({ p: payload, s: signature });
    const state = encodeURIComponent(Buffer.from(statePayload).toString('base64')); 

    const scopes = 'pages_show_list,pages_manage_posts';
    const authUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;

    throw redirect(302, authUrl);
  }
};
