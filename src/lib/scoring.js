// src/lib/scoring.js

const BASE_POR_ETAPA = {
  'cerrado':         0,
  'descartado':      0,
  'negociacion':    50,
  'visita':         40,
  'contactado':     25,
  'nuevo':          10
};

function calcularMultiplicador(lead) {
  const notas = (lead.lead_notas || []).map(n => n.contenido).join(' ').toLowerCase();
  const textoCompleto = [lead.mensaje_inicial || '', lead.nombre || '', lead.origen || '', notas].join(' ').toLowerCase();

  let factor = 1.0;

  if (lead.telefono && lead.correo) factor += 0.20;
  if (lead.propiedad_id) factor += 0.25;
  
  const origen = (lead.origen || '').toLowerCase();
  if (['whatsapp', 'recomendación', 'llamada'].includes(origen)) factor += 0.20;

  const patronesPositivos = [
    /\b(quiero|quisiera|interesa|necesito|buscamos?)\b.{0,30}\b(cita|visita|ver|apartar)\b/,
    /\b(dinero|efectivo|contado|pago de contado)\b/,
    /\b(cr[eé]dito|hipoteca|infonavit|fovissste)\b.{0,20}\b(aprobad[oa]|listo|tengo)\b/,
    /\b(urgente|antes posible|mudanza)\b/,
    /\b(ya decid[ií]|estamos decididos?|lo queremos?|lo tomamos?)\b/
  ];
  
  const patronesNeutralizadores = [
    /\b(cancel[óo]|cancela[rn]?|no pudo|no puede)\b.{0,20}\b(cita|visita)\b/,
    /\b(negaron?|rechazaron?|no aprobaron?)\b.{0,20}\b(cr[eé]dito|pr[eé]stamo)\b/
  ];

  const hayPositivo = patronesPositivos.some(p => p.test(textoCompleto));
  const hayNeutralizador = patronesNeutralizadores.some(p => p.test(textoCompleto));

  if (hayPositivo && !hayNeutralizador) factor += 0.30;
  if ((lead.lead_notas || []).length >= 2) factor += 0.15;

  const señalesNegativas = ['todavía no', 'aún no', 'después', 'más adelante', 'canceló', 'negaron', 'pensándolo', 'viendo opciones'].some(k => textoCompleto.includes(k));
  if (señalesNegativas) factor -= 0.25;

  return Math.max(0.5, Math.min(2.0, factor));
}

const DECAY_POR_ETAPA = {
  'negociacion': { diasTolerancia: 15, velocidad: 0.8, pisoMinimo: 0.4 },
  'visita':      { diasTolerancia: 5,  velocidad: 1.5, pisoMinimo: 0.2 },
  'contactado':  { diasTolerancia: 3,  velocidad: 2.0, pisoMinimo: 0.1 },
  'nuevo':       { diasTolerancia: 1,  velocidad: 3.0, pisoMinimo: 0.0 }
};

function calcularDecay(estado, fechaUltimaActividad) {
  const config = DECAY_POR_ETAPA[estado] || DECAY_POR_ETAPA['nuevo'];
  if (!fechaUltimaActividad) return config.pisoMinimo;

  const diasSinActividad = Math.max(0, (Date.now() - new Date(fechaUltimaActividad).getTime()) / (1000 * 60 * 60 * 24));
  
  if (diasSinActividad <= config.diasTolerancia) return 1.0;

  const diasPenalizados = diasSinActividad - config.diasTolerancia;
  const factor = Math.exp(-config.velocidad * 0.1 * diasPenalizados);
  
  return Math.max(config.pisoMinimo, factor);
}

function getAccionPorEtapa(estado, diasSinActividad, scoreFinal) {
  if (estado === 'negociacion') {
    if (diasSinActividad > 10) return 'Llamar HOY. La negociación lleva mucho tiempo pausada.';
    return 'Da seguimiento: notaría, banco o documentos pendientes.';
  }
  if (estado === 'visita') {
    if (diasSinActividad > 3) return 'Llamar ahora. El follow-up post-visita es crítico.';
    return 'Envía comparativa o propiedades similares para presionar decisión.';
  }
  if (estado === 'contactado') {
    if (scoreFinal >= 50) return 'Agendar visita HOY. Hay señales de intención real.';
    return 'Califica presupuesto y urgencia antes de invertir más tiempo.';
  }
  if (diasSinActividad > 1) return '⚡ Contacta pronto. Prospectos frescos convierten 5x más.';
  return 'Primer contacto: llama y califica necesidad antes de enviar opciones.';
}

export function calcularScore(lead) {
  const estadoFormateado = (lead.estado || 'nuevo').toLowerCase().trim();
  
  if (['cerrado', 'descartado'].includes(estadoFormateado)) {
    return {
      score: 0, base: 0, multiplicador: 1, decayFactor: 0,
      isHot: false, isCold: false,
      etiqueta: estadoFormateado === 'cerrado' ? 'Ganado' : 'Perdido',
      razon: 'Esta operación ya está resuelta.',
      accion: 'Sin acción requerida.'
    };
  }

  const base = BASE_POR_ETAPA[estadoFormateado] || 10;
  const multiplicador = calcularMultiplicador(lead);
  
  const fechaRef = lead.ultima_actividad || lead.creado_en;
  const decayFactor = calcularDecay(estadoFormateado, fechaRef);
  
  const scoreRaw = base * multiplicador * decayFactor;
  const score = Math.round(Math.min(100, Math.max(0, scoreRaw)));

  const isHot = score >= 75;
  const isCold = score <= 20;
  
  const diasPasados = fechaRef ? Math.floor((Date.now() - new Date(fechaRef).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  
  let etiqueta = 'Inactivo ❄️';
  let razon = 'Probabilidad de conversión muy baja por tiempo de inactividad.';

  if (isHot) {
    etiqueta = 'Caliente 🔥';
    razon = 'Alta intención transaccional detectada o avance clave en embudo.';
  } else if (score >= 50) {
    etiqueta = 'Tibio';
    razon = 'Hay interés pero falta definición. Necesita seguimiento activo.';
  } else if (score >= 25) {
    etiqueta = 'Frío';
    razon = diasPasados > 7 ? `Sin actividad hace ${diasPasados} días. Riesgo de perderlo.` : 'Prospecto poco calificado aún. Nutrir antes de vender.';
  }

  return {
    score, base, multiplicador, decayFactor,
    isHot, isCold, etiqueta, razon,
    accion: getAccionPorEtapa(estadoFormateado, diasPasados, score)
  };
}
