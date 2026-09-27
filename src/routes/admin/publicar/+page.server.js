import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // 1. Obtener datos del broker y sus tokens
  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id, ia_creditos_disponibles')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (!broker) throw redirect(303, '/login');

  // 2. Extraer propiedades activas
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, recamaras, banos, descripcion, galeria_urls')
    .eq('broker_id', broker.id)
    .neq('estatus', 'Vendida')
    .order('creado_en', { ascending: false });

  // 🚀 FIX: 3. Extraer TODAS las redes sociales vinculadas y activas (No solo Instagram)
  const { data: connections } = await locals.supabase
    .from('broker_social_connections')
    .select('platform, status, username')
    .eq('broker_id', broker.id)
    .eq('status', 'active');

  const redesActivas = {
    instagram: connections?.find(c => c.platform === 'instagram') || null,
    facebook: connections?.find(c => c.platform === 'facebook') || null,
    tiktok: connections?.find(c => c.platform === 'tiktok') || null
  };

  return {
    propiedades: propiedades || [],
    tokens: broker.ia_creditos_disponibles || 0,
    redes: redesActivas // 🚀 FIX: Pasamos el objeto completo de redes
  };
};
