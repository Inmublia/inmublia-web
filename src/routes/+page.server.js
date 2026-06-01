import { supabase } from '$lib/supabase';

export async function load({ url }) {
  const hostname = url.hostname;
  let brokerId = null;

  // Lógica para detectar si estamos en un subdominio de marca blanca
  // Ignoramos 'www' y el dominio principal
  if (hostname.includes('.inmublia.com') && !hostname.startsWith('www.')) {
    brokerId = hostname.replace('.inmublia.com', '');
  }

  // Preparamos la consulta a Supabase
  let query = supabase.from('propiedades').select('*');

  // Si detectamos un broker, aplicamos el filtro estricto
  if (brokerId) {
    query = query.eq('broker_id', brokerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error de Supabase:', error.message);
    return { propiedades: [], brokerActivo: brokerId };
  }

  return {
    propiedades: data,
    brokerActivo: brokerId
  };
}
