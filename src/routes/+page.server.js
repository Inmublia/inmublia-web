export async function load({ setHeaders, locals }) {
  // 1. ELIMINACIÓN DE CACHÉ PARA GARANTIZAR DISEÑOS FRESCOS EN EL EDGE
  setHeaders({
    'Cache-Control': 'no-store, max-age=0'
  });

  // 2. EXTRAER EL BROKER ID DESDE LOS LOCALS (Inyectado por el hook)
  const brokerId = locals.tenantId;

  // Si no hay brokerId, estamos en el dominio raíz (Landing Inmublia)
  if (!brokerId) {
    return { propiedades: [], broker: null };
  }

  // 3. CARGAR DATOS DEL BROKER Y SUS PROPIEDADES ACTIVAS
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('id', brokerId)
    .single();

  if (brokerError || !broker) {
      return { propiedades: [], broker: null };
  }

  const { data: propiedades, error: propError } = await locals.supabase
      .from('propiedades')
      .select('*')
      .eq('broker_id', brokerId)
      .eq('estatus', 'Activa');

  if (propError) {
    console.error('Error al consultar propiedades:', propError.message);
  }

  return {
    propiedades: propiedades || [],
    broker: broker || null
  };
}
