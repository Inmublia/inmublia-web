import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
// 🚀 V6: Importaciones del Motor SRE
import { reserveAiCredit, confirmAiCredit, releaseAiCredit, getAiGenerationOperation } from '$lib/server/ai-credits.js';
import { resolveEffectiveTenant } from '$lib/server/supabase-admin.js';
import { etapaLegible } from '$lib/utils/leads.js';

const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/mistralai/mistral-small-3.1-24b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fp8'
];

function parseAiResponse(result) {
  const raw = (result?.response ?? result ?? '').toString();
  
  const sinThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const jsonMatch = sinThinking.match(/"(?:whatsapp|WhatsApp|mensaje|message)"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (jsonMatch?.[1]) {
    return { whatsapp: jsonMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() };
  }

  const limpio = sinThinking
    .replace(/^(aquí está|aquí tienes|claro|este es el mensaje|mensaje:|here'?s?)[^:]*:\s*/i, '')
    .replace(/^```[\w]*\n?/, '').replace(/```$/, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!limpio || limpio.length < 8) {
    throw new Error('Respuesta de la IA vacía o demasiado corta tras la limpieza.');
  }

  return { whatsapp: limpio };
}

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login?m=1');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    let query = db.from('brokers').select('id, nombre_comercial, ia_creditos_disponibles, status_suscripcion, comision_default, avatar_url, whatsapp, email');
    
    if (locals.isImpersonating && locals.tenantId) {
      query = query.eq('id', locals.tenantId);
    } else {
      query = query.eq('auth_user_id', locals.user.id);
    }

    const { data: broker, error: brokerError } = await query.abortSignal(controller.signal).single();
    clearTimeout(timeoutId);

    if (brokerError || !broker) {
      console.error('🔥 Error al consultar perfil de broker:', brokerError?.message);
      return { broker: null, leads: [], propiedades: [], errorConexion: true };
    }

    const statusAdvertencia = broker.status_suscripcion?.toLowerCase() === 'past_due';

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
      propiedades: propiedades || [],
      advertenciaPago: statusAdvertencia
    };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') return { broker: null, leads: [], propiedades: [], errorConexion: true };
    throw e;
  }
};

export const actions = {
  // LAS RUTAS CREAR, ACTUALIZAR, ELIMINAR, GUARDAR NOTA y COMPLETAR RECORDATORIO
  // PERMANECEN EXACTAMENTE IGUALES, SIN TOCAR.
  crearLeadManual: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker || !broker.id) return fail(403, { error: 'Perfil no encontrado o ID corrupto' });

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
      return fail(500, { error: `Error DB al crear prospecto: ${insertError.message}` });
    }

    if (notaInicial && leadCreado) {
      const notaPayload = {
        lead_id: leadCreado.id,
        broker_id: broker.id,
        contenido: notaInicial,
        tipo: 'nota',
        completado: false
      };

      const { error: notaErr } = await locals.supabase.from('lead_notas').insert(notaPayload);

      if (notaErr && notaErr.message.includes('lead_notas_broker_id_fkey')) {
        notaPayload.broker_id = user.id; 
        await locals.supabase.from('lead_notas').insert(notaPayload);
      }
    }
    return { success: true };
  },

  actualizar: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización: No puedes alterar los prospectos.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker || !broker.id) return fail(403, { error: 'Perfil no encontrado' });

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
    if (error) return fail(500, { error: `Error DB al mover: ${error.message}` });
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker || !broker.id) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const id = formData.get('id');

    const { error } = await locals.supabase.from('leads').delete().eq('id', id).eq('broker_id', broker.id);
    if (error) return fail(500, { error: 'Fallo al eliminar' });
    return { success: true };
  },

  guardarNota: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización: No puedes agregar notas.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker || !broker.id) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');
    const contenido = formData.get('contenido');
    const isRecordatorio = formData.get('is_recordatorio') === 'true';
    const fechaRecordatorio = formData.get('fecha_recordatorio');

    if (!contenido || !contenido.trim()) return fail(400, { error: 'Nota vacía' });

    const { data: lead, error: checkError } = await locals.supabase.from('leads').select('id, estado').eq('id', leadId).eq('broker_id', broker.id).maybeSingle();
    if (checkError || !lead) return fail(403, { error: 'Lead no encontrado o sin acceso autorizado' });

    let payloadNota = { 
        lead_id: leadId, 
        broker_id: broker.id, 
        contenido: contenido.trim(), 
        tipo: isRecordatorio ? 'recordatorio' : 'nota',
        fecha_recordatorio: isRecordatorio ? fechaRecordatorio : null,
        completado: false
    };

    let { error: notaError } = await locals.supabase.from('lead_notas').insert(payloadNota);

    if (notaError && notaError.message.includes('lead_notas_broker_id_fkey')) {
        payloadNota.broker_id = user.id; 
        const retry = await locals.supabase.from('lead_notas').insert(payloadNota);
        notaError = retry.error;
    }

    if (notaError) {
        return fail(500, { error: `Fallo BD (Insertar Nota): ${notaError.message}` });
    }

    let actualizacionesLead = { 
        ultima_actividad: new Date().toISOString()
    };

    if (lead.estado === 'nuevo') {
      actualizacionesLead.estado = 'contactado';
    }

    await locals.supabase.from('leads').update(actualizacionesLead).eq('id', leadId).eq('broker_id', broker.id);

    return { success: true };
  },

  completarRecordatorio: async ({ request, locals }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const notaId = formData.get('nota_id') || formData.get('id'); 

    if (!notaId) return fail(400, { error: 'Falta el ID del recordatorio.' });

    const { data: notaActualizada, error } = await locals.supabase
        .from('lead_notas')
        .update({ completado: true })
        .eq('id', notaId)
        .select();

    if (error) return fail(500, { error: `Fallo DB: ${error.message}` });
    if (!notaActualizada || notaActualizada.length === 0) return fail(400, { error: 'Registro bloqueado por seguridad o no existe.' });

    return { success: true };
  },

  // 🚀 V6 UPDATE: Módulo de IA con Motor SRE
  generarScriptWhatsapp: async ({ request, locals, platform }) => {
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });
    if (!platform?.env?.AI) return fail(503, { error: 'Motor de IA offline.' });

    // 🚀 V6: Resolución de Identidad Multi-Tenant
    let tenantContext;
    try {
      tenantContext = await resolveEffectiveTenant(locals, user);
    } catch(e) { 
      return fail(404, { error: 'Perfil de Agencia no encontrado.' }); 
    }

    const formData = await request.formData();
    const leadId = formData.get('lead_id');

    // Recuperamos nombre_comercial usando el brokerId validado
    const { data: broker } = await locals.supabase.from('brokers').select('nombre_comercial').eq('id', tenantContext.brokerId).single();
    const brokerNombre = broker?.nombre_comercial || 'el asesor';

    // Recuperamos el lead
    const { data: lead } = await locals.supabase
        .from('leads')
        .select(`*, propiedades(titulo), lead_notas(contenido, tipo, creado_en, completado, fecha_recordatorio)`)
        .eq('id', leadId)
        .eq('broker_id', tenantContext.brokerId)
        .single();

    if (!lead) return fail(404, { error: 'Prospecto no encontrado.' });

    // 🚀 V6: Reserva del Crédito con SRE Constraints
    const requestId = crypto.randomUUID();
    const reservation = await reserveAiCredit(tenantContext.brokerId, requestId, tenantContext.actorUserId);
    
    if (!reservation || !reservation.ok) {
      if (reservation?.error === 'INELIGIBLE_STATUS') return fail(403, { error: 'Tu cuenta está inactiva o con pagos pendientes.' });
      if (reservation?.error === 'REQUEST_ALREADY_FINALIZED') return fail(409, { error: 'Esta solicitud ya finalizó previamente.', status: 'released' });
      if (reservation?.error === 'INVALID_PLAN') return fail(409, { error: 'Plan de suscripción no válido o corrupto.' });
      if (reservation?.error === 'REQUEST_ID_BROKER_MISMATCH') return fail(409, { error: 'Identificador de operación inválido.' });
      return fail(409, { error: reservation?.error === 'INSUFFICIENT_CREDITS' ? 'No tienes créditos de IA.' : 'Error al reservar crédito.' });
    }

    if (reservation.status === 'in_progress') return fail(429, { error: 'La generación está en proceso.', status: 'running' });
    if (reservation.status === 'already_consumed' && reservation.result) return { success: true, whatsapp: reservation.result.whatsapp };

    let creditConfirmed = false;
    let finalContent = null;
    let errorLog = [];

    const primerNombre = lead.nombre.split(' ')[0].trim();

    try {
        const hoyStr = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
        
        const notasOrdenadas = (lead.lead_notas || []).sort((a,b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        
        const notasRecientes = notasOrdenadas
            .slice(0, 6)
            .reverse() 
            .map(n => {
              const fecha = new Date(n.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
              let contextoTag = '[INTERACCIÓN/NOTA]';
              
              if (n.tipo === 'recordatorio') {
                  contextoTag = n.completado ? '[TAREA COMPLETADA]' : `[TAREA PENDIENTE: vence ${new Date(n.fecha_recordatorio).toLocaleDateString('es-MX')}]`;
              }
              
              return `Fecha: ${fecha} | Evento: ${contextoTag} -> Detalles: "${n.contenido}"`;
            })
            .join('\n');

        const scoreObj = calcularScore({ ...lead, lead_notas: notasOrdenadas });
        const objetivoComercial = scoreObj.accion || 'Retomar el contacto para avanzar de etapa.';

        const systemPrompt = `/no_think
Eres un experto asesor inmobiliario en México. Tu objetivo es redactar el próximo mensaje de WhatsApp para el cliente.

CONTEXTO COMERCIAL:
- Tu nombre de agencia/asesor: ${brokerNombre}
- Nombre del Cliente: ${primerNombre} (Tutéalo, sé amigable pero profesional)
- Etapa en el Embudo: ${etapaLegible(lead.estado)}
- Inmueble de Interés: ${lead.propiedades ? lead.propiedades.titulo : 'Búsqueda general de propiedades'}
- OBJETIVO COMERCIAL DEL MENSAJE: ${objetivoComercial}

REGLAS DE ORO (ANTI-ALUCINACIÓN):
1. Inicia siempre con "Hola ${primerNombre}," o "¡Hola ${primerNombre}!".
​2. NUNCA inventes características de la propiedad (como planta baja, jardín, número de cuartos) si no están en el historial.
3. NUNCA asumas que hubo un recorrido físico a menos que el historial diga explícitamente "Recorrido" o "Visita".
4. NUNCA suenes a call center ("Espero que te encuentres muy bien", "Te contacto por este medio").
5. Limita el uso de emojis a máximo 1 o 2 en todo el mensaje. 
6. Cierra con una pregunta corta y conversacional para obligar a una respuesta y cumplir el OBJETIVO COMERCIAL.

Devuelve EXCLUSIVAMENTE el texto del mensaje. Sin comillas ni explicaciones previas.`;

        const userPrompt = `FECHA ACTUAL: ${hoyStr}\n\nHISTORIAL DE EVENTOS:\n${notasRecientes || '— Aún no hay eventos. Este es el primer contacto de seguimiento.'}\n\nINSTRUCCIÓN: Redacta el mensaje de WhatsApp de HOY basándote exclusivamente en los eventos y buscando cumplir el OBJETIVO COMERCIAL.`;

        for (const modelId of MODELS_CASCADE) {
            try {
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 600, 
                    temperature: 0.6 
                });

                const parsed = parseAiResponse(result);
                const textoWhatsapp = parsed.whatsapp;
                const textoLower = textoWhatsapp.toLowerCase();
                const nombreLower = primerNombre.toLowerCase();
                
                // Quality Guard intacto
                if (!textoLower.includes(`hola ${nombreLower}`) && !textoLower.includes(`¡hola ${nombreLower}`) && !textoLower.includes(`buenos ${nombreLower}`)) {
                  throw new Error('Guardia: El mensaje no inicia con el saludo esperado.');
                }

                const patronesProhibidos = [/\bme llamaré\b/, /\bme marco a\b/, /\bcómo está\b(?![n])/, /\ble agradezco\b/, /\busted\b/, /\bsu propiedad\b/, /espero (que )?(te encuentres|estés) bien/];
                if (patronesProhibidos.some(p => p.test(textoLower))) throw new Error(`Guardia: Lenguaje formal o cliché de call center detectado.`);
                if (textoWhatsapp.length < 15 || textoWhatsapp.length > 500) throw new Error(`Guardia: Longitud inválida.`);

                finalContent = { whatsapp: textoWhatsapp };
                break; 
            } catch (err) {
                errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
                finalContent = null;
            }
        }

        if (!finalContent) throw new Error('El generador tardó demasiado o no superó los filtros de calidad.');

        // 🚀 V6: Confirmación Atómica Segura
        const consumeRes = await confirmAiCredit(tenantContext.brokerId, requestId, finalContent);
        if (!consumeRes || !consumeRes.ok) throw new Error('Fallo confirmación atómica DB.');
        
        creditConfirmed = true;
        return { success: true, whatsapp: finalContent.whatsapp };

    } catch (error) {
        if (!creditConfirmed) {
            // 🚀 V6: AMBIGUITY RESOLVER (Protección de Red)
            const opState = await getAiGenerationOperation(tenantContext.brokerId, requestId);
            
            if (opState.ok) {
               if (opState.status === 'completed' && opState.result) {
                 return { success: true, whatsapp: opState.result.whatsapp }; 
               } else if (opState.status === 'running') {
                 return fail(429, { error: 'Operación en proceso.', status: 'running' });
               } else if (opState.status === 'failed') {
                 await releaseAiCredit(tenantContext.brokerId, requestId, 'AI_TIMEOUT_OR_PARSE_ERROR');
                 return fail(500, { error: `La IA falló al redactar. Tu crédito fue liberado.`, status: 'released' });
               }
            }
            
            // UNKNOWN Puro
            return fail(502, { 
                error: `Falla de red. Tu operación está protegida, por favor reintenta.`, 
                status: 'unknown' 
            });
        }
        return fail(502, { error: error.message });
    }
  }
};
