// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', locals.user.id) 
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // Aseguramos traer los campos de cierre financiero (precio_cierre, comision_cierre)
  const { data: leads } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

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
