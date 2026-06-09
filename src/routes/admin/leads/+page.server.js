import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

// 🚀 FIX: Instancia de Cliente Admin (Service Role Key)
// Bypassea restricciones RLS restrictivas exclusivamente para Server Actions controladas
// Compatible 100% con Cloudflare Edge al no usar variables / dependencias de Node.
function getSupabaseAdmin() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
     console.error("Faltan credenciales Admin de Supabase en el entorno.");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // 1. Buscamos al broker por su EMAIL (relación correcta)
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('email', locals.user.email)
    .single();

  if (brokerError || !broker) {
    console.error('🔥 Error al consultar perfil de broker:', brokerError?.message);
    // Prevención de Crash en caso de inconsistencia relacional
    return { broker: null, leads: [] };
  }

  // 2. Traemos los leads (La visualización estándar SÍ va blindada por RLS normal)
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

    // 🚀 FIX PRINCIPAL SEGÚN ARQUITECTURA: Se invoca Admin de Supabase
    const supabaseAdmin = getSupabaseAdmin();

    const { data: broker } = await supabaseAdmin.from('brokers').select('id').eq('email', locals.user.email).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');

    if (!contenido || !contenido.trim()) return fail(400, { error: 'Nota vacía' });

    // Validación sobre el flujo controlado
    const { data: lead, error: checkError } = await supabaseAdmin
      .from('leads').select('id, estado').eq('id', leadId).eq('broker_id', broker.id).maybeSingle();

    if (checkError || !lead) return fail(403, { error: 'No autorizado o lead inexistente' });

    // 🚀 Inserción autoritaria que salta las barreras del RLS
    const { error: notaError } = await supabaseAdmin
      .from('lead_notas').insert({ lead_id: leadId, broker_id: broker.id, contenido: contenido.trim(), tipo: 'nota' });

    if (notaError) {
      console.error('🔥 Error SQL insertando la nota:', notaError.message);
      return fail(500, { error: `Fallo interno de Base de Datos: ${notaError.message}` });
    }

    // Automatización de flujo comercial en el CRM
    if (lead.estado === 'nuevo') {
      await supabaseAdmin.from('leads').update({ estado: 'contactado' }).eq('id', leadId).eq('broker_id', broker.id);
    }

    return { success: true };
  }
};
