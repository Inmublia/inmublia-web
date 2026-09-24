// src/routes/admin/leads/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';

const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

// 🚀 MEJORA CRÍTICA: PARSEADOR "TEXT-FIRST" Y ANTI-THINKING
function parseAiResponse(result) {
  const raw = (result?.response ?? result ?? '').toString();
  
  // 1. Eliminar bloques de razonamiento internos <think>...</think> emitidos por Qwen3
  const sinThinking = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Extraer el texto de un JSON truncado o malformado por fallback
  const jsonMatch = sinThinking.match(/"whatsapp"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (jsonMatch?.[1]) {
    return { whatsapp: jsonMatch[1].replace(/\\n/g, '\n').trim() };
  }

  // 3. Paradigma Texto Plano Puro: limpieza de preámbulos, comillas y marcadores
  const limpio = sinThinking
    .replace(/^(aquí está|aquí tienes|claro|este es el mensaje|mensaje:|here'?s?)[^:]*:\s*/i, '') // Adiós "Aquí tienes el mensaje:"
    .replace(/^```[\w]*\n?/, '').replace(/```$/, '')  // Adiós a los bloques de código ```
    .replace(/^["']|["']$/g, '')                       // Adiós a las comillas que envuelven todo el texto
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

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
    if (!broker) return fail(403, { error: 'Perfil no encontrado' });

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
        const notasRecientes = (lead.lead_notas || [])
            .sort((a,b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime())
            .slice(-5)
            .map(n => {
              const fecha = new Date(n.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
              const estado = n.completado ? '[COMPLETADO]' : '[PENDIENTE]';
              const fechaRec = n.fecha_recordatorio
                ? ` → Programado para: ${new Date(n.fecha_recordatorio).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}`
                : '';
              return `- ${fecha} | ${n.tipo.toUpperCase()} ${estado}: ${n.contenido}${fechaRec}`;
            })
            .join('\n');

        // 🚀 MEJORA CRÍTICA: SYSTEM PROMPT "TEXT-FIRST" Y GRAMATICALMENTE BLINDADO
        const systemPrompt = [
            'Eres un Asesor Inmobiliario Senior en México experto en cierre de ventas.',
            'Redacta un mensaje de seguimiento para enviarlo por WhatsApp.',
            '',
            'REGLAS GRAMATICALES (NO NEGOCIABLES):',
            '1. Usa SIEMPRE tuteo (tú). NUNCA uses usted ni sus conjugaciones (está → estás, tiene → tienes, diga → dime).',
            '2. NUNCA uses "me llamaré" ni "me marco". Si el broker promete llamar, debe usar "te llamaré", "te marco" o "te regreso la llamada".',
            '3. Usa primera persona singular para el broker (yo) y segunda persona para el cliente (tú). Sin mezclas de tono.',
            '',
            'REGLAS DE CONTENIDO:',
            '4. Basa el mensaje SOLO en datos del historial de notas. Si las notas indican que la persona no contestó, tu mensaje debe reflejar que estás intentando contactarlo de nuevo. Las notas marcadas como [COMPLETADO] son eventos que ya sucedieron.',
            '5. No uses frases como "como prometimos" o "como acordamos" si no hay evidencia explícita de un acuerdo en las notas.',
            '6. El prospecto busca comprar/rentar. Nunca digas "tu casa" — di "la propiedad" o "la casa en [Zona]".',
            '7. Tono: cálido y profesional. Cero agresividad comercial.',
            '8. Máximo 2 oraciones. Sé sumamente breve y directo.',
            '9. Máximo 1 emoji.',
            '',
            'FORMATO DE RESPUESTA:',
            'Escribe ÚNICAMENTE el texto del mensaje listo para WhatsApp.',
            'Sin comillas. Sin JSON. Sin preámbulos. Sin explicaciones. Solo el mensaje puro.'
        ].join('\n');

        const userPrompt = `CONTEXTO DEL PROSPECTO:
- Nombre: ${lead.nombre}
- Etapa del proceso: ${lead.estado.toUpperCase()}
- Inmueble de interés: ${lead.propiedades ? lead.propiedades.titulo : 'Búsqueda General'}
- Historial reciente de notas y acciones (LÉELAS CON ATENCIÓN ANTES DE REDACTAR):
${notasRecientes || 'Prospecto sin contacto previo documentado. Seguimiento inicial.'}

Redacta el mensaje:`

        for (const modelId of MODELS_CASCADE) {
            try {
                // 🚀 AUMENTO DE TOKENS: Espacio suficiente para que Qwen3 "piense" sin ahogarse
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 600, 
                    temperature: 0.35 
                });

                const parsed = parseAiResponse(result);
                const textoWhatsapp = parsed.whatsapp;
                
                if (!textoWhatsapp) throw new Error('Respuesta IA incompleta post-parser.');
                
                // 🚀 GUARDIA GRAMATICAL Y DE TAMAÑO
                const textoLower = textoWhatsapp.toLowerCase();
                const erroresGramaticales = ['me llamaré', 'me marco a', 'cómo está', '¿cómo está', 'le agradezco', 'agradecerle'];
                const tieneError = erroresGramaticales.some(e => textoLower.includes(e));
                
                if (tieneError) {
                  throw new Error(`Guardia: El modelo generó un error reflexivo o de formalidad prohibido.`);
                }

                if (textoWhatsapp.length < 15 || textoWhatsapp.length > 400) {
                  throw new Error(`Guardia: Respuesta fuera de los límites aceptables de longitud (${textoWhatsapp.length} caracteres).`);
                }

                finalContent = { whatsapp: textoWhatsapp };
                break; // El bloque fue exitoso, salimos de la cascada
            } catch (err) {
                errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
                finalContent = null;
            }
        }

        if (!finalContent) {
            // 🚀 EXCEPCIÓN GRANULAR
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
        
        // Retornamos el error limpio al frontend en lugar del texto rojo genérico
        return fail(502, { error: error.message });
    }
  }
};
