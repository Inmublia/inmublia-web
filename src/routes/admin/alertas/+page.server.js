import { fail, redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!broker) throw redirect(303, '/login');

  // 1. Extraer Notificaciones del Sistema (Caja B)
  const { data: notificaciones, error: errNotif } = await locals.supabase
    .from('notificaciones_agente')
    .select('id, tipo, titulo, mensaje, leida, creado_en')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  if (errNotif) console.error("Error notificaciones:", errNotif);

  // 2. Extraer Recordatorios de Leads pendientes (Caja A)
  const { data: recordatorios, error: errRec } = await locals.supabase
    .from('lead_notas')
    .select('id, contenido, fecha_recordatorio, completado, leads(nombre)')
    .eq('broker_id', broker.id)
    .eq('tipo', 'recordatorio')
    .eq('completado', false);

  if (errRec) console.error("Error recordatorios:", errRec);

  // 3. Normalizar y Unificar el Feed
  let alertasUnificadas = [];

  if (notificaciones) {
    alertasUnificadas.push(...notificaciones.map(n => ({
      _id: n.id,
      _origen: 'sistema',
      titulo: n.titulo,
      mensaje: n.mensaje,
      estado: n.leida,
      fecha: n.creado_en,
      tipo_icono: n.tipo // para pintar distintos colores en el frontend
    })));
  }

  if (recordatorios) {
    alertasUnificadas.push(...recordatorios.map(r => ({
      _id: r.id,
      _origen: 'recordatorio',
      titulo: `Recordatorio: ${r.leads?.nombre || 'Prospecto eliminado'}`,
      mensaje: r.contenido,
      estado: r.completado,
      fecha: r.fecha_recordatorio, // Usamos la fecha en la que debe cumplirse
      tipo_icono: 'tarea'
    })));
  }

  // 4. Ordenar todo el feed cronológicamente (las más recientes o próximas a vencer primero)
  alertasUnificadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  return { 
    alertas: alertasUnificadas 
  };
}

export const actions = {
  marcarLeida: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const origen = formData.get('origen'); // 'sistema' o 'recordatorio'

    if (!id || !origen) return fail(400, { error: 'Faltan datos.' });

    // Enrutamos la actualización a la tabla correcta según el origen de la alerta
    if (origen === 'sistema') {
      const { error } = await locals.supabase.from('notificaciones_agente')
        .update({ leida: true }).eq('id', id).eq('broker_id', broker.id);
      if (error) return fail(500, { error: error.message });
    } else {
      const { error } = await locals.supabase.from('lead_notas')
        .update({ completado: true }).eq('id', id).eq('broker_id', broker.id);
      if (error) return fail(500, { error: error.message });
    }

    return { success: true };
  },

  marcarTodas: async ({ locals }) => {
    const user = locals.user;
    if (!user) return fail(401);

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker) return fail(404);

    // Limpiamos sistema
    await locals.supabase.from('notificaciones_agente')
      .update({ leida: true }).eq('broker_id', broker.id).eq('leida', false);

    // Limpiamos recordatorios vencidos hasta este exacto momento
    const now = new Date().toISOString();
    await locals.supabase.from('lead_notas')
      .update({ completado: true })
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', now);

    return { success: true };
  }
};
