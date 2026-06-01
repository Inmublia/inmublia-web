import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
  const hostname = url.hostname;
  let brokerId = null;

  // Detectamos el subdominio de la misma forma
  if (hostname.includes('.inmublia.com') && !hostname.startsWith('www.')) {
    brokerId = hostname.replace('.inmublia.com', '');
  }

  // Buscamos la propiedad específica usando el 'slug' de la URL
  let query = supabase
    .from('propiedades')
    .select('*')
    .eq('slug', params.slug);

  // Filtro estricto: la casa debe pertenecer a este broker
  if (brokerId) {
    query = query.eq('broker_id', brokerId);
  }

  const { data, error: dbError } = await query.single();

  // Si no existe o no es de este broker, tiramos un error 404
  if (dbError || !data) {
    throw error(404, {
      message: 'Propiedad no encontrada'
    });
  }

  return {
    propiedad: data,
    brokerActivo: brokerId
  };
}
