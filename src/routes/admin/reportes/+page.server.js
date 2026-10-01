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

// Estrategia de aislamiento: Un solo modelo ultra-estable
const MODEL_ID = '@cf/meta/llama-3.1-8b-instruct';

function parseInsightResponse(result) {
  // LOG ABSOLUTO: Vemos la radiografía de la respuesta
  console.log('\n[RAW-CF-RESPONSE-START]');
  console.log(JSON.stringify(result, null, 2));
  console.log('[RAW-CF-RESPONSE-END]\n');

  let rawString = '';
  if (typeof result === 'string') rawString = result;
  else if (result?.response) rawString = result.response;
  else if (result?.result?.response) rawString = result.result.response;
  else rawString = JSON.stringify(result);

  const sinThinking = rawString.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const match = sinThinking.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      console.log('[STEP-AI] JSON Parseado con éxito:', parsed);
      return parsed;
    } catch (e) {
      console.error('[PARSE-ERROR] Regex extrajo esto pero no es JSON válido:', match[0]);
      throw e;
    }
  }

  throw new Error('No se encontró estructura JSON en el payload.');
}

async function generarYGuardarInsight(adminDb, broker, metricasBase, platform) {
  console.log(`[STEP-WAITUNTIL] Ejecutando Background Job. Context: ${!!platform?.context}, Ctx: ${!!platform?.ctx}`);
  
  if (!platform?.env?.AI) {
    console.error('[STEP-AI-FATAL] platform.env.AI no está inyectado en este entorno.');
    return;
  }

  const systemPrompt = `Eres el motor de inteligencia de negocios de Inmublia.
Responde ÚNICAMENTE con un objeto JSON válido. Cero markdown, cero explicaciones.
{
  "resumen": "Análisis ejecutivo de 2 líneas en español",
  "accion_prioritaria": "1 instrucción operativa concreta"
}`;

  const userPrompt = `Métricas: Pipeline $${metricasBase.pipelineValue}, Win Rate: ${metricasBase.tasaCierre}%, Leads Inactivos: ${metricasBase.leadsEstancados}, Conversión: ${metricasBase.proyeccionVentas}`;

  let finalInsight = null;

  try {
    const result = await platform.env.AI.run(MODEL_ID, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 250,
      temperature: 0.1
    });

    finalInsight = parseInsightResponse(result);
    
    if (!finalInsight.resumen || !finalInsight.accion_prioritaria) {
      throw new Error('Faltan propiedades en el JSON.');
    }
  } catch (err) {
    console.error(`[STEP-AI-ERROR] Falló la inferencia o el parseo:`, err.message);
    finalInsight = {
      resumen: "El motor analítico experimentó un error de formato. Las métricas matemáticas están seguras.",
      accion_prioritaria: "Recargue la página para reintentar la conexión neuronal."
    };
  }

  try {
    await adminDb.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: finalInsight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });
    console.log('[STEP-DB] Upsert completado con éxito.');
  } catch (err) {
    console.error('[STEP-DB-ERROR] Error al hacer upsert:', err.message);
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
  
  // 🚀 BUSTER DE CACHÉ ZOMBI
  let insightLimpio = null;
  if (insightRes.data && insightRes.data.contenido) {
    insightLimpio = insightRes.data.contenido;
    if (typeof insightLimpio === 'string') {
      try { insightLimpio = JSON.parse(insightLimpio); } catch(e) {}
    }
    
    // Validar si el caché actual es el mensaje de emergencia de un error previo
    if (insightLimpio && typeof insightLimpio === 'object') {
      const isFallback = insightLimpio.resumen && insightLimpio.resumen.includes('error de formato');
      if (isFallback || !insightLimpio.resumen) {
        console.warn('[STEP-LOAD] Caché corrupto o de emergencia detectado. Forzando regeneración (Bust Cache).');
        insightLimpio = null; 
      }
    } else {
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
