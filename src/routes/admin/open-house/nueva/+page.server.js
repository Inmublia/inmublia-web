import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // CORRECCIÓN: Búsqueda estricta por ID de Autenticación usando el cliente seguro
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (brokerError || !broker) {
    console.error("No se encontró broker asociado al token:", user.id);
    throw redirect(303, '/login?error=broker-not-found');
  }

  // Obtenemos solo los títulos y IDs para el selector
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, operacion')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    propiedades: propiedades || []
  };
}

export const actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    // CORRECCIÓN: Búsqueda estricta por ID de Autenticación
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(401, { error: 'Broker no encontrado' });

    const formData = await request.formData();
    
    const propiedad_id = formData.get('propiedad_id');
    const title = formData.get('title');
    const event_date = formData.get('date');
    const time_start = formData.get('timeStart');
    const time_end = formData.get('timeEnd');
    const max_capacity = parseInt(formData.get('maxCapacity')) || 15;
    const benefit = formData.get('benefit');
    const description = formData.get('description');

    if (!propiedad_id || !title || !event_date || !time_start || !time_end || !description) {
      return fail(400, { error: 'Faltan campos obligatorios' });
    }

    // Insertamos el evento usando el cliente validado
    const { data: nuevoEvento, error: insertError } = await locals.supabase
      .from('open_houses')
      .insert([
        {
          broker_id: broker.id,
          propiedad_id: propiedad_id === 'test' ? null : propiedad_id, 
          title,
          event_date,
          time_start,
          time_end,
          max_capacity,
          benefit,
          description
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error al crear Open House:", insertError);
      return fail(500, { error: 'Error en la base de datos al guardar el evento.' });
    }

    // Redirige al Dashboard de este evento en específico
    throw redirect(303, `/admin/open-house/${nuevoEvento.id}`);
  }
};
