import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // CORRECCIÓN: Búsqueda estricta por ID de Autenticación
  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!broker) {
      console.error("No se encontró broker asociado al token:", user.id);
      throw redirect(303, '/login');
  }

  // Traemos todas sus notificaciones ordenadas por las más recientes
  const { data: notificaciones, error } = await locals.supabase
    .from('notificaciones_agente')
    .select('*')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error("🔥 Error recuperando alertas:", error);
  }

  return {
    notificaciones: notificaciones || []
  };
}

export const actions = {
  marcarLeida: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    // Seguridad: Obtenemos el broker para evitar manipulación cruzada de alertas
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');

    if (!id) return fail(400, { error: 'ID de notificación requerido.' });

    // Actualización validando que la alerta pertenezca al broker
    const { error } = await locals.supabase
      .from('notificaciones_agente')
      .update({ leida: true })
      .eq('id', id)
      .eq('broker_id', broker.id);

    if (error) {
      return fail(500, { error: `No se pudo actualizar: ${error.message}` });
    }

    return { success: true };
  },

  marcarTodasLeidas: async ({ locals }) => {
    const user = locals.user;
    if (!user) return fail(401);

    // CORRECCIÓN: Búsqueda estricta por ID de Autenticación
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(404);

    const { error } = await locals.supabase
      .from('notificaciones_agente')
      .update({ leida: true })
      .eq('broker_id', broker.id)
      .eq('leida', false);

    if (error) {
      return fail(500, { error: `Error masivo: ${error.message}` });
    }

    return { success: true };
  }
};
