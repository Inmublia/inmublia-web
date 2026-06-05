import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail, error, isRedirect, isHttpError } from '@sveltejs/kit';

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

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Buscamos al broker
    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) {
      // SvelteKit maneja este redirect como una excepción especial bajo el capó
      throw redirect(303, '/login?error=broker-not-found');
    }

    // 2. Traemos las propiedades cruzando la tabla de open_houses
    const { data: propiedades, error: propError } = await supabaseAdmin
      .from('propiedades')
      .select('*, open_houses(id, event_date)') // Tu cruce mágico intacto
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    // Si Supabase devuelve un error en la consulta (ej. tabla caída)
    if (propError) {
      console.error('Error de Supabase al consultar propiedades:', propError);
      throw error(500, {
        message: 'No pudimos sincronizar el inventario con el servidor principal.',
        details: propError.message
      });
    }

    return {
      broker,
      propiedades: propiedades || []
    };

  } catch (err) {
    // EL BLINDAJE ENTERPRISE:
    // Si la excepción es una redirección (ej. login) o un error de SvelteKit, la dejamos pasar.
    if (isRedirect(err) || isHttpError(err)) {
      throw err;
    }

    // Si es un error desconocido de infraestructura (Cloudflare Edge, red caída, etc)
    console.error('Error crítico no controlado en consola admin:', err);
    throw error(500, {
      message: 'Fallo de conectividad al intentar cargar el tablero de control.',
      details: err?.message || 'Error de entorno'
    });
  }
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    // Tu acción queda exactamente igual, pero la aseguramos un poco
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    try {
      const formData = await request.formData();
      const id = formData.get('id');
      const supabaseAdmin = getSupabaseAdmin();
      
      const { error } = await supabaseAdmin.from('propiedades').delete().eq('id', id);
      
      if (error) return fail(500, { error: error.message });
      return { success: true };
      
    } catch (err) {
      console.error('Error al ejecutar la acción de eliminar:', err);
      return fail(500, { error: 'Error interno del servidor al procesar la solicitud.' });
    }
  }
};
