import { redirect } from '@sveltejs/kit';

export async function load({ locals, parent }) {
  // 1. Heredamos la sesión de forma eficiente desde el +layout.server.js
  const { user } = await parent();

  if (!user) {
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    // 2. Extraemos el perfil del broker, incluyendo 'subdominio' para el botón
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id, nombre_comercial, avatar_url, subdominio, plan_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 3. LA CARGA DEL INVENTARIO: Extraemos solo las propiedades de este broker
    const { data: propiedades, error: propError } = await locals.supabase
      .from('propiedades')
      .select(`
        id, 
        titulo, 
        slug, 
        estatus, 
        precio, 
        operacion, 
        ubicacion, 
        imagen_url, 
        destacada,
        open_houses(id, event_date, time_end)
      `)
      .eq('broker_id', broker.id)
      .order('created_at', { ascending: false });

    if (propError) {
      console.error("Error cargando propiedades:", propError);
    }

    // 4. Retornamos los datos al frontend
    return {
      broker,
      propiedades: propiedades || []
    };

  } catch (err) {
    console.error("Error en inventario maestro:", err);
    return { broker: null, propiedades: [] };
  }
}
