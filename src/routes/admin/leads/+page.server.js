// src/routes/admin/leads/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { calcularScore } from '$lib/scoring.js';

// 🚀 LOGÍSTICA DE IA
const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/ibm/granite-4.0-h-micro',
  '@cf/google/gemma-4-26b-a4b-it'
];

function getRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

function parseAiResponse(result) {
  const raw = result?.response ?? result;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') throw new Error('La IA no devolvió formato de texto.');

  let cleanedStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanedStr.indexOf('{');
  const lastBrace = cleanedStr.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) throw new Error('No se detectó un objeto JSON en la respuesta.');
  
  cleanedStr = cleanedStr.substring(firstBrace, lastBrace + 1);
  cleanedStr = cleanedStr.replace(/\n/g, '\\n').replace(/\r/g, '');
  
  try {
    return JSON.parse(cleanedStr);
  } catch (err) {
    throw new Error('JSON malformado devuelto por la IA.');
  }
}

async function reserveAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('reservar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const reservation = getRpcRow(data);
  if (error || !reservation?.reserved) return null;
  return reservation;
}

async function confirmAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('confirmar_consumo_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const confirmation = getRpcRow(data);
  return !error && confirmation?.confirmed === true;
}

async function refundAiCredit(supabase, userId, requestId) {
  const { error } = await supabase.rpc('reembolsar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  if (error) console.error('[Refund Error]', { requestId, message: error.message });
}

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

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

  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo')
    .eq('broker_id', broker.id)
    .neq('estatus', 'Vendida')
    .order('creado_en', { ascending: false });

  const { data: leads, error: leadsError } = await db
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
    
    const pendingReminders = notasOrdenadas.filter(n => 
      n.tipo === 'recordatorio' && 
      n.completado === false && 
      new Date(n.fecha_recordatorio) <= now
    );

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

        const { data: leadData } = await locals.supabase.from('leads').select('propiedad_id').eq('id', id).single();
        
        if (leadData && leadData.propiedad_id) {
            await locals.supabase.from('propiedades').update({ estatus: 'Vendida' }).eq('id', leadData.propiedad_id);
        }
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
  },

  generarScriptWhatsapp: async ({ request, locals, platform }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });
    if (!platform?.env?.AI) return fail(503, { error: 'Motor de IA offline.' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');

    const { data: broker } = await locals.supabase.from('brokers').select('id, ia_creditos_disponibles').eq('auth_user_id', user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });
    
    if ((broker.ia_creditos_disponibles || 0) <= 0) {
        return fail(403, { error: 'Has alcanzado el límite de créditos IA de tu plan actual.' });
    }

    const { data: lead } = await locals.supabase
        .from('leads')
        .select(`*, propiedades(titulo), lead_notas(contenido, tipo, creado_en)`)
        .eq('id', leadId)
        .eq('broker_id', broker.id)
        .single();

    if (!lead) return fail(404, { error: 'Prospecto no encontrado.' });

    const requestId = crypto.randomUUID();
    const reservation = await reserveAiCredit(locals.supabase, user.id, requestId);
    if (!reservation) return fail(403, { error: 'No tienes créditos de IA o existe un error transaccional.' });

    let creditConfirmed = false;
    let finalContent = null;
    let errorLog = [];

    try {
        const notasRecientes = (lead.lead_notas || [])
            .sort((a,b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime())
            .slice(-5)
            .map(n => `- ${n.tipo.toUpperCase()}: ${n.contenido}`)
            .join('\n');

        // 🚀 PROMPT COLABORATIVO (Anti-vendedor agresivo)
        const systemPrompt = [
            'Eres un Asesor Inmobiliario Senior en México experto en atención al cliente.',
            'Redacta un mensaje de seguimiento (follow-up) para enviarlo por WhatsApp al prospecto.',
            'REGLAS ESTRICTAS:',
            '1. Tono sumamente cálido, servicial y profesional. Cero agresividad comercial.',
            '2. Lee el historial de interacciones y adáptate. Si ya hay historial, no lo saludes como si no se conocieran.',
            '3. MUY BREVE: Máximo 2 oraciones directas.',
            '4. Cierra SIEMPRE mostrando total disposición para ayudar, resolver dudas o acompañarlo en su proceso (ej. "Quedo a tu entera disposición para cualquier duda", "¿Te puedo ayudar con algo más en tu búsqueda?"). Mantén la puerta abierta al diálogo sin presionar.',
            '5. Usa máximo 1 emoji en todo el texto.',
            '6. Responde EXCLUSIVAMENTE con un objeto JSON válido.',
            'FORMATO REQUERIDO:',
            '{',
            '  "whatsapp": "Texto exacto listo para enviar al cliente."',
            '}'
        ].join(' ');

        const userPrompt = `DATOS DEL PROSPECTO:
- Nombre: ${lead.nombre}
- Etapa en el Embudo: ${lead.estado.toUpperCase()}
- Propiedad de Interés: ${lead.propiedades ? lead.propiedades.titulo : 'Búsqueda General'}
- Últimas interacciones:
${notasRecientes || 'Lead completamente nuevo, sin interacciones previas.'}

Genera el mensaje ideal para darle seguimiento y ofrecer ayuda.`;

        for (const modelId of MODELS_CASCADE) {
            try {
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.7 
                });

                const parsed = parseAiResponse(result);
                if (!parsed || !parsed.whatsapp) throw new Error('Respuesta IA incompleta');
                finalContent = parsed;
                break;
            } catch (err) {
                errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
                finalContent = null;
            }
        }

        if (!finalContent) throw new Error(`Cascada agotada. Errores: ${errorLog.join(' | ')}`);

        const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);
        if (!confirmed) throw new Error('Fallo al confirmar consumo de crédito IA.');
        
        creditConfirmed = true;

        return { success: true, whatsapp: finalContent.whatsapp };

    } catch (error) {
        if (!creditConfirmed) {
            await refundAiCredit(locals.supabase, user.id, requestId);
        }
        console.error('[WhatsApp IA Error]', errorLog.length ? errorLog : error.message);
        
        // 🚀 SANITIZACIÓN DE ERRORES: Mensaje limpio para el usuario
        return fail(502, { error: 'El redactor de IA está temporalmente saturado. Por favor, inténtalo de nuevo en unos segundos.' });
    }
  }
};
