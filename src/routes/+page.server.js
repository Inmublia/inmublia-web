import { supabase } from '$lib/supabase';

export async function load({ url }) {
  const hostname = url.hostname;
  let subdominioActivo = null;
  let brokerData = null;

  // Detectar si estamos en un subdominio de marca blanca (ej: broker-juan.inmublia.com)
  if (hostname.includes('.inmublia.com') && !hostname.startsWith('www.')) {
    subdominioActivo = hostname.replace('.inmublia.com', '');
  }

  let query = supabase.from('propiedades').select('*');

  if (subdominioActivo) {
    // 1. Buscar los datos reales del broker por su subdominio
    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('*')
      .eq('subdominio', subdominioActivo)
      .single();

    if (!brokerError && broker) {
      brokerData = broker;
      // 2. Filtrar propiedades usando el UUID relacional del broker
      query = query.eq('broker_id', broker.id);
    } else {
      // Si el subdominio no existe en la base de datos, retornamos vacío
      return { propiedades: [], broker: null };
    }
  }

  const { data: propiedades, error: propError } = await query;

  if (propError) {
    console.error('Error al consultar propiedades:', propError.message);
    return { propiedades: [], broker: brokerData };
  }

  return {
    propiedades: propiedades || [],
    broker: brokerData
  };
}
