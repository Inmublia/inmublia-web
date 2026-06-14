// ELIMINADO: import { supabase } from '$lib/supabase';

export async function load({ url, setHeaders, locals }) {
  // 1. ELIMINACIÓN DE CACHÉ PARA GARANTIZAR DISEÑOS FRESCOS EN EL EDGE
  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  const hostname = url.hostname;
  let subdominioActivo = null;
  let brokerData = null;

  if (hostname.includes('.inmublia.com') && !hostname.startsWith('www.')) {
    subdominioActivo = hostname.replace('.inmublia.com', '');
  }

  // 2. USAR EL CLIENTE DINÁMICO (locals.supabase) EN LUGAR DEL ESTÁTICO
  let query = locals.supabase.from('propiedades').select('*').eq('estatus', 'Activa');

  if (subdominioActivo) {
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('subdominio', subdominioActivo)
      .single();

    if (!brokerError && broker) {
      brokerData = broker;
      query = query.eq('broker_id', broker.id);
    } else {
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
