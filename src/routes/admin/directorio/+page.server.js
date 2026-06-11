import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', locals.user.email)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // Traemos todo el histórico de leads (incluyendo perdidos, archivados, etc.)
  const { data: leads } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

  // Traemos el inventario general actual
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, ubicacion, slug, imagen_url')
    .eq('broker_id', broker.id);

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
