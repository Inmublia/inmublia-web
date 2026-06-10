import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', locals.user.email)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // Traemos todos los leads y la información de la propiedad que les interesa
  const { data: leads } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

  // Traemos el inventario general para cruzar datos
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus')
    .eq('broker_id', broker.id);

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
