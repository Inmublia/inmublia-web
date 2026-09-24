import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';
import { etapaLegible } from '$lib/utils/leads.js';

// 🚀 CASCADA ENTERPRISE: Modelos capaces de seguir el tono y las instrucciones
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
        broker_id: broker.id,
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
        broker_id: broker.id, 
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

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', locals.user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

    const formData = await request.formData();
    const notaId = formData.get('nota_id');

    const { error } = await locals.supabase.from('lead_notas').update({ completado: true }).eq('id', notaId).eq('broker_id', broker.id);
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

    const { data: broker } = await locals.supabase.from('brokers').select('id, nombre_comercial').eq('auth_user_id', user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });
    
    const brokerNombre = broker.nombre_comercial || 'el asesor';

    const { data: lead } = await locals.supabase
        .from('leads')
        .select(`*, propiedades(titulo), lead_notas(contenido, tipo, creado_en, completado, fecha_recordatorio)`)
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
        const hoyStr = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
        
        const notasRecientes = (lead.lead_notas || [])
            .sort((a,b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime())
            .slice(-6)
            .map(n => {
              const fecha = new Date(n.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
              const estado = n.completado ? '[HECHO]' : '[PENDIENTE]';
              const fechaRec = (!n.completado && n.fecha_recordatorio)
                ? ` → para el ${new Date(n.fecha_recordatorio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`
                : '';
              return `• ${fecha} | ${n.tipo.toUpperCase()} ${estado}: "${n.contenido}"${fechaRec}`;
            })
            .join('\n');

        // 🚀 PROMPT OPTIMIZADO: Positivo, corto y al grano. El "/no_think" fuerza a Qwen3 a omitir el bloque de razonamiento.
        const systemPrompt = `/no_think
Eres un asesor inmobiliario en México redactando un WhatsApp para tu cliente.

CONTEXTO:
- Tú eres: ${brokerNombre} (hablas en primera persona, nunca menciones tu nombre explícitamente en la firma)
- Tu cliente: ${lead.nombre} (tutéalo siempre, nunca uses usted)
- Etapa de venta: ${etapaLegible(lead.estado)}
- Inmueble de interés: ${lead.propiedades ? lead.propiedades.titulo : 'Búsqueda general'}

ESCRIBE UN MENSAJE DE WHATSAPP QUE:
1. Inicie exactamente saludándolo por su nombre: "Hola ${lead.nombre}," o "¡Hola ${lead.nombre}!"
2. Sea conversacional y cálido, como si lo escribieras a un conocido.
3. Tenga máximo 2-4 oraciones cortas (adapta la longitud al contexto del historial).
4. Use 1 emoji natural al final (🏡 ✨ 👋).
5. Cierre con una pregunta casual y sin presión para continuar el proceso.

EJEMPLOS DE TONO CORRECTO (No los copies, úsalos de guía):
"¡Hola María! Quería checarte que ya tengo disponible la visita para el jueves por la tarde. ¿Te vendría bien esa hora? 🏡"
"Hola Carlos, vi que nos quedamos pendientes de agendar la segunda visita. ¿Tienes chance esta semana? ✨"

EVITA escribir: "Espero que estés bien", "Te contacto para...", "usted", "su propiedad".
Escribe SOLO el mensaje. Sin comillas, sin explicaciones.`;

        const userPrompt = `FECHA DE HOY: ${hoyStr}
HISTORIAL DEL CLIENTE:
${notasRecientes || '— Primer contacto. Preséntate brevemente y pregunta en qué puedes ayudar.'}

INSTRUCCIÓN: Redacta el mensaje HOY basándote exclusivamente en el historial.`;

        for (const modelId of MODELS_CASCADE) {
            try {
                // 🚀 TEMPERATURA 0.7: Óptimo para Qwen3 cuando tiene thinking apagado
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 600, 
                    temperature: 0.7 
                });

                const parsed = parseAiResponse(result);
                const textoWhatsapp = parsed.whatsapp;
                
                // 🚀 GUARDIAS PRECISAS (Sin falsos positivos por nombres)
                const textoLower = textoWhatsapp.toLowerCase();
                const nombreLower = lead.nombre.split(' ')[0].toLowerCase();
                
                const empiezaConNombre = textoLower.startsWith(`hola ${nombreLower}`) || 
                                         textoLower.startsWith(`¡hola ${nombreLower}`) || 
                                         textoLower.startsWith(`buenos ${nombreLower}`) || 
                                         textoLower.includes(`hola ${nombreLower}`); 
                
                if (!empiezaConNombre) {
                  throw new Error('Guardia: Mensaje no inicia con el saludo esperado.');
                }

                const patronesProhibidos = [
                  /\bme llamaré\b/,
                  /\bme marco a\b/, 
                  /\bcómo está\b(?![n])/, // Permite "cómo están"
                  /\ble agradezco\b/,
                  /\busted\b/,
                  /\bsu propiedad\b/
                ];

                if (patronesProhibidos.some(p => p.test(textoLower))) {
                  throw new Error(`Guardia: El modelo generó un error reflexivo o lenguaje formal prohibido.`);
                }

                if (textoWhatsapp.length < 15 || textoWhatsapp.length > 500) {
                  throw new Error(`Guardia: Respuesta fuera de longitud válida (${textoWhatsapp.length} caracteres).`);
                }

                finalContent = { whatsapp: textoWhatsapp };
                break; 
            } catch (err) {
                errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
                finalContent = null;
            }
        }

        if (!finalContent) {
            const mensajeError = errorLog.length === MODELS_CASCADE.length 
              ? 'No se pudo generar un texto con la calidad requerida. Intenta escribirlo manualmente.'
              : 'El generador de Inteligencia Artificial tardó demasiado.';
            throw new Error(mensajeError);
        }

        const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);
        if (!confirmed) throw new Error('Fallo al confirmar consumo de crédito IA.');
        
        creditConfirmed = true;

        return { success: true, whatsapp: finalContent.whatsapp };

    } catch (error) {
        if (!creditConfirmed) {
            await refundAiCredit(locals.supabase, user.id, requestId);
        }
        console.error('[WhatsApp IA Error]', errorLog.length ? errorLog : error.message);
        return fail(502, { error: error.message });
    }
  }
};
