import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  // 1. Validar identidad usando el user que ya validó el hook
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // 2. Obtener los datos del perfil del broker
  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('id', locals.user.id)
    .single();

  // 3. Consulta Relacional Élite: Traemos leads, propiedad y bitácora
  const { data: leads, error } = await locals.supabase
    .from('leads')
    .select(`
      *,
      propiedades (*),
      lead_notas (*)
    `)
    .eq('broker_id', locals.user.id)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('🔥 Error al cargar leads con relaciones desde Supabase:', error);
  }

  // 4. Ordenamos las notas (la más reciente arriba) en memoria
  const leadsProcesados = (leads || []).map(lead => {
    if (lead.lead_notas) {
      lead.lead_notas.sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    } else {
      lead.lead_notas = [];
    }
    return lead;
  });

  return {
    broker,
    leads: leadsProcesados
  };
};

export const actions = {
  // Mueve tarjetas Kanban
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    const { error } = await locals.supabase
      .from('leads')
      .update({ estado })
      .eq('id', id);

    if (error) {
      console.error('🔥 Error en Server Action actualizar:', error);
      return fail(500, { error: 'No se pudo mover el prospecto.' });
    }

    return { success: true };
  },

  // Elimina prospectos
  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await locals.supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('🔥 Error en Server Action eliminar:', error);
      return fail(500, { error: 'No se pudo eliminar.' });
    }

    return { success: true };
  },

  // CAPTURA DE BITÁCORA Y AVANCE EN FUNNEL
  guardarNota: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) {
      return fail(400, { error: 'El contenido de la nota no puede estar vacío.' });
    }

    // 1. Guardamos el registro histórico
    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({
        lead_id: leadId,
        broker_id: locals.user.id,
        contenido: contenido.trim(),
        tipo: 'nota'
      });

    if (notaError) {
      console.error('🔥 Error crítico insertando nota en Supabase:', notaError);
      return fail(500, { error: 'Error interno al escribir la anotación.' });
    }

    // 2. AUTOMATIZACIÓN INVISIBLE: Pasar a "contactado"
    const { data: lead } = await locals.supabase
      .from('leads')
      .select('estado')
      .eq('id', leadId)
      .single();

    if (lead && lead.estado === 'nuevo') {
      await locals.supabase
        .from('leads')
        .update({ estado: 'contactado' })
        .eq('id', leadId);
    }

    return { success: true };
  }
};
