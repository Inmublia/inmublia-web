import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id, ia_creditos_disponibles')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (!broker) throw redirect(303, '/login');

  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, recamaras, banos, descripcion, galeria_urls')
    .eq('broker_id', broker.id)
    .neq('estatus', 'Vendida')
    .order('creado_en', { ascending: false });

  // 🚀 FIX: Solo traer conexiones vigentes
  const ahora = new Date().toISOString();
  const { data: connections } = await locals.supabase
    .from('broker_social_connections')
    .select('platform, status, username, token_expires_at')
    .eq('broker_id', broker.id)
    .eq('status', 'active')
    .gt('token_expires_at', ahora);

  const redesActivas = {
    instagram: connections?.find(c => c.platform === 'instagram') || null,
    facebook: connections?.find(c => c.platform === 'facebook') || null,
    // Dejamos TikTok como null a propósito hasta que el backend exista
    tiktok: null 
  };

  return {
    propiedades: propiedades || [],
    tokens: broker.ia_creditos_disponibles || 0,
    redes: redesActivas
  };
};
