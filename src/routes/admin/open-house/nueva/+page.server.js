import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail } from '@sveltejs/kit';

const getSupabaseAdmin = () => {
  return createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const supabaseAdmin = getSupabaseAdmin();

  const { data: broker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) {
    throw redirect(303, '/login?error=broker-not-found');
  }

  const { data: propiedades } = await supabaseAdmin
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

    const supabaseAdmin = getSupabaseAdmin();

    const { data: broker } = await supabaseAdmin
      .from('brokers')
      .select('id')
      .eq('email', user.email)
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

    const { data: nuevoEvento, error: insertError } = await supabaseAdmin
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
