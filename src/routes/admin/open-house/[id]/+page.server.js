import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, error, fail } from '@sveltejs/kit';

const getSupabaseAdmin = () => {
  return createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const supabaseAdmin = getSupabaseAdmin();

  // Validamos que el Open House pertenezca al broker logeado
  const { data: oh, error: ohError } = await supabaseAdmin
    .from('open_houses')
    .select('*, propiedades(*), brokers(*)')
    .eq('id', params.id)
    .single();

  if (ohError || !oh) throw error(404, 'Evento no encontrado.');
  if (oh.brokers?.email !== user.email) throw error(403, 'No autorizado.');

  // Jalamose la lista completa de interesados registrados
  const { data: attendees } = await supabaseAdmin
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
        name: oh.brokers?.nombre_comercial,
        url: `${oh.brokers?.subdominio}.inmublia.com`
      }
    }
  };
}

export const actions = {
  // Acción para hacer Check-In manual desde la lista del Admin
  checkin: async ({ request }) => {
    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const attendeeId = formData.get('attendee_id');

    const { error: updateError } = await supabaseAdmin
      .from('open_house_attendees')
      .update({ checked_in: true })
      .eq('id', attendeeId);

    if (updateError) return fail(500, { error: 'No se pudo realizar el check-in' });
    return { success: true };
  },

  // Acción para admitir a alguien desde la lista de espera al cupo oficial
  admitir: async ({ request }) => {
    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const attendeeId = formData.get('attendee_id');

    const { error: updateError } = await supabaseAdmin
      .from('open_house_attendees')
      .update({ status: 'confirmed' })
      .eq('id', attendeeId);

    if (updateError) return fail(500, { error: 'No se pudo admitir al prospecto' });
    return { success: true };
  }
};
