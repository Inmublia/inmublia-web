import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  // 1. Validar identidad usando el user que ya validó el hook
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // 2. Obtener los datos del perfil del broker de forma segura (sin riesgo de crash 500)
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('id', locals.user.id)
    .maybeSingle();

  if (brokerError) {
    console.error('🔥 Error al consultar perfil de broker:', brokerError.message);
  }

  // 3. Consulta Relacional Élite: Traemos leads, propiedad y bitácora
  const { data: leads, error: leadsError } = await locals.supabase
    .from('leads')
    .select(`
      *,
      propiedades (*),
      lead_notas (*)
    `)
    .eq('broker_id', locals.user.id)
    .order('creado_en', { ascending: false });

  if (leadsError) {
    console.error('🔥 Error al cargar leads con relaciones desde Supabase:', leadsError.message);
  }

  // 4. Ordenamos las notas (la más reciente arriba) en memoria de forma segura
  const leadsProcesados = (leads || []).map(lead => {
    const notas = lead.lead_notas || [];
    // Ordenamos sobre una copia del array para no mutar el payload original
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
    
    return {
      ...lead,
      lead_notas: notasOrdenadas
    };
  });

  return {
    broker: broker || { nombre_comercial: 'Asesor Inmublia' },
    leads: leadsProcesados
  };
};

export const actions = {
  // Mueve tarjetas Kanban (Blindado contra IDOR)
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    // Forzamos que el lead pertenezca obligatoriamente al broker autenticado
    const { error } = await locals.supabase
      .from('leads')
      .update({ estado })
      .eq('id', id)
      .eq('broker_id', locals.user.id);

    if (error) {
      console.error('🔥 Error en Server Action actualizar:', error.message);
      return fail(500, { error: 'No se pudo mover el prospecto.' });
    }

    return { success: true };
  },

  // Elimina prospectos (Blindado contra IDOR)
  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const id = formData.get('id');

    // Forzamos validación de broker_id antes de borrar
    const { error } = await locals.supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .eq('broker_id', locals.user.id);

    if (error) {
      console.error('🔥 Error en Server Action eliminar:', error.message);
      return fail(500, { error: 'No se pudo eliminar.' });
    }

    return { success: true };
  },

  // CAPTURA DE BITÁCORA Y AVANCE EN FUNNEL (Blindado contra IDOR)
  guardarNota: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) {
      return fail(400, { error: 'El contenido de la nota no puede estar vacío.' });
    }

    // 1. Verificación previa de pertenencia (Evita inyección de notas en leads ajenos)
    const { data: lead, error: checkError } = await locals.supabase
      .from('leads')
      .select('id, estado')
      .eq('id', leadId)
      .eq('broker_id', locals.user.id)
      .maybeSingle();

    if (checkError || !lead) {
      return fail(403, { error: 'No tienes autorización sobre este prospecto.' });
    }

    // 2. Guardamos el registro histórico de forma segura
    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({
        lead_id: leadId,
        broker_id: locals.user.id,
        contenido: contenido.trim(),
        tipo: 'nota'
      });

    if (notaError) {
      console.error('🔥 Error crítico insertando nota en Supabase:', notaError.message);
      return fail(500, { error: 'Error interno al escribir la anotación.' });
    }

    // 3. AUTOMATIZACIÓN INVISIBLE: Pasar a "contactado" de forma segura
    if (lead.estado === 'nuevo') {
      await locals.supabase
        .from('leads')
        .update({ estado: 'contactado' })
        .eq('id', leadId)
        .eq('broker_id', locals.user.id);
    }

    return { success: true };
  }
};
