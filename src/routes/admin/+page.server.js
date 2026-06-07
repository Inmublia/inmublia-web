import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail, error, isRedirect, isHttpError } from '@sveltejs/kit';

let supabaseAdminInstance = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      publicEnv.PUBLIC_SUPABASE_URL,
      privateEnv.SUPABASE_SERVICE_ROLE_KEY,
      { 
        auth: { 
          persistSession: false,
          autoRefreshToken: false,  // CRÍTICO: Previene cuelgues en Cloudflare
          detectSessionInUrl: false
        } 
      }
    );
  }
  return supabaseAdminInstance;
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) throw redirect(303, '/login?error=broker-not-found');

    const { data: propiedades, error: propError } = await supabaseAdmin
      .from('propiedades')
      .select('*, open_houses(id, event_date)')
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) {
      console.error('🔥 Error:', propError.message);
      throw error(500, { message: 'Fallo de inventario' });
    }

    return { broker, propiedades: propiedades || [] };

  } catch (err) {
    if (isRedirect(err) || isHttpError(err)) throw err;
    throw error(500, { message: 'Fallo de conectividad' });
  }
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    try {
      const formData = await request.formData();
      const id = formData.get('id');
      const supabaseAdmin = getSupabaseAdmin();

      const { data: broker, error: brokerError } = await supabaseAdmin
        .from('brokers').select('id').eq('email', user.email).single();

      if (brokerError || !broker) return fail(403, { error: 'No autorizado' });

      const { error: deleteError } = await supabaseAdmin
        .from('propiedades').delete().eq('id', id).eq('broker_id', broker.id); 

      if (deleteError) return fail(500, { error: deleteError.message });
      return { success: true };
      
    } catch (err) {
      return fail(500, { error: 'Error del servidor' });
    }
  }
};
