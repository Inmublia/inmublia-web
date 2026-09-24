import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';

// 🚀 MEJORA 1: CASCADA INVERTIDA (Calidad primero)
const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

function etapaLegible(estado) {
  return {
    'nuevo':       'Nuevo — sin contacto previo',
    'contactado':  'En conversación — primer contacto realizado',
    'visita':      'Recorrido agendado o realizado',
    'negociacion': 'Negociación activa — evaluando condiciones',
    'cerrado':     'Trato cerrado',
    'descartado':  'Descartado'
  }[estado] ?? estado;
}

// 🚀 MEJORA 2: PARSER ROBUSTO ANTI-[object Object] Y ANTI-TRUNCAMIENTO
function parseAiResponse(result) {
  const raw = result?.response ?? result;
  
  // Quitar bloques <think>...</think> de Qwen3 antes de todo
  const sinThinking = typeof raw === 'string'
    ? raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    : raw;

  // Si el modelo devolvió un objeto estructurado (evita [object Object])
  if (sinThinking && typeof sinThinking === 'object' && !Array.isArray(sinThinking)) {
    const val = sinThinking.whatsapp ?? sinThinking.WhatsApp ?? 
                sinThinking.mensaje ?? sinThinking.message ?? sinThinking.content;
    
    // Si ese valor también es un objeto anidado, extraer el primer string
    if (val && typeof val === 'object') {
      const nested = val.mensaje ?? val.message ?? val.content ?? val.text;
      return { whatsapp: String(nested ?? JSON.stringify(val)).trim() };
    }
    if (val) return { whatsapp: String(val).trim() };
    throw new Error('Objeto IA sin campo de texto reconocible.');
  }

  if (typeof sinThinking !== 'string' || !sinThinking) {
    throw new Error('La IA no devolvió formato de texto.');
  }

  // Intentar extraer con regex primero (funciona con JSON truncado sin cierre)
  const regexMatch = sinThinking.match(/"(?:whatsapp|WhatsApp|mensaje|message)"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (regexMatch?.[1]) {
    return { whatsapp: regexMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() };
  }

  // Intentar JSON completo
  const firstBrace = sinThinking.indexOf('{');
  const lastBrace = sinThinking.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(sinThinking.substring(firstBrace, lastBrace + 1));
      const val = parsed.whatsapp ?? parsed.WhatsApp ?? parsed.mensaje ?? parsed.message;
      if (val && typeof val === 'string') return { whatsapp: val.trim() };
      
      // Anidado
      if (val && typeof val === 'object') {
        const nested = val.mensaje ?? val.message ?? val.content ?? val.text;
        if (nested) return { whatsapp: String(nested).trim() };
      }
    } catch (_) { /* continuar con texto plano */ }
  }

  // Texto plano — limpiar preambles comunes
  const limpio = sinThinking
    .replace(/^(aquí está|aquí tienes|mensaje[:\s]|here'?s?[:\s])[^\n]*/i, '')
    .replace(/^```[\w]*\n?|```$/g, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  if (!limpio || limpio.length < 8) throw new Error('Respuesta IA vacía o irreconocible.');
  
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

    // 🚀 MEJORA 3: OBTENER NOMBRE COMERCIAL PARA EL PROMPT
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, nombre_comercial')
      .eq('auth_user_id', user.id)
      .single();
      
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });
    const brokerNombre = broker.nombre_comercial || 'el asesor inmobiliario';

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
        const hoy = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
        
        // 🚀 MEJORA 4: HISTORIAL DE NOTAS CON FECHAS Y ESTADOS EXPLÍCITOS
        const notasRecientes = (lead.lead_notas || [])
            .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
            .slice(-6)
            .map(n => {
              const fecha = new Date(n.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
              const estado = n.completado ? '[HECHO]' : '[PENDIENTE]';
              const extra = (!n.completado && n.fecha_recordatorio)
                ? ` → para el ${new Date(n.fecha_recordatorio).toLocaleDateString('es-MX', { day:'2-digit', month:'short' })}`
                : '';
              return `• ${fecha} | ${n.tipo.toUpperCase()} ${estado}: "${n.contenido}"${extra}`;
            })
            .join('\n');

        // 🚀 MEJORA 5: SYSTEM PROMPT (Sin JSON, identidades estrictas y frases prohibidas)
        const systemPrompt = `Eres un redactor especialista en comunicación inmobiliaria para el mercado mexicano.
Tu única función es redactar mensajes de WhatsApp que un asesor de bienes raíces enviará a sus clientes.

════ REGLA ABSOLUTA DE IDENTIDADES ════
- EL ASESOR = quien ESCRIBE y FIRMA el mensaje. Habla en primera persona (yo).
- EL CLIENTE = quien RECIBE el mensaje. Se le habla en segunda persona (tú).
- NUNCA confundas estos roles. El mensaje NUNCA menciona el nombre del asesor.

════ GRAMÁTICA (CRÍTICO, CERO EXCEPCIONES) ════
- Tuteo estricto: "estás", "tienes", "te llamo", "te escribo". JAMÁS "usted/está/tiene".
- El asesor llama AL cliente: "te llamo", "te marco", "te contacto". NUNCA "me llamaré".
- La propiedad NO es del cliente todavía: di "la propiedad", "la casa en [Zona]", "el inmueble que te interesó". NUNCA "tu casa".

════ TONO ════
- Cálido, directo, como un conocido de confianza que sabe de bienes raíces.
- Seguro y propositivo. El asesor propone, no pide permiso para existir.
- Sin artificialidad ni frases corporativas.

════ FRASES COMPLETAMENTE PROHIBIDAS ════
Estas frases producen mensajes de mala calidad. Su uso invalida la respuesta:
✗ "Espero que estés bien / que todo vaya bien"
✗ "¿Cómo te va?" / "¿Cómo estás?" / "¿Cómo te encuentras?"
✗ "Estoy intentando / tratando de contactarte"
✗ "Nuevamente te escribo / De nuevo me comunico"
✗ "Para darte seguimiento" / "Para seguirte contactando"
✗ "¿Te gustaría que te llamara?" (demasiado pasivo — propón directamente)
✗ Cualquier variante de "me llamaré" o "me marco"

════ ESTRUCTURA ════
- Máximo 2 oraciones cortas y directas.
- Oración 1: Contexto específico del prospecto (no genérico).
- Oración 2: Propuesta concreta para avanzar en su etapa actual.
- Máximo 1 emoji. Opcional, no obligatorio.

════ FORMATO DE SALIDA ════
Devuelve ÚNICAMENTE el texto del mensaje.
Sin JSON. Sin comillas envolventes. Sin explicaciones. Sin etiquetas. Solo el mensaje listo para copiar y pegar.`;

        // 🚀 MEJORA 6: USER PROMPT (Con nombres exactos y contexto puro)
        const userPrompt = `FECHA DE HOY: ${hoy}
ASESOR (quien escribe): ${brokerNombre}
CLIENTE (quien recibe): ${lead.nombre}
⚠️ El mensaje debe dirigirse a "${lead.nombre}". El nombre "${brokerNombre}" NO debe aparecer en el mensaje.

DATOS DEL CLIENTE:
- Etapa: ${etapaLegible(lead.estado)}
- Propiedad de interés: ${lead.propiedades?.titulo ?? 'Búsqueda general — sin propiedad específica aún'}

HISTORIAL DE INTERACCIONES (cronológico, más reciente al final):
${notasRecientes || '— Sin interacciones previas registradas. Es el primer acercamiento.'}

INSTRUCCIÓN:
Basándote ÚNICAMENTE en el historial anterior, redacta el mensaje ideal que ${brokerNombre} le enviará a ${lead.nombre} HOY para avanzar en su proceso de compra/renta.
No inventes datos que no estén en el historial.`;

        for (const modelId of MODELS_CASCADE) {
            try {
                // 🚀 MEJORA 7: MÁS TOKENS (900) Y TEMPERATURA PRECISA (0.3)
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 900, 
                    temperature: 0.3 
                });

                const parsed = parseAiResponse(result);
                const texto = parsed.whatsapp;
                
                // 🚀 MEJORA 8: GUARDIA POST-GENERACIÓN ANTI-BASURA
                if (typeof texto !== 'string' || texto.includes('[object') || texto.startsWith('{')) {
                  throw new Error('Guardia: el texto generado no es un mensaje válido.');
                }

                const FRASES_PROHIBIDAS = [
                  'me llamaré', 'me marco a', 'cómo te va', 'cómo estás', 'cómo te encuentras',
                  'espero que estés bien', 'intentando contactarte', 'tratando de contactarte',
                  '[object', '{ "whatsapp'
                ];
                
                const textoLower = texto.toLowerCase();
                const fraseMala = FRASES_PROHIBIDAS.find(f => textoLower.includes(f));
                
                if (fraseMala || texto.length < 20 || texto.length > 450) {
                  throw new Error(`Guardia: respuesta inválida — "${fraseMala ?? `${texto.length} chars`}"`);
                }

                finalContent = { whatsapp: texto };
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
        
        return fail(502, { error: 'El redactor de IA está temporalmente saturado. Por favor, inténtalo de nuevo en unos segundos.' });
    }
  }
};
