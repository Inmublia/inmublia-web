import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';
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
      console.error('🔥 Error insertando lead manual:', insertError);
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
        console.error('🔥 Error Crítico Insertando Nota:', notaError);
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

  generarScriptWhatsapp: async ({ request, locals, platform }) => {
    if (locals.isImpersonating) return fail(403, { error: 'Modo Visualización Activo.' });
    
    let user = locals.user;
    if (!user && locals.supabase) {
      const { data } = await locals.supabase.auth.getUser();
      user = data?.user;
    }
    if (!user) return fail(401, { error: 'No autorizado' });
    if (!platform?.env?.AI) return fail(503, { error: 'Motor de IA offline.' });

    const formData = await request.formData();
    const leadId = formData.get('lead_id');

    const { data: broker } = await locals.supabase.from('brokers').select('id, nombre_comercial').eq('auth_user_id', user.id).single();
    if (!broker || !broker.id) return fail(403, { error: 'Perfil no encontrado' });
    
    const brokerNombre = broker.nombre_comercial || 'el asesor';

    // Recuperamos el lead con sus relaciones
    const { data: lead } = await locals.supabase
        .from('leads')
        .select(`*, propiedades(titulo), lead_notas(contenido, tipo, creado_en, completado, fecha_recordatorio)`)
        .eq('id', leadId)
        .eq('broker_id', broker.id)
        .single();

    if (!lead) return fail(404, { error: 'Prospecto no encontrado.' });

    const requestId = crypto.randomUUID();
    const reservation = await reserveAiCredit(locals.supabase, user.id, requestId);
    if (!reservation) return fail(403, { error: 'No tienes créditos de IA.' });

    let creditConfirmed = false;
    let finalContent = null;
    let errorLog = [];

    const primerNombre = lead.nombre.split(' ')[0].trim();

    try {
        const hoyStr = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
        
        // 🚀 NUEVA ARQUITECTURA DE DATOS: Historial Estructurado
        const notasOrdenadas = (lead.lead_notas || []).sort((a,b) => new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime());
        
        const notasRecientes = notasOrdenadas
            .slice(0, 6)
            .reverse() // Orden cronológico para que la IA entienda la línea de tiempo
            .map(n => {
              const fecha = new Date(n.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
              let contextoTag = '[INTERACCIÓN/NOTA]';
              
              if (n.tipo === 'recordatorio') {
                  contextoTag = n.completado ? '[TAREA COMPLETADA]' : `[TAREA PENDIENTE: vence ${new Date(n.fecha_recordatorio).toLocaleDateString('es-MX')}]`;
              }
              
              return `Fecha: ${fecha} | Evento: ${contextoTag} -> Detalles: "${n.contenido}"`;
            })
            .join('\n');

        // 🚀 NUEVA ARQUITECTURA: Calcular Objetivo Comercial Estratégico ("Termostato")
        const scoreObj = calcularScore({ ...lead, lead_notas: notasOrdenadas });
        const objetivoComercial = scoreObj.accion || 'Retomar el contacto para avanzar de etapa.';

        // 🚀 PROMPT EVOLUCIONADO (Estructurado, Anti-Alucinaciones y con Quality Guard)
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
2. NUNCA inventes características de la propiedad (como planta baja, jardín, número de cuartos) si no están en el historial.
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
                    temperature: 0.6 // Menor temperatura para evitar alucinaciones
                });

                const parsed = parseAiResponse(result);
                const textoWhatsapp = parsed.whatsapp;
                const textoLower = textoWhatsapp.toLowerCase();
                const nombreLower = primerNombre.toLowerCase();
                
                // Quality Guard
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

        if (!finalContent) throw new Error('El generador tardó demasiado o no superó los filtros de calidad (Quality Guard).');

        const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);
        if (!confirmed) throw new Error('Fallo al confirmar consumo de crédito IA.');
        
        creditConfirmed = true;
        return { success: true, whatsapp: finalContent.whatsapp };

    } catch (error) {
        if (!creditConfirmed) await refundAiCredit(locals.supabase, user.id, requestId);
        return fail(502, { error: error.message });
    }
  }
};
