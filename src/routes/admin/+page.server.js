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
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Buscamos al broker asignado por correo
    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) {
      throw redirect(303, '/login?error=broker-not-found');
    }

    // 2. Extracción relacional de propiedades y open_houses
    const { data: propiedades, error: propError } = await supabaseAdmin
      .from('propiedades')
      .select('*, open_houses(id, event_date)')
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

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
    if (isRedirect(err) || isHttpError(err)) {
      throw err;
    }
    console.error('Error crítico no controlado en consola admin:', err);
    throw error(500, {
      message: 'Fallo de conectividad al intentar cargar el tablero de control.',
      details: err?.message || 'Error de entorno'
    });
  }
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
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
