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

  // 1. Buscamos al broker
  const { data: broker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) {
    throw redirect(303, '/login?error=broker-not-found');
  }

  // 2. Traemos las propiedades cruzando la tabla de open_houses
  // Así sabremos si alguna propiedad tiene un evento vinculado
  const { data: propiedades } = await supabaseAdmin
    .from('propiedades')
    .select('*, open_houses(id, event_date)') // El cruce mágico
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    propiedades: propiedades || []
  };
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    // ... (Tu acción de eliminar actual queda intacta)
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });
    const formData = await request.formData();
    const id = formData.get('id');
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('propiedades').delete().eq('id', id);
    if (error) return fail(500, { error: error.message });
    return { success: true };
  }
};
