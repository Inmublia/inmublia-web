import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', locals.user.email)
    .single();

  if (brokerError || !broker) {
    return { broker: null, leads: [] };
  }

  const { data: leads, error: leadsError } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (*), lead_notas (*)`)
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  const leadsProcesados = (leads || []).map(lead => {
    const notas = lead.lead_notas || [];
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    return { ...lead, lead_notas: notasOrdenadas };
  });

  return { broker, leads: leadsProcesados };
};

export const actions = {
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    const { error } = await locals.supabase.from('leads').update({ estado }).eq('id', id).eq('broker_id', broker.id);
    if (error) return fail(500, { error: 'Fallo al mover' });
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await locals.supabase.from('leads').delete().eq('id', id).eq('broker_id', broker.id);
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

    // FIX MAESTRO DE BASE DE DATOS: 
    // Añadido 'broker_id: broker.id' que satisface la Foreign Key "lead_notas_broker_id_fkey"
    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({ 
        lead_id: leadId, 
        broker_id: broker.id, 
        contenido: contenido.trim(), 
        tipo: 'nota' 
      });

    if (notaError) {
       return fail(500, { error: `Supabase Error: ${notaError.message}` });
    }

    const { data: lead } = await locals.supabase.from('leads').select('estado').eq('id', leadId).single();
    if (lead && lead.estado === 'nuevo') {
      await locals.supabase.from('leads').update({ estado: 'contactado' }).eq('id', leadId);
    }

    return { success: true };
  }
};
