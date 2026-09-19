// src/lib/scoring.js

// 1. RECALIBRACIÓN DE BASES (El máximo teórico ahora sí es 100)
const BASE_POR_ETAPA = {
  'cerrado':         0,
  'descartado':      0,
  'negociacion':    50, // Hot posible: 50 * 2.0 = 100
  'visita':         40, // Hot posible: 40 * 2.0 = 80
  'contactado':     38, // Hot posible: 38 * 2.0 = 76
  'nuevo':          10  // Nunca Hot (máx 20), es intencional
};

// 5. NORMALIZACIÓN DE DIACRÍTICOS (Búsqueda a prueba de errores humanos)
function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); 
}

function calcularMultiplicador(lead) {
  // 2. PROGRAMACIÓN DEFENSIVA (Evitar TypeError si contenido es null)
  const notas = (lead.lead_notas || [])
    .map(n => n?.contenido ?? '')
    .filter(Boolean)
    .join(' ');
    
  const textoBruto = [lead.mensaje_inicial || '', lead.nombre || '', lead.origen || '', notas].join(' ');
  const textoCompleto = normalizar(textoBruto);

  let factor = 1.0;
  let señales = [];

  const tieneContacto = !!(lead.telefono && lead.correo);
  if (tieneContacto) { factor += 0.20; señales.push({ nombre: 'Contacto completo', peso: 0.20, detectada: true }); }
  
  const tienePropiedad = !!lead.propiedad_id;
  if (tienePropiedad) { factor += 0.25; señales.push({ nombre: 'Propiedad específica', peso: 0.25, detectada: true }); }
  
  const origen = normalizar(lead.origen || '');
  const fuenteCaliente = ['whatsapp', 'recomendacion', 'referido', 'llamada'].some(f => origen.includes(f));
  if (fuenteCaliente) { factor += 0.20; señales.push({ nombre: 'Fuente de calidad', peso: 0.20, detectada: true }); }

  // Expresiones regulares sin acentos por la normalización previa
  const patronesPositivos = [
    /\b(quiero|quisiera|interesa|necesito|buscamos?)\b.{0,30}\b(cita|visita|ver|apartar)\b/,
    /\b(dinero|efectivo|contado|pago de contado)\b/,
    /\b(credito|hipoteca|infonavit|fovissste)\b.{0,20}\b(aprobad[oa]|listo|tengo)\b/,
    /\b(urgente|antes posible|mudanza)\b/,
    /\b(ya decidi|estamos decididos?|lo queremos?|lo tomamos?)\b/
  ];
  
  const patronesNeutralizadores = [
    /\b(cancelo|cancelar|no pudo|no puede)\b.{0,20}\b(cita|visita)\b/,
    /\b(negaron|rechazaron|no aprobaron)\b.{0,20}\b(credito|prestamo)\b/
  ];

  const hayPositivo = patronesPositivos.some(p => p.test(textoCompleto));
  const hayNeutralizador = patronesNeutralizadores.some(p => p.test(textoCompleto));

  if (hayPositivo && !hayNeutralizador) {
    factor += 0.30;
    señales.push({ nombre: 'Intención transaccional', peso: 0.30, detectada: true });
  }

  const notasRecurrentes = (lead.lead_notas || []).length >= 2;
  if (notasRecurrentes) { factor += 0.15; señales.push({ nombre: 'Volvió a contactar', peso: 0.15, detectada: true }); }

  const señalesNegativas = ['todavia no', 'aun no', 'despues', 'mas adelante', 'cancelo', 'negaron', 'pensandolo', 'viendo opciones'].some(k => textoCompleto.includes(k));
  if (señalesNegativas) { 
    factor -= 0.25; 
    señales.push({ nombre: 'Señales de bloqueo', peso: -0.25, detectada: true }); 
  }

  return {
    factor: Math.max(0.5, Math.min(2.0, factor)),
    señales
  };
}

const DECAY_POR_ETAPA = {
  'negociacion': { diasTolerancia: 15, velocidad: 0.8, pisoMinimo: 0.4 },
  'visita':      { diasTolerancia: 5,  velocidad: 1.5, pisoMinimo: 0.2 },
  'contactado':  { diasTolerancia: 3,  velocidad: 2.0, pisoMinimo: 0.1 },
  'nuevo':       { diasTolerancia: 1,  velocidad: 3.0, pisoMinimo: 0.0 }
};

function calcularDecay(estado, diasSinActividad) {
  const config = DECAY_POR_ETAPA[estado] || DECAY_POR_ETAPA['nuevo'];
  
  if (diasSinActividad <= config.diasTolerancia) return 1.0;

  const diasPenalizados = diasSinActividad - config.diasTolerancia;
  const factor = Math.exp(-config.velocidad * 0.1 * diasPenalizados);
  
  return Math.max(config.pisoMinimo, factor);
}

// 4. ACCIONES CONSISTENTES (Voz imperativa y emojis estandarizados)
const ACCIONES = {
  negociacion: {
    urgente: '📞 Llama hoy — la negociación lleva demasiado tiempo sin avance.',
    normal:  '📋 Da seguimiento al proceso: banco, notaría o documentos pendientes.'
  },
  visita: {
    urgente: '📞 Llama ahora — el seguimiento post-visita es crítico en las primeras 48h.',
    normal:  '📎 Envía comparativa de propiedades similares para reforzar su decisión.'
  },
  contactado: {
    caliente: '🗓️ Agenda la visita hoy — hay señales de intención real.',
    normal:   '🔍 Califica presupuesto y urgencia antes de invertir más tiempo.'
  },
  nuevo: {
    urgente: '⚡ Contacta en próximas horas — los leads frescos convierten 5x más.',
    normal:  '📞 Primer contacto: llama y califica antes de enviar propiedades.'
  }
};

function getAccionPorEtapa(estado, diasSinActividad, isHot) {
  const cat = ACCIONES[estado] || ACCIONES['nuevo'];
  
  if (estado === 'negociacion') return diasSinActividad > 10 ? cat.urgente : cat.normal;
  if (estado === 'visita') return diasSinActividad > 3 ? cat.urgente : cat.normal;
  if (estado === 'contactado') return isHot ? cat.caliente : cat.normal;
  return diasSinActividad > 1 ? cat.urgente : cat.normal;
}

export function calcularScore(lead) {
  const estadoFormateado = (lead.estado || 'nuevo').toLowerCase().trim();
  
  if (['cerrado', 'descartado'].includes(estadoFormateado)) {
    return {
      score: 0, base: 0, multiplicador: 1, decayFactor: 0,
      isHot: false, isCold: false,
      etiqueta: estadoFormateado === 'cerrado' ? 'Ganado' : 'Perdido',
      razon: 'Esta operación ya está resuelta.',
      accion: 'Sin acción requerida.',
      señales: [],
      diasSinActividad: 0
    };
  }

  // 3. TIEMPO DE ACTIVIDAD REAL (Distinguir creado_en de la última interacción)
  const fechaCreacion = lead.creado_en ? new Date(lead.creado_en).getTime() : Date.now();
  const fechaActividad = lead.ultima_actividad ? new Date(lead.ultima_actividad).getTime() : null;
  
  const hayActividadReal = fechaActividad && Math.abs(fechaActividad - fechaCreacion) > 60000;
  const fechaRef = hayActividadReal ? fechaActividad : fechaCreacion;
  const diasPasados = Math.max(0, Math.floor((Date.now() - fechaRef) / (1000 * 60 * 60 * 24)));

  const base = BASE_POR_ETAPA[estadoFormateado] || 10;
  const { factor: multiplicador, señales } = calcularMultiplicador(lead);
  const decayFactor = calcularDecay(estadoFormateado, diasPasados);
  
  const scoreRaw = base * multiplicador * decayFactor;
  const score = Math.round(Math.min(100, Math.max(0, scoreRaw)));

  const isHot = score >= 75;
  const isCold = score <= 20;
  
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
    accion: getAccionPorEtapa(estadoFormateado, diasPasados, isHot),
    señales, // 6. Breakdown ahora disponible
    diasSinActividad: diasPasados
  };
}
