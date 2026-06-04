import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail } from '@sveltejs/kit';

// 1. Instanciamos el Cliente de Servidor Confiable dinámicamente
// Esto bypasa el RLS por diseño y es compatible con el Build de Cloudflare
const getSupabaseAdmin = () => {
  return createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

export async function load({ locals }) {
  // Verificamos que el hook de SvelteKit validó la cookie de sesión
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const supabaseAdmin = getSupabaseAdmin();

  // 2. Buscamos al broker (Asegúrate de que el correo EXISTA en tu tabla brokers)
  const { data: broker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) {
    console.error("El correo del usuario logeado no existe en la tabla brokers:", user.email);
    throw redirect(303, '/login?error=broker-not-found');
  }

  // 3. Traemos los prospectos cruzando la información con la tabla de propiedades.
  // El .select('*, propiedades(titulo)') es lo que nos trae el nombre real.
  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('*, propiedades(titulo)')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    leads: leads || []
  };
}

export const actions = {
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const leadId = formData.get('id');
    const nuevoEstado = formData.get('estado');

    if (!leadId || !nuevoEstado) return fail(400, { error: 'Datos incompletos' });

    const { error } = await supabaseAdmin
      .from('leads')
      .update({ estado: nuevoEstado })
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    const leadId = formData.get('id');

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  }
};
