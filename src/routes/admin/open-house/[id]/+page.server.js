import { fail, redirect, error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // 1. Autenticación estricta
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('id, nombre_comercial, subdominio')
    .eq('auth_user_id', user.id)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // 2. Carga del evento asegurando que el broker es el dueño
  const { data: oh, error: ohError } = await locals.supabase
    .from('open_houses')
    .select('*, propiedades(*)')
    .eq('id', params.id)
    .eq('broker_id', broker.id) // <- CANDADO DE SEGURIDAD
    .single();

  if (ohError || !oh) throw error(404, 'Evento no encontrado o no tienes permisos.');

  // 3. Carga de los asistentes
  const { data: attendees } = await locals.supabase
    .from('open_house_attendees')
    .select('*')
    .eq('open_house_id', params.id)
    .order('creado_en', { ascending: false });

  return {
    attendeesDb: attendees || [],
    event: {
      id: oh.id,
      title: oh.title,
      address: oh.propiedades?.ubicacion || 'Dirección General',
      date: oh.event_date,
      timeStart: oh.time_start,
      timeEnd: oh.time_end,
      maxCapacity: oh.max_capacity,
      benefit: oh.benefit,
      description: oh.description,
      agent: {
        name: broker.nombre_comercial,
        url: `${broker.subdominio}.inmublia.com`
      }
    }
  };
}

// Helper interno para validar que el asistente pertenece a un evento de este broker
async function verifyOwnership(supabase, attendeeId, brokerId) {
  const { data: attendee } = await supabase
    .from('open_house_attendees')
    .select('open_house_id')
    .eq('id', attendeeId)
    .single();
    
  if (!attendee) return false;

  const { data: oh } = await supabase
    .from('open_houses')
    .select('id')
    .eq('id', attendee.open_house_id)
    .eq('broker_id', brokerId)
    .single();

  return !!oh;
}

export const actions = {
  checkin: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403);

    const formData = await request.formData();
    const attendeeId = formData.get('attendee_id');

    // Validación de seguridad de doble capa
    const isOwner = await verifyOwnership(locals.supabase, attendeeId, broker.id);
    if (!isOwner) return fail(403, { error: 'Operación denegada.' });

    const { error: updateError } = await locals.supabase
      .from('open_house_attendees')
      .update({ checked_in: true })
      .eq('id', attendeeId);

    if (updateError) return fail(500, { error: 'No se pudo realizar el check-in' });
    return { success: true };
  },

  admitir: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403);

    const formData = await request.formData();
    const attendeeId = formData.get('attendee_id');

    const isOwner = await verifyOwnership(locals.supabase, attendeeId, broker.id);
    if (!isOwner) return fail(403, { error: 'Operación denegada.' });

    const { error: updateError } = await locals.supabase
      .from('open_house_attendees')
      .update({ status: 'confirmed' })
      .eq('id', attendeeId);

    if (updateError) return fail(500, { error: 'No se pudo admitir al prospecto' });
    return { success: true };
  },

  updateSettings: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker) return fail(403);

    const formData = await request.formData();
    const id = formData.get('id');
    const date = formData.get('date');
    const timeStart = formData.get('timeStart');
    const timeEnd = formData.get('timeEnd');
    const maxCapacity = formData.get('maxCapacity');

    const { error: updateError } = await locals.supabase
      .from('open_houses')
      .update({ 
        event_date: date, 
        time_start: timeStart, 
        time_end: timeEnd, 
        max_capacity: parseInt(maxCapacity, 10) 
      })
      .eq('id', id)
      .eq('broker_id', broker.id); // <- Aseguramos que solo edita sus eventos

    if (updateError) {
      console.error('Error al actualizar:', updateError);
      return fail(500, { error: 'No se pudieron actualizar los ajustes.' });
    }

    return { success: true };
  }
};
