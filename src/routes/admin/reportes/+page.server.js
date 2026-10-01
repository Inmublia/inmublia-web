// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const getValidDate = (dateStr, fallback = new Date()) => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
};

// 🚀 EL MODELO OFICIAL PARA JSON MODE EN CLOUDFLARE (Oct 2026)
const MODEL_ID = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function parseInsightResponse(result) {
  // 1. Trazabilidad Cruda (Para ver exactamente qué devolvió Cloudflare)
  console.log('\n[RAW-CF-RESPONSE]');
  console.log(JSON.stringify(result, null, 2));
  console.log('-------------------\n');

  // 2. Extracción de respuesta dependiendo de la estructura del binding
  let rawString = '';
  if (typeof result === 'string') rawString = result;
  else if (result?.response) rawString = result.response;
  else if (result?.result?.response) rawString = result.result.response;
  else rawString = JSON.stringify(result);

  // Si el motor ya lo parseó por nosotros (algunos JSON Modes lo hacen nativamente)
  if (typeof result === 'object' && result.resumen) return result;
  if (typeof result?.response === 'object' && result.response.resumen) return result.response;

  // 3. Limpieza de Markdown y Think Blocks
  const sinThinking = rawString
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(sinThinking);
  } catch (e) {
    // 4. Último recurso: Búsqueda con Regex por si hay texto alucinado alrededor
    console.warn('[PARSE-WARN] Parse directo falló, intentando Regex...', e.message);
    const match = sinThinking.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Imposible extraer un JSON válido del payload.');
  }
}

async function generarYGuardarInsight(adminDb, broker, metricasBase, platform) {
  if (!platform?.env?.AI) {
    console.error('[IA-FATAL] Binding AI no expuesto en plataforma.');
    return null;
  }

  const systemPrompt = `Eres el analista estratégico de Inmublia. 
Analiza los datos y responde EXCLUSIVAMENTE con el JSON solicitado, sin explicaciones adicionales.`;

  const userPrompt = `Métricas actuales: Pipeline Activo: $${metricasBase.pipelineValue}, Win Rate: ${metricasBase.tasaCierre}%, Leads Inactivos: ${metricasBase.leadsEstancados}`;

  let finalInsight = null;
  let aiGeneradoExitosamente = false;

  try {
    console.log(`[IA-START] Ejecutando ${MODEL_ID} en JSON Mode...`);
    
    const result = await platform.env.AI.run(MODEL_ID, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // 🚀 JSON SCHEMA ESTRICTO NATIVO DE CLOUDFLARE
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            resumen: { type: 'string' },
            accion_prioritaria: { type: 'string' }
          },
          required: ['resumen', 'accion_prioritaria']
        }
      },
      max_tokens: 350, // Aumentado para evitar truncado de respuesta
      temperature: 0.1
    });

    finalInsight = parseInsightResponse(result);
    
    if (!finalInsight || typeof finalInsight.resumen !== 'string') {
      throw new Error('El JSON devuelto carece del esquema esperado.');
    }

    aiGeneradoExitosamente = true;
    console.log('[IA-SUCCESS] Insight generado y validado con éxito.');

  } catch (err) {
    console.error(`[IA-ERROR] Falló la inferencia:`, err);
    
    finalInsight = {
      resumen: "No fue posible generar el análisis automático en este momento por alta latencia en la red neuronal.",
      accion_prioritaria: "Sus métricas matemáticas están seguras. Recargue la página en unos minutos."
    };
  }

  // 🚀 PREVENCIÓN DE BUCLE: Solo guardamos en base de datos si fue un éxito real
  if (aiGeneradoExitosamente) {
    try {
      await adminDb.from('ai_insights_cache').upsert({
        broker_id: broker.id,
        tipo: 'reporte_diario',
        contenido: finalInsight,
        generado_en: new Date().toISOString()
      }, { onConflict: 'broker_id, tipo' });
      console.log('[IA-DB] Caché guardado correctamente en Supabase.');
    } catch (err) {
      console.error('[IA-DB-ERROR] Error al guardar caché en base de datos:', err.message);
    }
  }

  return finalInsight;
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  let query = db.from('brokers').select('id, nombre_comercial, comision_default');
  query = (locals.isImpersonating && locals.tenantId) ? query.eq('id', locals.tenantId) : query.eq('auth_user_id', locals.user.id);

  const { data: broker } = await query.single();
  if (!broker) throw redirect(303, '/login');

  const comisionRate = (broker.comision_default || 5) / 100;

  const [leadsRes, propsRes, insightRes] = await Promise.all([
    db.from('leads').select('*, propiedades (*)').eq('broker_id', broker.id),
    db.from('propiedades').select('*').eq('broker_id', broker.id),
    db.from('ai_insights_cache').select('contenido, generado_en')
      .eq('broker_id', broker.id)
      .eq('tipo', 'reporte_diario')
      .gte('generado_en', new Date(Date.now() - 86400000).toISOString())
      .maybeSingle()
  ]);

  const safeLeads = leadsRes.data || [];
  const safeProps = propsRes.data || [];
  
  // 🚀 CACHE BUSTER (Destructor de fallos previos)
  let insightLimpio = null;
  if (insightRes.data && insightRes.data.contenido) {
    insightLimpio = insightRes.data.contenido;
    if (typeof insightLimpio === 'string') {
      try { insightLimpio = JSON.parse(insightLimpio); } catch(e) {}
    }
    
    if (insightLimpio && typeof insightLimpio === 'object') {
      // Si por error se había guardado un mensaje de fallo anteriormente, lo destruimos.
      const isFallback = insightLimpio.resumen && (insightLimpio.resumen.includes('error de formato') || insightLimpio.resumen.includes('latencia'));
      if (isFallback || !insightLimpio.resumen) {
        console.log('[LOAD] Caché zombi detectado y destruido.');
        insightLimpio = null; 
      }
    } else {
      insightLimpio = null;
    }
  }

  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  let proyeccionVentas = 0, leadsEstancados = 0, tiemposRespuesta = [];
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  const fuentesMapa = {}, propConteo = {}, propiedadesUnicas = new Map();

  safeLeads.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    const precioProp = l.propiedades?.precio || 0;
    
    if (!['cerrado', 'descartado'].includes(est)) {
      proyeccionVentas += (precioProp * comisionRate * (PROB_ETAPA[est] || 0.05));
      if (l.propiedad_id && precioProp > 0) propiedadesUnicas.set(l.propiedad_id, precioProp);
      const diasInactivo = Math.floor((new Date() - getValidDate(l.ultima_actividad || l.creado_en || l.created_at)) / 86400000);
      if (diasInactivo > 15) leadsEstancados++;
    }

    const creacion = getValidDate(l.creado_en || l.created_at).getTime();
    const ultimaAct = getValidDate(l.ultima_actividad).getTime();
    if (ultimaAct > creacion) {
      const horas = (ultimaAct - creacion) / (1000 * 60 * 60);
      if (horas >= 0 && horas <= 720) tiemposRespuesta.push(horas);
    }

    const f = (l.origen || l.fuente || 'Directo').trim();
    if (!fuentesMapa[f]) fuentesMapa[f] = { nombre: f, total: 0, cerrados: 0, comision: 0 };
    fuentesMapa[f].total++;
    
    if (est === 'cerrado') {
      fuentesMapa[f].cerrados++;
      fuentesMapa[f].comision += (l.precio_cierre || precioProp) * (l.comision_cierre ? (l.comision_cierre / 100) : comisionRate);
    }

    if (l.propiedades) {
      const pId = l.propiedades.id;
      if (!propConteo[pId]) propConteo[pId] = { titulo: l.propiedades.titulo, estatus: l.propiedades.estatus, totalLeads: 0, convertidos: 0 };
      propConteo[pId].totalLeads++;
      if (est === 'cerrado') propConteo[pId].convertidos++;
    }
  });

  const pipelineValue = [...propiedadesUnicas.values()].reduce((sum, precio) => sum + (precio * comisionRate), 0);
  let velocidadMedia = null, pctEn1h = 0;
  if (tiemposRespuesta.length > 0) {
    tiemposRespuesta.sort((a, b) => a - b);
    velocidadMedia = Math.round(tiemposRespuesta[Math.floor(tiemposRespuesta.length / 2)] * 10) / 10;
    pctEn1h = Math.round((tiemposRespuesta.filter(t => t <= 1).length / tiemposRespuesta.length) * 100);
  }

  const metricasBackend = {
    velocidadMedia, pctEn1h, pipelineValue: Math.round(pipelineValue), proyeccionVentas: Math.round(proyeccionVentas),
    leadsEstancados, tasaCierre: safeLeads.length > 0 ? ((leadsGanados.length / safeLeads.length) * 100).toFixed(1) : '0.0',
    fuentesROI: Object.values(fuentesMapa).map(f => ({ ...f, tasa: f.total > 0 ? (f.cerrados / f.total) * 100 : 0 })).sort((a, b) => b.tasa - a.tasa),
    rendimientoPropiedades: Object.values(propConteo).map(p => ({ ...p, tasa: p.totalLeads > 0 ? ((p.convertidos / p.totalLeads) * 100).toFixed(1) : '0.0' })).sort((a, b) => b.convertidos - a.convertidos || b.totalLeads - a.totalLeads).slice(0, 5)
  };

  if (!insightLimpio) {
    const adminDb = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    insightLimpio = await generarYGuardarInsight(adminDb, broker, metricasBackend, platform);
  }

  return {
    broker, leads: safeLeads, propiedades: safeProps, metricas: metricasBackend,
    insight: insightLimpio
  };
};
