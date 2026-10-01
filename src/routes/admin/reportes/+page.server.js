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

// Generador de IA No Bloqueante
async function generarYGuardarInsight(supabase, broker, metricasBase, platform) {
  try {
    const prompt = `Actúa como un estratega ejecutivo de Real Estate SaaS. Analiza estas métricas:
- Pipeline Activo: $${metricasBase.pipelineValue}
- Proyección Próximo Mes: $${metricasBase.proyeccionVentas}
- Win Rate: ${metricasBase.tasaCierre}%
- Leads Inactivos (>15d): ${metricasBase.leadsEstancados}
- Velocidad Respuesta: ${metricasBase.velocidadMedia !== null ? metricasBase.velocidadMedia + 'h' : 'N/A'}

Genera un JSON estricto con tono corporativo premium: {
  "resumen": "análisis de 2 líneas de alto impacto directivo", 
  "accion_prioritaria": "1 instrucción operativa clara y específica"
}`;

    if (!platform?.env?.AI) return;

    const result = await platform.env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.2
    });

    const insight = JSON.parse(result.response);

    await supabase.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: insight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });

  } catch (err) {
    console.error('[AI Insight] Worker background error:', err.message);
  }
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Obtener Broker Seguro
  let query = db.from('brokers').select('id, nombre_comercial, comision_default, plan_suscripcion, avatar_url');
  query = (locals.isImpersonating && locals.tenantId) ? query.eq('id', locals.tenantId) : query.eq('auth_user_id', locals.user.id);

  const { data: broker, error: brokerError } = await query.single();
  if (brokerError || !broker) throw redirect(303, '/login');

  const comisionRate = (broker.comision_default || 5) / 100;

  // 2. Extracción de Datos (Consultas Desacopladas y Seguras para evitar colapsos)
  const [leadsRes, propsRes, insightRes] = await Promise.all([
    db.from('leads').select('*, propiedades (*)').eq('broker_id', broker.id),
    db.from('propiedades').select('*').eq('broker_id', broker.id),
    db.from('ai_insights_cache').select('contenido, generado_en')
      .eq('broker_id', broker.id)
      .eq('tipo', 'reporte_diario')
      .gte('generado_en', new Date(Date.now() - 86400000).toISOString())
      .maybeSingle()
  ]);

  if (leadsRes.error) console.error("Error DB Leads:", leadsRes.error);
  
  const safeLeads = leadsRes.data || [];
  const safeProps = propsRes.data || [];
  const insightGuardado = insightRes.data;

  // 3. Procesamiento de Métricas Base (O(n))
  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  
  let pipelineValue = 0;
  let proyeccionVentas = 0;
  let leadsEstancados = 0;
  let tiemposRespuesta = [];
  
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  const fuentesMapa = {};
  const propConteo = {};

  safeLeads.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    const precioProp = l.propiedades?.precio || 0;
    
    // Proyecciones
    if (!['cerrado', 'descartado'].includes(est)) {
      pipelineValue += (precioProp * comisionRate);
      proyeccionVentas += (precioProp * comisionRate * (PROB_ETAPA[est] || 0.05));

      const diasInactivo = Math.floor((new Date() - getValidDate(l.ultima_actividad || l.creado_en || l.created_at)) / 86400000);
      if (diasInactivo > 15) leadsEstancados++;
    }

    // Velocidad de Respuesta Calculada de forma segura
    const creacion = getValidDate(l.creado_en || l.created_at).getTime();
    const ultimaAct = getValidDate(l.ultima_actividad).getTime();
    if (ultimaAct > creacion) {
      const horas = (ultimaAct - creacion) / (1000 * 60 * 60);
      if (horas >= 0 && horas <= 720) tiemposRespuesta.push(horas);
    }

    // ROI Canales
    const f = (l.origen || l.fuente || 'Directo').trim();
    if (!fuentesMapa[f]) fuentesMapa[f] = { nombre: f, total: 0, cerrados: 0, comision: 0 };
    fuentesMapa[f].total++;
    
    if (est === 'cerrado') {
      fuentesMapa[f].cerrados++;
      const precioCierre = l.precio_cierre || precioProp;
      const pctCierre = l.comision_cierre ? (l.comision_cierre / 100) : comisionRate;
      fuentesMapa[f].comision += precioCierre * pctCierre;
    }

    // Rendimiento Propiedades
    if (l.propiedades) {
      const pId = l.propiedades.id;
      if (!propConteo[pId]) propConteo[pId] = { titulo: l.propiedades.titulo, estatus: l.propiedades.estatus, totalLeads: 0, convertidos: 0 };
      propConteo[pId].totalLeads++;
      if (est === 'cerrado') propConteo[pId].convertidos++;
    }
  });

  // Agregación de Resultados
  let velocidadMedia = null;
  let pctEn1h = 0;
  if (tiemposRespuesta.length > 0) {
    tiemposRespuesta.sort((a, b) => a - b);
    velocidadMedia = Math.round(tiemposRespuesta[Math.floor(tiemposRespuesta.length / 2)] * 10) / 10;
    pctEn1h = Math.round((tiemposRespuesta.filter(t => t <= 1).length / tiemposRespuesta.length) * 100);
  }

  const fuentesROI = Object.values(fuentesMapa)
    .map(f => ({ ...f, tasa: f.total > 0 ? (f.cerrados / f.total) * 100 : 0 }))
    .sort((a, b) => b.tasa - a.tasa);

  const rendimientoPropiedades = Object.values(propConteo)
    .map(p => ({ ...p, tasa: p.totalLeads > 0 ? ((p.convertidos / p.totalLeads) * 100).toFixed(1) : '0.0' }))
    .sort((a, b) => b.convertidos - a.convertidos || b.totalLeads - a.totalLeads)
    .slice(0, 5);

  const tasaCierreGral = safeLeads.length > 0 ? ((leadsGanados.length / safeLeads.length) * 100) : 0;

  const metricasBackend = {
    velocidadMedia,
    pctEn1h,
    pipelineValue: Math.round(pipelineValue),
    proyeccionVentas: Math.round(proyeccionVentas),
    leadsEstancados,
    tasaCierre: tasaCierreGral.toFixed(1),
    fuentesROI,
    rendimientoPropiedades
  };

  // 4. Invocación de IA Stale-While-Revalidate
  if (!insightGuardado) {
    const tareaIA = generarYGuardarInsight(db, broker, metricasBackend, platform);
    
    if (platform?.context?.waitUntil) {
      platform.context.waitUntil(tareaIA);
    } else if (platform?.ctx?.waitUntil) {
      platform.ctx.waitUntil(tareaIA);
    } else {
      tareaIA.catch(e => console.error("Worker IA fallback:", e));
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
