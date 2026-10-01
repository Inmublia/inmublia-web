import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const getValidDate = (dateStr, fallback = new Date()) => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
};

// 🚀 CASCADA ENTERPRISE: Ordenada de menor a mayor costo de inferencia
const MODELS_CASCADE = [
  '@cf/meta/llama-3.1-8b-instruct',  // Francotirador principal (Ultra eficiente)
  '@cf/google/gemma-2-9b-it',        // Fallback rápido
  '@cf/qwen/qwen3-30b-a3b-fp8'       // Salvavidas pesado
];

// 🛡️ PARSER DEFENSIVO 2026: Destruye los bloques <think> de los modelos de razonamiento
function parseInsightResponse(result) {
  const raw = result?.response ?? result;
  
  const sinThinking = typeof raw === 'string'
    ? raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    : raw;

  if (sinThinking && typeof sinThinking === 'object') return sinThinking;

  const match = sinThinking?.match?.(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);

  throw new Error('El modelo no devolvió un JSON extraíble.');
}

async function generarYGuardarInsight(adminDb, broker, metricasBase, platform) {
  if (!platform?.env?.AI) return;

  // Cinturón y Tirantes: Forzamos la estructura desde el Prompt
  const systemPrompt = `Eres el motor de inteligencia de negocios de Inmublia.
Responde ÚNICAMENTE con un objeto JSON válido. Cero markdown, cero explicaciones, cero bloques de pensamiento.
Estructura obligatoria:
{
  "resumen": "Análisis ejecutivo de 2 líneas en español sobre la salud del pipeline",
  "accion_prioritaria": "1 instrucción operativa concreta y directa para el broker"
}`;

  const userPrompt = `Métricas del Broker:
- Pipeline Activo (Deduplicado): $${metricasBase.pipelineValue}
- Proyección Próximo Mes: $${metricasBase.proyeccionVentas}
- Win Rate: ${metricasBase.tasaCierre}%
- Leads Inactivos (>15d): ${metricasBase.leadsEstancados}
- Velocidad Respuesta: ${metricasBase.velocidadMedia !== null ? metricasBase.velocidadMedia + 'h' : 'N/A'}`;

  let finalInsight = null;

  for (const modelId of MODELS_CASCADE) {
    try {
      const result = await platform.env.AI.run(modelId, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }, // Compatibilidad nativa CF AI
        max_tokens: 250,
        temperature: 0.1
      });

      finalInsight = parseInsightResponse(result);
      
      if (!finalInsight.resumen || !finalInsight.accion_prioritaria) {
        throw new Error('Estructura JSON incompleta tras parseo');
      }
      break; 
    } catch (err) {
      console.warn(`[AI Fallback] ${modelId.split('/').pop()} falló:`, err.message);
    }
  }

  if (!finalInsight) {
    console.error('[AI Insight] Colapso total de la cascada. Abortando generación.');
    return;
  }

  try {
    await adminDb.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: finalInsight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });
  } catch (err) {
    console.error('[AI Insight] Error al persistir en caché:', err.message);
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

  const { data: broker, error: brokerError } = await query.single();
  if (brokerError || !broker) throw redirect(303, '/login');

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
  const insightGuardado = insightRes.data;

  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  
  let proyeccionVentas = 0;
  let leadsEstancados = 0;
  let tiemposRespuesta = [];
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  const fuentesMapa = {};
  const propConteo = {};
  
  // 🚀 FIX MEDIO 1: Deduplicación Matemática del Inventario
  const propiedadesUnicas = new Map();

  safeLeads.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    const precioProp = l.propiedades?.precio || 0;
    
    if (!['cerrado', 'descartado'].includes(est)) {
      proyeccionVentas += (precioProp * comisionRate * (PROB_ETAPA[est] || 0.05));
      
      // Aislar propiedades para no inflar el pipeline
      if (l.propiedad_id && precioProp > 0) {
        propiedadesUnicas.set(l.propiedad_id, precioProp);
      }

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

  // Cálculo del pipeline deduplicado
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
    velocidadMedia, pctEn1h,
    pipelineValue: Math.round(pipelineValue),
    proyeccionVentas: Math.round(proyeccionVentas),
    leadsEstancados, tasaCierre: tasaCierreGral.toFixed(1),
    fuentesROI, rendimientoPropiedades
  };

  if (!insightGuardado) {
    const adminDb = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const tareaIA = generarYGuardarInsight(adminDb, broker, metricasBackend, platform);
    
    if (platform?.context?.waitUntil) {
      platform.context.waitUntil(tareaIA);
    } else if (platform?.ctx?.waitUntil) {
      platform.ctx.waitUntil(tareaIA);
    } else {
      tareaIA.catch(e => console.error("Worker IA fallback error:", e));
    }
  }

  return {
    broker,
    leads: safeLeads,
    propiedades: safeProps,
    metricas: metricasBackend,
    insight: insightGuardado?.contenido || null
  };
};
