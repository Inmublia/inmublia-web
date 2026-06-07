import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail, error, isRedirect, isHttpError } from '@sveltejs/kit';

// Singleton modular para optimizar conexiones en entornos serverless (Cloudflare Edge)
let supabaseAdminInstance = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(
      publicEnv.PUBLIC_SUPABASE_URL,
      privateEnv.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
  }
  return supabaseAdminInstance;
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Buscamos al broker (Filtro seguro por el email autenticado en locals)
    const { data: broker, error: brokerError } = await supabaseAdmin
      .from('brokers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) {
      throw redirect(303, '/login?error=broker-not-found');
    }

    // 2. Traemos las propiedades cruzando la tabla de open_houses de forma segura
    const { data: propiedades, error: propError } = await supabaseAdmin
      .from('propiedades')
      .select('*, open_houses(id, event_date)')
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) {
      console.error('🔥 Error de Supabase al consultar propiedades:', propError.message);
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

    console.error('🔥 Error crítico no controlado en consola admin:', err);
    throw error(500, {
      message: 'Fallo de conectividad al intentar cargar el tablero de control.',
      details: err instanceof Error ? err.message : 'Error de entorno'
    });
  }
}

export const actions = {
  // Acción blindada contra secuestro de datos (IDOR)
  eliminar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    try {
      const formData = await request.formData();
      const id = formData.get('id');
      const supabaseAdmin = getSupabaseAdmin();

      // 1. Resolvemos el ID de broker de forma interna usando la sesión segura del usuario
      const { data: broker, error: brokerError } = await supabaseAdmin
        .from('brokers')
        .select('id')
        .eq('email', user.email)
        .single();

      if (brokerError || !broker) {
        return fail(403, { error: 'Perfil de broker no encontrado o no autorizado.' });
      }

      // 2. Ejecutamos la eliminación condicionando tanto al ID del objeto como al ID del Broker
      // Esto previene que un broker altere el inventario de otro modificando el payload del formulario
      const { error: deleteError } = await supabaseAdmin
        .from('propiedades')
        .delete()
        .eq('id', id)
        .eq('broker_id', broker.id); 

      if (deleteError) {
        console.error('🔥 Error eliminando propiedad:', deleteError.message);
        return fail(500, { error: deleteError.message });
      }

      return { success: true };
      
    } catch (err) {
      console.error('🔥 Error fatal ejecutando la acción de eliminar:', err);
      return fail(500, { error: 'Error interno del servidor al procesar la solicitud.' });
    }
  }
};
