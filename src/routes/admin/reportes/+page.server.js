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

const MODEL_ID = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

function parseInsightResponse(result) {
  let rawString = '';
  if (typeof result === 'string') rawString = result;
  else if (result?.response) rawString = result.response;
  else if (result?.result?.response) rawString = result.result.response;
  else rawString = JSON.stringify(result);

  if (typeof result === 'object' && result.resumen && result.evidencia) return result;
  if (typeof result?.response === 'object' && result.response.resumen) return result.response;

  const sinThinking = rawString.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(sinThinking);
  } catch (e) {
    const match = sinThinking.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Imposible extraer JSON válido.');
  }
}

async function generarYGuardarInsight(adminDb, broker, metricasBase, platform) {
  if (!platform?.env?.AI) return null;

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  const systemPrompt = `Eres el Director Estratégico Comercial (CSO) de Inmublia.
Tu trabajo es identificar el principal cuello de botella comercial de los ÚLTIMOS 30 DÍAS, explicar por qué importa y dictar una acción concreta.

REGLAS ESTRICTAS:
1. Usa únicamente los datos proporcionados.
2. NUNCA uses adjetivos vacíos ("saludable", "bajo", "bueno") a menos que cites la métrica exacta.
3. Menciona al menos DOS cifras concretas en tu justificación (evidencia).
4. La 'accion_prioritaria' debe indicar QUÉ hacer, DÓNDE hacerlo y QUÉ MÉTRICA mejorar.
5. Evita obviedades. El resumen debe sonar a estrategia directiva de alto nivel.`;

  const userPrompt = `MÉTRICAS (ÚLTIMOS 30 DÍAS):
- Inventario en Negociación: ${formatter.format(metricasBase.pipelineBruto)}
- Comisión Potencial: ${formatter.format(metricasBase.pipelineComision)}
- Win Rate: ${metricasBase.tasaCierre}%
- Leads Estancados (>15 días): ${metricasBase.leadsEstancados}
- Velocidad de Respuesta: ${metricasBase.velocidadMedia !== null ? metricasBase.velocidadMedia + ' hrs' : 'N/A'} (${metricasBase.pctEn1h}% en <1h)
- Mejores Canales: ${metricasBase.topCanales}
- Propiedad más caliente: ${metricasBase.topPropiedad}`;

  let finalInsight = null;
  let aiGeneradoExitosamente = false;

  try {
    const result = await platform.env.AI.run(MODEL_ID, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          type: 'object',
          properties: {
            resumen: { type: 'string' },
            evidencia: { type: 'string' },
            accion_prioritaria: { type: 'string' }
          },
          required: ['resumen', 'evidencia', 'accion_prioritaria']
        }
      },
      max_tokens: 400,
      temperature: 0.3 
    });

    finalInsight = parseInsightResponse(result);
    if (!finalInsight || !finalInsight.evidencia || !finalInsight.accion_prioritaria) throw new Error('Estructura JSON incompleta.');
    aiGeneradoExitosamente = true;

  } catch (err) {
    console.error(`[IA-ERROR]`, err.message);
    finalInsight = {
      resumen: "El análisis estratégico tomará unos minutos más debido a la alta carga en el motor de Inteligencia Artificial.",
      evidencia: "Sus métricas operativas y finanzas están al 100% actualizadas.",
      accion_prioritaria: "Proceda operando su embudo. El insight aparecerá automáticamente en su próxima visita."
    };
  }

  if (aiGeneradoExitosamente) {
    try {
      await adminDb.from('ai_insights_cache').upsert({
        broker_id: broker.id,
        tipo: 'reporte_diario',
        contenido: finalInsight,
        generado_en: new Date().toISOString()
      }, { onConflict: 'broker_id, tipo' });
    } catch (err) { console.error('[IA-DB-ERROR]', err.message); }
  }
  return finalInsight;
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
  
  let insightLimpio = null;
  if (insightRes.data && insightRes.data.contenido) {
    insightLimpio = insightRes.data.contenido;
    if (typeof insightLimpio === 'string') try { insightLimpio = JSON.parse(insightLimpio); } catch(e) {}
    
    if (insightLimpio && typeof insightLimpio === 'object') {
      const isFallback = !insightLimpio.evidencia || (insightLimpio.resumen && insightLimpio.resumen.includes('tomará unos minutos'));
      if (isFallback || !insightLimpio.resumen) insightLimpio = null; 
    } else insightLimpio = null;
  }

  const limite30Dias = new Date(Date.now() - (30 * 86400000));
  const leads30d = safeLeads.filter(l => new Date(l.creado_en || l.created_at) >= limite30Dias);
  
  const leadsGanados = leads30d.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  let pipelineBruto = 0, pipelineComision = 0, leadsEstancados = 0, tiemposRespuesta = [];
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  const fuentesMapa = {}, propConteo = {}, propiedadesUnicas = new Map();

  leads30d.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    const precioProp = l.propiedades?.precio || 0;
    
    if (!['cerrado', 'descartado'].includes(est)) {
      if (l.propiedad_id && precioProp > 0) propiedadesUnicas.set(l.propiedad_id, precioProp);
      pipelineComision += (precioProp * comisionRate * (PROB_ETAPA[est] || 0.05));
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
    if (est === 'cerrado') fuentesMapa[f].cerrados++;
    
    if (l.propiedades) {
      const pId = l.propiedades.id;
      if (!propConteo[pId]) propConteo[pId] = { titulo: l.propiedades.titulo, totalLeads: 0 };
      propConteo[pId].totalLeads++;
    }
  });

  pipelineBruto = [...propiedadesUnicas.values()].reduce((sum, precio) => sum + precio, 0);

  let velocidadMedia = null, pctEn1h = 0;
  if (tiemposRespuesta.length > 0) {
    tiemposRespuesta.sort((a, b) => a - b);
    velocidadMedia = Math.round(tiemposRespuesta[Math.floor(tiemposRespuesta.length / 2)] * 10) / 10;
    pctEn1h = Math.round((tiemposRespuesta.filter(t => t <= 1).length / tiemposRespuesta.length) * 100);
  }

  const topCanalesArr = Object.values(fuentesMapa).sort((a, b) => b.total - a.total).slice(0, 2).map(c => `${c.nombre} (${c.total})`).join(', ');
  const topPropiedadArr = Object.values(propConteo).sort((a, b) => b.totalLeads - a.totalLeads)[0]?.titulo || 'N/A';

  const metricasBackend = {
    velocidadMedia, pctEn1h, pipelineBruto, pipelineComision: Math.round(pipelineComision),
    leadsEstancados, tasaCierre: leads30d.length > 0 ? ((leadsGanados.length / leads30d.length) * 100).toFixed(1) : '0.0',
    topCanales: topCanalesArr || 'Sin canales',
    topPropiedad: topPropiedadArr
  };

  // 🚀 FIX ARQUITECTÓNICO: "Streaming de Promesas"
  // Pasamos la promesa VIVA al frontend, SvelteKit la resuelve sin congelar la navegación.
  let insightPromise;
  if (insightLimpio) {
    insightPromise = Promise.resolve(insightLimpio);
  } else {
    const adminDb = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    insightPromise = generarYGuardarInsight(adminDb, broker, metricasBackend, platform);
  }

  return {
    broker, leads: safeLeads, propiedades: safeProps, metricas: metricasBackend,
    // "lazy" indica a SvelteKit que NO bloquee la carga por esto
    lazy: {
      insight: insightPromise
    }
  };
};
