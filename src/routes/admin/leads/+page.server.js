// src/routes/admin/leads/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; 
import { calcularScore } from '$lib/scoring.js';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';

// 🚀 MEJORA 1: CASCADA INVERTIDA (Calidad y parámetros grandes primero, rápidos de fallback)
const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

function parseAiResponse(result) {
  const raw = result?.response ?? result;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') throw new Error('La IA no devolvió formato de texto.');

  let cleanedStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanedStr.indexOf('{');
  const lastBrace = cleanedStr.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) {
    return { whatsapp: cleanedStr.replace(/^["']|["']$/g, '').trim() };
  }
  
  cleanedStr = cleanedStr.substring(firstBrace, lastBrace + 1);
  cleanedStr = cleanedStr.replace(/\n/g, '\\n').replace(/\r/g, '');
  
  try {
    return JSON.parse(cleanedStr);
  } catch (err) {
    throw new Error('JSON malformado devuelto por la IA.');
  }
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
        // 🚀 MEJORA 2: FORMATO DE NOTAS ENRIQUECIDO (Metadatos temporales y estados explícitos)
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

        // 🚀 MEJORA 3: SYSTEM PROMPT BLINDADO ANTI-ALUCINACIONES GRAMATICALES
        const systemPrompt = [
            'Eres un Asesor Inmobiliario Senior en México experto en cierre de ventas.',
            'Redacta un mensaje de seguimiento para WhatsApp.',
            '',
            'REGLAS GRAMATICALES (NO NEGOCIABLES):',
            '1. Usa SIEMPRE tuteo (tú). NUNCA uses usted ni sus conjugaciones (está → estás, tiene → tienes).',
            '2. Cuando el broker llamará al cliente: "te llamaré" o "te marco". NUNCA "me llamaré" ni "me marco".',
            '3. Usa primera persona para el broker (yo) y segunda persona para el cliente (tú). Sin mezclas.',
            '',
            'REGLAS DE CONTENIDO:',
            '4. Lee el historial. Las notas marcadas [COMPLETADO] ya ocurrieron — no las trates como pendientes.',
            '5. Basa el mensaje SOLO en datos del historial. Si no está en las notas, no lo inventes.',
            '6. No uses frases como "como prometimos" o "como acordamos" si no hay evidencia explícita en las notas.',
            '7. El prospecto busca comprar/rentar. Nunca digas "tu casa" — di "la propiedad" o "la casa en [Zona]".',
            '8. Tono: cálido y profesional. Sin agresividad comercial.',
            '9. Máximo 2 oraciones. Si produces 3 o más, el mensaje es inválido.',
            '10. Máximo 1 emoji en todo el texto.',
            '',
            'FORMATO DE RESPUESTA:',
            'Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional:',
            '{ "whatsapp": "Texto exacto listo para enviar." }'
        ].join('\n');

        const userPrompt = `CONTEXTO DEL PROSPECTO:
- Nombre: ${lead.nombre}
- Etapa del proceso: ${lead.estado.toUpperCase()}
- Inmueble que desea adquirir/rentar: ${lead.propiedades ? lead.propiedades.titulo : 'Búsqueda General'}
- Historial reciente de notas:
${notasRecientes || 'Prospecto sin contacto previo documentado. Seguimiento inicial.'}

Genera el mensaje ideal para darle seguimiento.`;

        for (const modelId of MODELS_CASCADE) {
            try {
                const result = await platform.env.AI.run(modelId, {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.35 // 🚀 MEJORA 4: TEMPERATURA ATERRIZADA
                });

                const parsed = parseAiResponse(result);
                const textoWhatsapp = parsed.whatsapp || parsed.WhatsApp || parsed.Whatsapp || parsed.mensaje;
                if (!textoWhatsapp) throw new Error('Respuesta IA incompleta');
                
                finalContent = { whatsapp: textoWhatsapp };

                // 🚀 BONUS: SAFETY NET POST-GENERACIÓN
                const erroresGramaticales = ['me llamaré', 'me marco', 'cómo está', 'le agradezco'];
                const textoLower = finalContent.whatsapp.toLowerCase();
                const tieneError = erroresGramaticales.some(e => textoLower.includes(e));
                if (tieneError) {
                  throw new Error('Respuesta con error gramatical reflexivo detectado (Safety Net).');
                }

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
