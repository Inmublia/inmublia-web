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

  // 2. Extraer propiedades activas (Asumiendo que tienes un campo 'imagenes' tipo JSONB/Array)
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, recamaras, banos, descripcion, imagenes')
    .eq('broker_id', broker.id)
    .neq('estatus', 'Vendida')
    .order('creado_en', { ascending: false });

  // 3. Verificar si tiene la cuenta de Instagram vinculada y activa
  const { data: igConnection } = await locals.supabase
    .from('broker_social_connections')
    .select('status, username')
    .eq('broker_id', broker.id)
    .eq('platform', 'instagram')
    .eq('status', 'active')
    .maybeSingle();

  return {
    propiedades: propiedades || [],
    tokens: broker.ia_creditos_disponibles || 0,
    igConectado: !!igConnection,
    igUsername: igConnection?.username || null
  };
};
