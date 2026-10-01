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

const MODELS_CASCADE = [
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/google/gemma-2-9b-it',
  '@cf/qwen/qwen3-30b-a3b-fp8'
];

function parseInsightResponse(result) {
  const raw = result?.response ?? result;
  console.log('[STEP-AI-1] Raw Output de Cloudflare:', typeof raw === 'string' ? raw.substring(0, 100) + '...' : raw);
  
  const sinThinking = typeof raw === 'string' ? raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim() : raw;

  if (sinThinking && typeof sinThinking === 'object') return sinThinking;

  const match = sinThinking?.match?.(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      console.log('[STEP-AI-2] JSON Extraído con Éxito');
      return parsed;
    } catch (e) {
      console.error('[STEP-AI-ERROR] Fallo al parsear Regex:', e.message);
    }
  }
  throw new Error('El modelo no devolvió un JSON extraíble.');
}

async function generarYGuardarInsight(adminDb, broker, metricasBase, platform) {
  if (!platform?.env?.AI) {
    console.error('[STEP-AI-0] platform.env.AI es undefined. Verifica los bindings en Cloudflare.');
    return;
  }

  console.log(`[STEP-AI-START] Iniciando worker de IA para broker: ${broker.id}`);

  const systemPrompt = `Eres el motor de inteligencia de negocios de Inmublia.
Responde ÚNICAMENTE con un objeto JSON válido. Cero markdown.
{
  "resumen": "Análisis ejecutivo de 2 líneas",
  "accion_prioritaria": "1 instrucción operativa concreta"
}`;

  const userPrompt = `Métricas: Pipeline $${metricasBase.pipelineValue}, Win Rate: ${metricasBase.tasaCierre}%, Leads Inactivos: ${metricasBase.leadsEstancados}.`;

  let finalInsight = null;

  for (const modelId of MODELS_CASCADE) {
    try {
      console.log(`[STEP-AI-CALL] Probando modelo: ${modelId}`);
      const result = await platform.env.AI.run(modelId, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.1
      });

      finalInsight = parseInsightResponse(result);
      
      if (!finalInsight.resumen || !finalInsight.accion_prioritaria) {
        throw new Error('El JSON carece de llaves requeridas');
      }
      break; 
    } catch (err) {
      console.warn(`[STEP-AI-FALLBACK] ${modelId} falló:`, err.message);
    }
  }

  if (!finalInsight) {
    console.error('[STEP-AI-FATAL] Colapso total de la IA. Forzando objeto de emergencia.');
    finalInsight = {
      resumen: "El motor analítico experimentó un error de formato. Las métricas matemáticas están seguras.",
      accion_prioritaria: "Recargue la página para reintentar la conexión neuronal."
    };
  }

  try {
    const { error: upsertError } = await adminDb.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: finalInsight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });

    if (upsertError) throw upsertError;
    console.log(`[STEP-AI-SUCCESS] Caché guardado correctamente en Supabase.`);
  } catch (err) {
    console.error('[STEP-AI-DB-ERROR] Falló el guardado en Supabase:', err.message);
  }
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  let query = db.from('brokers').select('id, nombre_comercial, comision_default, plan_suscripcion, avatar_url');
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
  
  // 🚀 SANACIÓN DE CACHÉ ZOMBI
  let insightLimpio = null;
  if (insightRes.data && insightRes.data.contenido) {
    insightLimpio = insightRes.data.contenido;
    // Si la DB devolvió un String, lo forzamos a Objeto
    if (typeof insightLimpio === 'string') {
      try { insightLimpio = JSON.parse(insightLimpio); } catch(e) {}
    }
    // Si después de todo NO tiene resumen, es un caché corrupto, lo matamos.
    if (!insightLimpio || typeof insightLimpio !== 'object' || !insightLimpio.resumen) {
      console.warn('[STEP-LOAD-WARN] Se detectó un caché corrupto. Forzando regeneración.');
      insightLimpio = null;
    }
  }

  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  let proyeccionVentas = 0;
  let leadsEstancados = 0;
  let tiemposRespuesta = [];
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  const fuentesMapa = {};
  const propConteo = {};
  const propiedadesUnicas = new Map();

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
      const precioCierre = l.precio_cierre || precioProp;
      const pctCierre = l.comision_cierre ? (l.comision_cierre / 100) : comisionRate;
      fuentesMapa[f].comision += precioCierre * pctCierre;
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

  const fuentesROI = Object.values(fuentesMapa).map(f => ({ ...f, tasa: f.total > 0 ? (f.cerrados / f.total) * 100 : 0 })).sort((a, b) => b.tasa - a.tasa);
  const rendimientoPropiedades = Object.values(propConteo).map(p => ({ ...p, tasa: p.totalLeads > 0 ? ((p.convertidos / p.totalLeads) * 100).toFixed(1) : '0.0' })).sort((a, b) => b.convertidos - a.convertidos || b.totalLeads - a.totalLeads).slice(0, 5);
  const tasaCierreGral = safeLeads.length > 0 ? ((leadsGanados.length / safeLeads.length) * 100) : 0;

  const metricasBackend = {
    velocidadMedia, pctEn1h, pipelineValue: Math.round(pipelineValue), proyeccionVentas: Math.round(proyeccionVentas),
    leadsEstancados, tasaCierre: tasaCierreGral.toFixed(1), fuentesROI, rendimientoPropiedades
  };

  if (!insightLimpio) {
    console.log('[STEP-LOAD] Lanzando tarea asíncrona de IA en Background...');
    const adminDb = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const tareaIA = generarYGuardarInsight(adminDb, broker, metricasBackend, platform);
    
    if (platform?.context?.waitUntil) platform.context.waitUntil(tareaIA);
    else if (platform?.ctx?.waitUntil) platform.ctx.waitUntil(tareaIA);
    else tareaIA.catch(e => console.error("Worker IA fallback error:", e));
  }

  return {
    broker, leads: safeLeads, propiedades: safeProps, metricas: metricasBackend,
    insight: insightLimpio
  };
};
