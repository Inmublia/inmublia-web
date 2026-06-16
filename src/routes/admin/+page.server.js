import { redirect, fail, error } from '@sveltejs/kit';

export async function load({ locals }) {
  // 1. Validación de sesión estricta inyectada por el hook
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  try {
    // 2. Usar el cliente seguro (locals.supabase) con RLS activado.
    // Buscamos estrictamente por auth_user_id, no por email.
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw redirect(303, '/login?error=broker-not-found');

    // 3. Carga del inventario optimizada
    const { data: propiedades, error: propError } = await locals.supabase
      .from('propiedades')
      .select('*, open_houses(id, event_date)')
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) {
      console.error('🔥 Error de inventario:', propError.message);
      throw error(500, { message: 'Fallo al cargar el inventario' });
    }

    // 4. Devolvemos los datos limpios al frontend
    return { broker, propiedades: propiedades || [] };

  } catch (err) {
    if (err.status && err.status === 303) throw err; // Respetar redirecciones
    console.error("Error crítico en Dashboard:", err);
    throw error(500, { message: 'Fallo de conectividad con la base de datos' });
  }
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    try {
      const formData = await request.formData();
      const id = formData.get('id');
      
      // Validamos quién es el broker
      const { data: broker, error: brokerError } = await locals.supabase
        .from('brokers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (brokerError || !broker) return fail(403, { error: 'No autorizado' });

      // Eliminación segura usando RLS
      const { error: deleteError } = await locals.supabase
        .from('propiedades')
        .delete()
        .eq('id', id)
        .eq('broker_id', broker.id); 

      if (deleteError) return fail(500, { error: deleteError.message });
      
      return { success: true };
      
    } catch (err) {
      console.error("Error al eliminar propiedad:", err);
      return fail(500, { error: 'Error del servidor al intentar eliminar' });
    }
  }
};
