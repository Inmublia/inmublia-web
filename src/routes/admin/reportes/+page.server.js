// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Utilidad segura para fechas
const getValidDate = (dateStr, fallback = new Date()) => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
};

// MOTOR DE INSIGHTS (Reemplazo robusto a la IA externa)
function generarInsightInteligente(metricas) {
  const { tasaCierre, estancados, proyeccion, velocidadMediana, mejorCanal } = metricas;
  let resumen = "";
  let accion = "";

  if (velocidadMediana > 24) {
    resumen = `Tu tiempo de primera respuesta es de ${velocidadMediana}h. Los brokers que responden en < 1h cierran 3x más.`;
    accion = "Activa notificaciones push o revisa tus leads 2 veces al día.";
  } else if (estancados > 10) {
    resumen = `Tienes ${estancados} prospectos sin actividad reciente. Esto representa un cuello de botella en tu pipeline.`;
    accion = "Lanza una campaña de reactivación por WhatsApp a tus leads estancados hoy.";
  } else if (mejorCanal && mejorCanal.tasa > 0) {
    resumen = `Tu canal "${mejorCanal.nombre}" está liderando con ${mejorCanal.tasa.toFixed(1)}% de conversión. Tienes un pipeline sano proyectando $${(proyeccion/1000).toFixed(0)}k.`;
    accion = `Mueve un 20% de tu presupuesto de marketing hacia ${mejorCanal.nombre}.`;
  } else {
    resumen = "Tu pipeline está en fase de construcción. Mantén el ritmo de captación.";
    accion = "Asegúrate de registrar una nota por cada llamada que hagas hoy.";
  }

  return { resumen, accion_prioritaria: accion };
}

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 🚀 FIX C1: Query seguro para no exponer datos sensibles a la red
  let query = db.from('brokers').select('id, nombre_comercial, comision_default, plan_suscripcion, avatar_url');
  query = (locals.isImpersonating && locals.tenantId) ? query.eq('id', locals.tenantId) : query.eq('auth_user_id', locals.user.id);

  const { data: broker, error: brokerError } = await query.single();
  if (brokerError || !broker) throw redirect(303, '/login');

  const comisionRate = (broker.comision_default || 5) / 100;

  // 🚀 FIX: Traemos lead_notas para calcular la Velocidad de Respuesta (Feature 2)
  const { data: leads } = await db
    .from('leads')
    .select(`*, propiedades (*), lead_notas (creado_en)`)
    .eq('broker_id', broker.id);

  const { data: propiedades } = await db
    .from('propiedades')
    .select('*')
    .eq('broker_id', broker.id);

  const safeLeads = leads || [];
  const safeProps = propiedades || [];

  // ==========================================
  // CÁLCULOS PESADOS EN EL SERVIDOR (FIX C2)
  // ==========================================
  
  const leadsGanados = safeLeads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado');
  
  // 1. Velocidad de Respuesta
  let tiemposRespuesta = [];
  safeLeads.forEach(l => {
    if (l.lead_notas && l.lead_notas.length > 0) {
      const creacion = getValidDate(l.creado_en).getTime();
      const primeraNota = Math.min(...l.lead_notas.map(n => getValidDate(n.creado_en || n.created_at).getTime()));
      const horas = (primeraNota - creacion) / (1000 * 60 * 60);
      if (horas >= 0 && horas <= 720) tiemposRespuesta.push(horas);
    }
  });
  
  let velocidadMedia = null;
  let pctEn1h = 0;
  if (tiemposRespuesta.length > 0) {
    tiemposRespuesta.sort((a,b) => a-b);
    velocidadMedia = Math.round(tiemposRespuesta[Math.floor(tiemposRespuesta.length / 2)] * 10) / 10;
    pctEn1h = Math.round((tiemposRespuesta.filter(t => t <= 1).length / tiemposRespuesta.length) * 100);
  }

  // 2. Proyección de Ventas (Feature 3)
  const PROB_ETAPA = { 'nuevo': 0.05, 'contactado': 0.15, 'visita': 0.35, 'negociacion': 0.65 };
  let proyeccionVentas = 0;
  let leadsEstancados = 0;

  safeLeads.forEach(l => {
    const est = (l.estado || 'nuevo').toLowerCase().trim();
    if (!['cerrado', 'descartado'].includes(est)) {
      const prob = PROB_ETAPA[est] || 0.05;
      const precio = l.propiedades?.precio || 0;
      proyeccionVentas += (precio * comisionRate * prob);

      // FIX I2: Estancados basados en última actividad
      const diasInactivo = Math.floor((new Date() - getValidDate(l.ultima_actividad || l.creado_en)) / 86400000);
      if (diasInactivo > 15) leadsEstancados++;
    }
  });

  // 3. Fuentes ROI y Conversión
  const fuentesMapa = {};
  safeLeads.forEach(l => {
    const f = (l.origen || l.fuente || 'Directo').trim();
    if (!fuentesMapa[f]) fuentesMapa[f] = { nombre: f, total: 0, cerrados: 0, comision: 0 };
    fuentesMapa[f].total++;
    if (l.estado?.toLowerCase().trim() === 'cerrado') {
      fuentesMapa[f].cerrados++;
      const precio = l.precio_cierre || l.propiedades?.precio || 0;
      const pct = l.comision_cierre ? l.comision_cierre / 100 : comisionRate;
      fuentesMapa[f].comision += precio * pct;
    }
  });
  
  const fuentesROI = Object.values(fuentesMapa)
    .map(f => ({ ...f, tasa: f.total > 0 ? (f.cerrados / f.total) * 100 : 0 }))
    .sort((a, b) => b.tasa - a.tasa);

  // 4. Rendimiento de Propiedades (FIX I3 - Conversión Real)
  const propConteo = {};
  safeLeads.forEach(l => {
    if (!l.propiedades) return;
    const pId = l.propiedades.id;
    if (!propConteo[pId]) {
      propConteo[pId] = { titulo: l.propiedades.titulo, estatus: l.propiedades.estatus, totalLeads: 0, convertidos: 0 };
    }
    propConteo[pId].totalLeads++;
    if (l.estado?.toLowerCase().trim() === 'cerrado') propConteo[pId].convertidos++;
  });

  const rendimientoPropiedades = Object.values(propConteo)
    .map(p => ({ ...p, tasa: p.totalLeads > 0 ? ((p.convertidos / p.totalLeads) * 100).toFixed(1) : '0.0' }))
    .sort((a, b) => b.convertidos - a.convertidos || b.totalLeads - a.totalLeads)
    .slice(0, 5);

  const tasaCierreGral = safeLeads.length > 0 ? ((leadsGanados.length / safeLeads.length) * 100) : 0;

  const metricasBackend = {
    velocidadMedia,
    pctEn1h,
    proyeccionVentas: Math.round(proyeccionVentas),
    leadsEstancados,
    fuentesROI,
    mejorCanal: fuentesROI.length > 0 ? fuentesROI[0] : null,
    rendimientoPropiedades,
    tasaCierreGral
  };

  const aiInsight = generarInsightInteligente(metricasBackend);

  return {
    broker,
    leads: safeLeads.map(l => { delete l.lead_notas; return l; }), // Limpiamos para no saturar al cliente
    propiedades: safeProps,
    metricas: metricasBackend,
    aiInsight
  };
};
