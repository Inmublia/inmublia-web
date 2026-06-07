import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  // 1. Obtener los datos del perfil del broker vinculando el email de la sesión activa
  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  // 2. Consulta relacional firmada bajo RLS automática
  const { data: leads, error } = await locals.supabase
    .from('leads')
    .select(`
      *,
      propiedades (*),
      lead_notas (*)
    `)
    .eq('broker_id', broker?.id)
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('🔥 Error al cargar leads con relaciones desde Supabase:', error);
  }

  // 3. Ordenamiento de notas históricas (la más reciente al inicio)
  const leadsProcesados = (leads || []).map(lead => {
    if (lead.lead_notas) {
      lead.lead_notas.sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
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
  actualizar: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'No autorizado' });

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

  eliminar: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'No autorizado' });

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

  guardarNota: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession();
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) {
      return fail(400, { error: 'El contenido de la nota no puede estar vacío.' });
    }

    // Buscamos el id real del broker basándonos en la sesión segura
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    // 1. Inserción de nota en bitácora
    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({
        lead_id: leadId,
        broker_id: broker?.id,
        contenido: contenido.trim(),
        tipo: 'nota'
      });

    if (notaError) {
      console.error('🔥 Error crítico insertando nota en Supabase:', notaError);
      return fail(500, { error: 'Error interno al escribir la anotación.' });
    }

    // 2. AUTOMATIZACIÓN: Transición de estado de "nuevo" a "contactado"
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
