export async function load({ setHeaders, locals }) {
  // 1. ELIMINACIÓN DE CACHÉ PARA GARANTIZAR DISEÑOS FRESCOS EN EL EDGE
  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  // 2. EXTRAER SUBDOMINIO DESDE LOS LOCALS (Inyectado por el Worker de Cloudflare)
  const subdominioActivo = locals.subdominio_publico;
  let brokerData = null;

  // 3. USAR EL CLIENTE DINÁMICO (locals.supabase) EN LUGAR DEL ESTÁTICO
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
      // Si hay un subdominio en la URL pero no existe en la base de datos
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
