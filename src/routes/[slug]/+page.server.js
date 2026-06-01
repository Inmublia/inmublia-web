import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
  const hostname = url.hostname;
  let subdominioActivo = null;
  let brokerData = null;

  if (hostname.includes('.inmublia.com') && !hostname.startsWith('www.')) {
    subdominioActivo = hostname.replace('.inmublia.com', '');
  }

  let query = supabase
    .from('propiedades')
    .select('*')
    .eq('slug', params.slug);

  if (subdominioActivo) {
    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('*')
      .eq('subdominio', subdominioActivo)
      .single();

    if (!brokerError && broker) {
      brokerData = broker;
      query = query.eq('broker_id', broker.id);
    } else {
      throw error(404, { message: 'Broker no encontrado' });
    }
  }

  const { data: propiedad, error: dbError } = await query.maybeSingle();

  if (dbError || !propiedad) {
    throw error(404, { message: 'Propiedad no encontrada' });
  }

  return {
    propiedad,
    broker: brokerData
  };
}
