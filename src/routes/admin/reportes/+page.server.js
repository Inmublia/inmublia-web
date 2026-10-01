// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Utilidad segura para fechas y evitar errores NaN
const getValidDate = (dateStr, fallback = new Date()) => {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
};

// Función para delegar la carga pesada a Cloudflare AI Workers sin bloquear el renderizado
async function generarYGuardarInsight(supabase, broker, metricasBase, platform) {
  try {
    const prompt = `Eres un estratega inmobiliario top. Analiza estas métricas:
- Pipeline Activo: $${metricasBase.pipelineValue}
- Proyección Ventas: $${metricasBase.proyeccionVentas}
- Tasa Cierre: ${metricasBase.tasaCierre}%
- Leads Estancados: ${metricasBase.leadsEstancados}
- Velocidad Media de Respuesta: ${metricasBase.velocidadMedia !== null ? metricasBase.velocidadMedia + 'h' : 'Sin datos'}

Responde en JSON estricto: {
  "resumen": "análisis de 2 líneas resaltando el dato más crítico", 
  "accion_prioritaria": "1 acción directa y muy específica"
}`;

    if (!platform?.env?.AI) return; // Salida segura en modo desarrollo/local

    const result = await platform.env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    const insight = JSON.parse(result.response);

    // Guardado en caché
    await supabase.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: insight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });

  } catch (err) {
    console.error('[AI Insight] Fallo silencioso en background:', err.message);
  }
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 🚀 FIX C1: Select seguro sin asterisco para no exponer webhooks ni datos de Stripe
  let query = db.from('brokers').select('id, nombre_comercial, comision_default, plan_suscripcion, avatar_url');
  query = (locals.isImpersonating && locals.tenantId) ? query.eq('id', locals.tenantId) : query.eq('auth_user_id', locals.user.id);

  const { data: broker, error: brokerError } = await query.single();
  if (brokerError || !broker) throw redirect(303, '/login');

  const comisionRate = (broker.comision_default || 5) / 100;

  // Ejecución en paralelo de la Base de Datos y Caché
  const [leadsRes, propsRes, insightRes] = await Promise.all([
    // FIX: Se extrae lead_notas para calcular tiempos de respuesta
    db.from('leads').select(`*, propiedades (*), lead_notas (creado_en, created_at)`).eq('broker_id', broker.id),
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

  // ==========================================
  // 🚀 FIX C2: CÁLCULOS PESADOS EN EL SERVIDOR
  // ==========================================
  
  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  
  let pipelineValue = 0;
  let proyeccionVentas = 0;
  let leadsEstancados = 0;
  
  // Feature 3: Probabilidades para la proyección
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };

  let tiemposRespuesta = [];
  const fuentesMapa = {};
  const propConteo = {};

  // Iteración ÚNICA (O(n)) para procesar todas las métricas
  safeLeads.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    const precioProp = l.propiedades?.precio || 0;
    
    // 1. Pipeline y Proyección
    if (!['cerrado', 'descartado'].includes(est)) {
      pipelineValue += (precioProp * comisionRate);
      proyeccionVentas += (precioProp * comisionRate * (PROB_ETAPA[est] || 0.05));

      // FIX I2: Leads Estancados (+15 días sin actividad)
      const diasInactivo = Math.floor((new Date() - getValidDate(l.ultima_actividad || l.creado_en || l.created_at)) / 86400000);
      if (diasInactivo > 15) leadsEstancados++;
    }

    // 2. Velocidad de Respuesta (Feature 2)
    if (l.lead_notas && l.lead_notas.length > 0) {
      const creacion = getValidDate(l.creado_en || l.created_at).getTime();
      const primeraNota = Math.min(...l.lead_notas.map(n => getValidDate(n.creado_en || n.created_at).getTime()));
      const horas = (primeraNota - creacion) / (1000 * 60 * 60);
      if (horas >= 0 && horas <= 720) tiemposRespuesta.push(horas);
    }

    // 3. Fuentes ROI y Conversión
    const f = (l.origen || l.fuente || 'Directo').trim();
    if (!fuentesMapa[f]) fuentesMapa[f] = { nombre: f, total: 0, cerrados: 0, comision: 0 };
    fuentesMapa[f].total++;
    
    if (est === 'cerrado') {
      fuentesMapa[f].cerrados++;
      const precioCierre = l.precio_cierre || precioProp;
      const pctCierre = l.comision_cierre ? (l.comision_cierre / 100) : comisionRate;
      fuentesMapa[f].comision += precioCierre * pctCierre;
    }

    // 4. Rendimiento Propiedades (FIX I3)
    if (l.propiedades) {
      const pId = l.propiedades.id;
      if (!propConteo[pId]) propConteo[pId] = { titulo: l.propiedades.titulo, estatus: l.propiedades.estatus, totalLeads: 0, convertidos: 0 };
      propConteo[pId].totalLeads++;
      if (est === 'cerrado') propConteo[pId].convertidos++;
    }
  });

  // Resolución Final de Métricas
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

  // ==========================================
  // DISPARO DE IA NO BLOQUEANTE
  // ==========================================
  if (!insightGuardado) {
    const tareaIA = generarYGuardarInsight(db, broker, metricasBackend, platform);
    
    if (platform?.context?.waitUntil) {
      platform.context.waitUntil(tareaIA);
    } else if (platform?.ctx?.waitUntil) {
      platform.ctx.waitUntil(tareaIA);
    } else {
      tareaIA.catch(e => console.error("Error en worker de IA:", e));
    }
  }

  // Limpieza final de payload: quitamos 'lead_notas' del arreglo para no engordar la carga del navegador
  const cleanLeads = safeLeads.map(l => {
    const { lead_notas, ...rest } = l;
    return rest;
  });

  return {
    broker,
    leads: cleanLeads,
    propiedades: safeProps,
    metricas: metricasBackend,
    insight: insightGuardado?.contenido || null
  };
};
