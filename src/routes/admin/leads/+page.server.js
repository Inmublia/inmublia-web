import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // 1. EL FIX MAESTRO: Buscamos al broker por su EMAIL (relación correcta)
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', locals.user.email)
    .single();

  if (brokerError || !broker) {
    console.error('🔥 Error al consultar perfil de broker:', brokerError?.message);
    // Si no encuentra el broker, al menos no crashea la página
    return { broker: null, leads: [] };
  }

  // 2. Traemos los leads usando el ID real del broker (broker.id)
  const { data: leads, error: leadsError } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (*), lead_notas (*)`)
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  if (leadsError) {
    console.error('🔥 Error al cargar leads desde Supabase:', leadsError.message);
  }

  const leadsProcesados = (leads || []).map(lead => {
    const notas = lead.lead_notas || [];
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    return { ...lead, lead_notas: notasOrdenadas };
  });

  return {
    broker,
    leads: leadsProcesados
  };
};

export const actions = {
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    // Obtenemos el broker.id real antes de actualizar
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    const { error } = await locals.supabase
      .from('leads').update({ estado }).eq('id', id).eq('broker_id', broker.id);

    if (error) return fail(500, { error: 'Fallo al mover' });
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await locals.supabase
      .from('leads').delete().eq('id', id).eq('broker_id', broker.id);

    if (error) return fail(500, { error: 'Fallo al eliminar' });
    return { success: true };
  },

  guardarNota: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) return fail(400, { error: 'Nota vacía' });

    const { data: lead, error: checkError } = await locals.supabase
      .from('leads').select('id, estado').eq('id', leadId).eq('broker_id', broker.id).maybeSingle();

    if (checkError || !lead) return fail(403, { error: 'No autorizado' });

    const { error: notaError } = await locals.supabase
      .from('lead_notas').insert({ lead_id: leadId, broker_id: broker.id, contenido: contenido.trim(), tipo: 'nota' });

    if (notaError) return fail(500, { error: 'Fallo interno' });

    if (lead.estado === 'nuevo') {
      await locals.supabase.from('leads').update({ estado: 'contactado' }).eq('id', leadId).eq('broker_id', broker.id);
    }

    return { success: true };
  }
};
