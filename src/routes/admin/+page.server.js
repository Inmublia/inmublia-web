import { supabase } from '$lib/supabase';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // 1. Verificamos que el usuario esté logueado (validado por hooks.server.js)
  const user = locals.user;
  
  if (!user) {
    throw redirect(303, '/login');
  }

  // 2. Buscamos el perfil del broker asociado a ese correo
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) {
    return { broker: null, propiedades: [] };
  }

  // 3. Extraemos estrictamente el inventario de este broker
  const { data: propiedades, error: propError } = await supabase
    .from('propiedades')
    .select('*')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    propiedades: propiedades || []
  };
}
