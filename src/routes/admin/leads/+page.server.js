import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals: { supabase } }) => {
  // 1. Validar que el broker tenga una sesión activa
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw redirect(303, '/login');
  }

  // 2. Obtener los datos del perfil del broker
  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // 3. Consulta Relacional Élite: Traemos leads, su propiedad de interés Y su bitácora de notas
  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      propiedades (*),
      lead_notas (*)
    `)
    .eq('broker_id', session.user.id)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('🔥 Error al cargar leads con relaciones desde Supabase:', error);
  }

  // 4. Ordenamos las notas de cada lead (la más reciente primero) de forma limpia en memoria
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
  // Mueve las tarjetas en el tablero Kanban
  actualizar: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    const { error } = await supabase
      .from('leads')
      .update({ estado })
      .eq('id', id);

    if (error) {
      console.error('🔥 Error en Server Action actualizar:', error);
      return fail(500, { error: 'No se pudo mover el prospecto.' });
    }

    return { success: true };
  },

  // Elimina prospectos de forma permanente
  eliminar: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('🔥 Error en Server Action eliminar:', error);
      return fail(500, { error: 'No se pudo eliminar.' });
    }

    return { success: true };
  },

  // CAPTURA, INSERTA Y AUTOMATIZA LAS NOTAS DE LA BITÁCORA
  guardarNota: async ({ request, locals: { supabase } }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) {
      return fail(400, { error: 'El contenido de la nota no puede estar vacío.' });
    }

    // 1. Guardamos el registro histórico en la tabla satélite
    const { error: notaError } = await supabase
      .from('lead_notas')
      .insert({
        lead_id: leadId,
        broker_id: session.user.id,
        contenido: contenido.trim(),
        tipo: 'nota'
      });

    if (notaError) {
      console.error('🔥 Error crítico insertando nota en Supabase:', notaError);
      return fail(500, { error: 'Error interno al escribir la anotación.' });
    }

    // 2. AUTOMATIZACIÓN INVISIBLE: Si el lead está en estado 'nuevo', 
    // el simple hecho de dejar una nota significa que ya se le atendió. Lo pasamos a 'contactado'.
    const { data: lead } = await supabase
      .from('leads')
      .select('estado')
      .eq('id', leadId)
      .single();

    if (lead && lead.estado === 'nuevo') {
      await supabase
        .from('leads')
        .update({ estado: 'contactado' })
        .eq('id', leadId);
    }

    return { success: true };
  }
};
