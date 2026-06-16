import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // CORRECCIÓN: Búsqueda estricta por ID de Autenticación
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // Traemos todo el histórico de leads para el análisis
  const { data: leads } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

  // OPTIMIZACIÓN: Solo traemos las propiedades 'Activas' para el Matchmaking.
  // No tiene caso descargar las vendidas o en pre-mercado si no se pueden cruzar.
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, ubicacion, slug, imagen_url')
    .eq('broker_id', broker.id)
    .eq('estatus', 'Activa');

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
