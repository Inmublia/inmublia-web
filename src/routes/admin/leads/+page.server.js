// src/routes/admin/leads/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { calcularScore } from '$lib/scoring.js'; // 🚀 Importamos el motor analítico

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // 🚀 BYPASS RLS: Inyectamos Cliente Dios para el God Mode
  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Buscamos el ID correcto (El tuyo, o el del cliente si estás impersonando)
  let query = db.from('brokers').select('*');
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', locals.user.id);
  }

  const { data: broker, error: brokerError } = await query.single();

  if (brokerError || !broker) {
    console.error('🔥 Error al consultar perfil de broker:', brokerError?.message);
    return { broker: null, leads: [], propiedades: [] };
  }

  // 🚀 Filtro de propiedades para el selector del modal
  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo')
    .eq('broker_id', broker.id)
    .neq('estatus', 'Vendida')
    .order('creado_en', { ascending: false });

  // 2. Traemos todos los prospectos
  const { data: leads, error: leadsError } = await db
    .from('leads')
    .select(`*, propiedades (*), lead_notas (*)`)
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  if (leadsError) {
    console.error('🔥 Error al cargar leads:', leadsError.message);
  }

  const now = new Date();

  // PROCESAMIENTO Y SCORING DE CADA LEAD
  const leadsProcesados = (leads || []).map(lead => {
    const notas = lead.lead_notas || [];
    const notasOrdenadas = [...notas].sort((a, b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
    
    const pendingReminders = notasOrdenadas.filter(n => 
      n.tipo === 'recordatorio' && 
      n.completado === false && 
      new Date(n.fecha_recordatorio) <= now
    );

    // 🚀 Inyectamos el objeto tridimensional completo
    const scoreObj = calcularScore({ ...lead, lead_notas: notasOrdenadas });

    return { 
      ...lead, 
      lead_notas: notasOrdenadas,
      has_pending_reminder: pendingReminders.length > 0,
      scoreObj: scoreObj
    };
  });

  return {
    broker,
    leads: leadsProcesados,
    propiedades: propiedades || []
  };
};

export const actions = {
  crearLeadManual: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización.' });
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const nombre = formData.get('nombre')?.toString().trim();
    const telefono = formData.get('telefono')?.toString().trim();
    const correo = formData.get('correo')?.toString().trim();
    const origen = formData.get('origen')?.toString().trim() || 'Manual';
    const propiedadId = formData.get('propiedad_id')?.toString();
    const notaInicial = formData.get('nota_inicial')?.toString().trim();

    if (!nombre) return fail(400, { error: 'El nombre es obligatorio.' });

    const nuevoLead = {
      broker_id: broker.id,
      nombre,
      telefono: telefono || null,
      correo: correo || null,
      origen,
      estado: 'nuevo',
      propiedad_id: propiedadId && propiedadId !== 'ninguna' ? propiedadId : null,
      ultima_actividad: new Date().toISOString()
    };

    const { data: leadCreado, error: insertError } = await locals.supabase
      .from('leads')
      .insert(nuevoLead)
      .select('id')
      .single();

    if (insertError) {
      console.error('🔥 Error insertando lead manual:', insertError);
      return fail(500, { error: `Error DB al crear prospecto: ${insertError.message}` });
    }

    if (notaInicial && leadCreado) {
      await locals.supabase.from('lead_notas').insert({
        lead_id: leadCreado.id,
        broker_id: locals.user.id,
        contenido: notaInicial,
        tipo: 'nota',
        completado: false
      });
    }

    return { success: true };
  },

  actualizar: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización: No puedes alterar los prospectos del cliente.' });
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');
    const estado = formData.get('estado');

    const precioCierre = formData.get('precio_cierre');
    const comisionCierre = formData.get('comision_cierre');

    let actualizaciones = { 
        estado,
        ultima_actividad: new Date().toISOString() 
    };
    
    if (estado === 'cerrado') {
        actualizaciones.precio_cierre = precioCierre ? parseFloat(precioCierre) : null;
        actualizaciones.comision_cierre = comisionCierre ? parseFloat(comisionCierre) : null;
    }

    const { error } = await locals.supabase.from('leads').update(actualizaciones).eq('id', id).eq('broker_id', broker.id);
    if (error) {
        console.error('🔥 Error DB al mover lead:', error);
        return fail(500, { error: `Error DB al mover: ${error.message}` });
    }
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
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
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización: No puedes agregar notas al cliente.' });
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
    if (checkError || !lead) return fail(403, { error: 'No autorizado' });

    const { error: notaError } = await locals.supabase
      .from('lead_notas')
      .insert({ 
        lead_id: leadId, 
        broker_id: locals.user.id, 
        contenido: contenido.trim(), 
        tipo: isRecordatorio ? 'recordatorio' : 'nota',
        fecha_recordatorio: isRecordatorio ? fechaRecordatorio : null,
        completado: false
      });

    if (notaError) {
        console.error('🔥 Error Crítico Insertando Nota:', notaError);
        return fail(500, { error: `Fallo BD (Insertar Nota): ${notaError.message}` });
    }

    let actualizacionesLead = { 
        ultima_actividad: new Date().toISOString()
    };

    if (lead.estado === 'nuevo') {
      actualizacionesLead.estado = 'contactado';
    }

    const { error: updateError } = await locals.supabase.from('leads').update(actualizacionesLead).eq('id', leadId).eq('broker_id', broker.id);
    
    if (updateError) {
        console.error('🔥 Error Crítico Actualizando Reloj Lead:', updateError);
        return fail(500, { error: `Fallo BD (Reloj Lead): ${updateError.message}` });
    }

    return { success: true };
  },

  completarRecordatorio: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
    if (!locals.user) return fail(401, { error: 'No autorizado' });
    const formData = await request.formData();
    const notaId = formData.get('nota_id');

    const { error } = await locals.supabase.from('lead_notas').update({ completado: true }).eq('id', notaId).eq('broker_id', locals.user.id);
    if (error) return fail(500, { error: `Fallo BD: ${error.message}` });
    return { success: true };
  }
};
