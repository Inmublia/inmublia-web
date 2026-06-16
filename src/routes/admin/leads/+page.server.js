import { fail, redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (brokerError || !broker) {
    console.error('🔥 Error al consultar perfil de broker:', brokerError?.message);
    return { broker: null, leads: [] };
  }

  const { data: leads, error: leadsError } = await locals.supabase
    .from('leads')
    .select(`*, propiedades (*), lead_notas (*)`)
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  if (leadsError) {
    console.error('🔥 Error al cargar leads:', leadsError.message);
  }

  const now = new Date();

  const leadsProcesados = (leads || []).map(lead => {
    const notas = lead.lead_notas || [];
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    
    // Motor analítico: Detectar si hay un recordatorio pendiente
    const pendingReminders = notasOrdenadas.filter(n => 
      n.tipo === 'recordatorio' && 
      n.completado === false && 
      new Date(n.fecha_recordatorio) <= now
    );

    return { 
      ...lead, 
      lead_notas: notasOrdenadas,
      has_pending_reminder: pendingReminders.length > 0 
    };
  });

  return {
    broker,
    leads: leadsProcesados
  };
};

export const actions = {
  actualizar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
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

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await locals.supabase.from('leads').delete().eq('id', id).eq('broker_id', broker.id);
    if (error) return fail(500, { error: 'Fallo al eliminar' });
    return { success: true };
  },

  guardarNota: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');
    const isRecordatorio = formData.get('is_recordatorio') === 'true';
    const fechaRecordatorio = formData.get('fecha_recordatorio');

    if (!contenido || !contenido.trim()) return fail(400, { error: 'Nota vacía' });

    const { data: lead, error: checkError } = await locals.supabase.from('leads').select('id, estado').eq('id', leadId).eq('broker_id', broker.id).maybeSingle();
    if (checkError || !lead) return fail(403, { error: 'No autorizado para este lead' });

    // CORRECCIÓN DE LA LLAVE FORÁNEA: Regresamos a locals.user.id
    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({ 
        lead_id: leadId, 
        broker_id: locals.user.id, // <-- ¡Corregido! 
        contenido: contenido.trim(), 
        tipo: isRecordatorio ? 'recordatorio' : 'nota',
        fecha_recordatorio: isRecordatorio ? fechaRecordatorio : null,
        completado: false
      });

    if (notaError) {
      console.error("🔥 Error Supabase Notas:", notaError);
      return fail(500, { error: `Supabase Error: ${notaError.message}` });
    }

    if (lead.estado === 'nuevo') {
      await locals.supabase.from('leads').update({ estado: 'contactado' }).eq('id', leadId).eq('broker_id', broker.id);
    }

    return { success: true };
  },

  completarRecordatorio: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    // Esta función no inserta, solo actualiza, así que podemos mantener broker.id si no afecta, 
    // pero para asegurar consistencia, si 'broker_id' es el UUID en esta tabla, usamos locals.user.id.
    const formData = await request.formData();
    const notaId = formData.get('nota_id');

    const { error } = await locals.supabase.from('lead_notas').update({ completado: true }).eq('id', notaId).eq('broker_id', locals.user.id);
    if (error) return fail(500, { error: 'Fallo al completar' });
    return { success: true };
  }
};
