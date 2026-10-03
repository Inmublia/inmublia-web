// src/routes/admin/nueva/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
// 🚀 V6: Importaciones del Motor SRE
import { getAiCreditStatus, reserveAiCredit, confirmAiCredit, releaseAiCredit, getAiGenerationOperation } from '$lib/server/ai-credits.js';
import { resolveEffectiveTenant } from '$lib/server/supabase-admin.js';

const PLAN_RANK = {
  basico: 0,
  pro: 1,
  elite: 2
};

const TEMPLATE_MIN_PLAN = {
  prop_basic_1: 'basico',
  prop_pro_1: 'pro',
  prop_elite_1: 'elite'
};

const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/ibm/granite-4.0-h-micro',
  '@cf/google/gemma-4-26b-a4b-it'
];

// 🚀 TONE_GUIDES ESTRICTOS (ANTI-ALUCINACIÓN)
const TONE_GUIDES = {
  profesional: 'Claro, comercial y confiable. Prioriza información concreta, distribución, características, precio y ubicación. Evita adornos innecesarios.',
  lujo: 'Sofisticado y sobrio. Destaca arquitectura, materiales y diseño únicamente cuando esos atributos estén presentes en los datos. Nunca confundas elegancia con exageración.',
  familiar: 'Cálido y práctico. Destaca distribución, espacios y funcionalidad para la vida cotidiana. No asumas que el comprador tiene hijos ni inventes características del entorno.',
  inversionista: 'Analítico y comercial. Destaca precio, características físicas, ubicación y elementos objetivos. Nunca prometas plusvalía, rentabilidad o retorno garantizado.'
};

const ALLOWED_OPERATIONS = new Set(['Venta', 'Renta']);
const ALLOWED_TYPES = new Set([
  'Casa',
  'Departamento',
  'Terreno',
  'Oficina',
  'Local',
  'Bodega',
  'Edificio',
  'Otro'
]);

const IMAGE_TYPES = {
  'image/jpeg': { extension: 'jpg', magic: 'jpeg' },
  'image/png': { extension: 'png', magic: 'png' },
  'image/webp': { extension: 'webp', magic: 'webp' }
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_GALLERY_FILES = 20;
const MAX_TOTAL_IMAGE_BYTES = 40 * 1024 * 1024;

function getPlan(value) {
  const plan = String(value || 'basico').toLowerCase().trim();
  if (plan === 'trial') return 'elite';
  return Object.hasOwn(PLAN_RANK, plan) ? plan : 'basico';
}

function normalizePlainText(value, maxLength = 100) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizeMultilineText(value, maxLength = 3000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function parseLocalizedNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  const raw = normalizePlainText(value, 50).replace(/[$\s]/g, '');
  if (!raw || !/^-?[\d.,]+$/.test(raw)) return null;

  const commaCount = (raw.match(/,/g) || []).length;
  const dotCount = (raw.match(/\./g) || []).length;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  let normalized = raw;

  if (commaCount > 0 && dotCount > 0) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (commaCount > 0) {
    const parts = raw.split(',');
    const decimalPart = parts.at(-1);

    normalized =
      parts.length > 2 || decimalPart.length === 3
        ? raw.replace(/,/g, '')
        : raw.replace(',', '.');
  } else if (dotCount > 0) {
    const parts = raw.split('.');
    const decimalPart = parts.at(-1);

    normalized =
      parts.length > 2 || decimalPart.length === 3
        ? raw.replace(/\./g, '')
        : raw;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  if (integer && !Number.isInteger(parsed)) return null;

  return parsed;
}

function parseOptionalHttpsUrl(value) {
  const raw = normalizePlainText(value, 500);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      throw new Error('Solo se permiten URLs HTTPS.');
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function isMagicValid(buffer, format) {
  const bytes = new Uint8Array(buffer);
  if (format === 'jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (format === 'png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    );
  }
  if (format === 'webp') {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    );
  }
  return false;
}

async function validateImageFile(file, label) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error(`${label} no es un archivo válido.`);
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error(`${label} debe pesar entre 1 byte y 8 MB.`);
  }

  const contentType = String(file.type || '').toLowerCase();
  const imageMetadata = IMAGE_TYPES[contentType];

  if (!imageMetadata) {
    throw new Error(`${label} debe ser JPG, PNG o WebP.`);
  }

  const buffer = await file.arrayBuffer();

  if (!isMagicValid(buffer, imageMetadata.magic)) {
    throw new Error(`${label} no coincide con el formato de imagen declarado.`);
  }

  return {
    buffer,
    contentType,
    extension: imageMetadata.extension,
    size: file.size
  };
}

function parseAiResponse(result) {
  const raw = result?.response ?? result;

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }

  if (typeof raw !== 'string') {
    throw new Error('La IA no devolvió texto JSON.');
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('No se detectó un objeto JSON en la respuesta.');
  }

  const cleaned = raw.substring(firstBrace, lastBrace + 1).replace(/\n|\r/g, ' ');
  return JSON.parse(cleaned);
}

function validateAiContent(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Respuesta IA inválida.');
  }

  const titulo = normalizePlainText(payload.titulo, 100);
  const descripcion = normalizeMultilineText(payload.descripcion, 1800);
  const whatsapp = normalizeMultilineText(
    payload.whatsapp ?? payload.WhatsApp ?? payload.Whatsapp,
    500
  );

  if (!titulo || !descripcion || !whatsapp) {
    throw new Error('La IA no devolvió todos los campos requeridos.');
  }

  return { titulo, descripcion, whatsapp };
}

// 🚀 QUALITY GUARD EDITORIAL: Previene alucinaciones y tono spam
function validateGeneratedCopy(content) {
  const texto = `${content.titulo} ${content.descripcion} ${content.whatsapp}`.toLowerCase();

  const forbiddenPatterns = [
    'la mejor',
    'única oportunidad',
    'plusvalía garantizada',
    'rentabilidad garantizada',
    'inversión garantizada',
    'de tus sueños',
    'inigualable',
    'imperdible',
    'oportunidad de oro',
    'majestuoso'
  ];

  const prohibited = forbiddenPatterns.find(p => texto.includes(p));

  if (prohibited) {
    throw new Error(`Copy rechazado (Filtro Anti-Spam): lenguaje comercial prohibido detectado -> "${prohibited}".`);
  }

  if (!content.titulo || content.titulo.split(/\s+/).length > 15) {
    throw new Error('El título generado excede las 15 palabras permitidas.');
  }

  if (content.descripcion.length < 80) {
    throw new Error('La descripción generada es demasiado corta para publicarse.');
  }

  if (content.whatsapp.length < 20 || content.whatsapp.length > 600) {
    throw new Error('La longitud del script de WhatsApp está fuera de los rangos óptimos.');
  }

  return content;
}

export const load = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(303, '/login');
  }

  try {
    // 🚀 V6: Resolución Centralizada de Tenant
    const { brokerId } = await resolveEffectiveTenant(locals, user);
    
    // Obtenemos los límites comerciales base
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('plan_suscripcion, comision_default')
      .eq('id', brokerId)
      .single();

    if (error || !broker) throw new Error('Broker data not found');

    // 🚀 V6: Consultamos Saldo al Motor Transaccional Seguro
    const status = await getAiCreditStatus(brokerId);
    if (!status.ok) throw new Error(status.error || 'Database Error');

    // Mantenemos compatibility con Svelte
    locals.effectiveBrokerId = brokerId;

    return {
      effectiveBrokerId: brokerId,
      creditos_ia: status.status === 'ineligible' ? 0 : status.credits_available,
      plan_suscripcion: getPlan(broker.plan_suscripcion),
      comision_global: Number(broker.comision_default) || 5,
      limits: null 
    };
  } catch (error) {
    console.error('[Load Nueva Propiedad Error]', error);
    // V6: Fail-Closed para métricas comerciales en caso de caída de DB
    return {
      effectiveBrokerId: null,
      creditos_ia: null, 
      error_ia: true,
      plan_suscripcion: null,
      comision_global: null,
      limits: null
    };
  }
};

export const actions = {
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;

    if (!user) {
      return fail(401, { error: 'No autorizado.' });
    }

    if (!platform?.env?.AI) {
      return fail(503, { error: 'El servicio de IA no está disponible temporalmente.' });
    }

    const formData = await request.formData();

    // 🚀 V6: Resolución de Identidad Multi-Tenant
    let tenantContext;
    try {
      tenantContext = await resolveEffectiveTenant(locals, user);
    } catch(e) { 
      return fail(404, { error: 'Perfil de Agencia no encontrado.' }); 
    }

    const ubicacion = normalizePlainText(formData.get('ubicacion'), 100);
    const tipo = normalizePlainText(formData.get('tipo'), 50);
    const operacion = normalizePlainText(formData.get('operacion'), 30);
    const tono = normalizePlainText(formData.get('tono'), 30) || 'profesional';

    const precio = parseLocalizedNumber(formData.get('precio'), {
      min: 1,
      max: 1_000_000_000
    });

    const recamaras = parseLocalizedNumber(formData.get('recamaras'), { min: 0, max: 100, integer: true });
    const banos = parseLocalizedNumber(formData.get('banos'), { min: 0, max: 100 });
    const medioBano = parseLocalizedNumber(formData.get('medio_bano'), { min: 0, max: 100 });
    const estacionamientos = parseLocalizedNumber(formData.get('estacionamientos'), { min: 0, max: 100, integer: true });
    
    const m2Terreno = parseLocalizedNumber(formData.get('m2_terreno'), { min: 0, max: 10_000_000 });
    const m2Construccion = parseLocalizedNumber(formData.get('m2_construccion'), { min: 0, max: 10_000_000 });

    const mantenimientoNum = parseLocalizedNumber(formData.get('mantenimiento'), { min: 0, max: 10_000_000 });
    const cobraMantenimiento = formData.get('cobra_mantenimiento') === 'true' || formData.get('cobra_mantenimiento') === 'on';
    
    const antiguedad = normalizePlainText(formData.get('antiguedad'), 50) || 'No especificada';

    if (!ubicacion || precio === null) {
      return fail(400, { error: 'Se requiere una ubicación y un precio válido.' });
    }

    if (!ALLOWED_TYPES.has(tipo) || !ALLOWED_OPERATIONS.has(operacion)) {
      return fail(400, { error: 'Tipo u operación de propiedad no válidos.' });
    }

    if (!Object.hasOwn(TONE_GUIDES, tono)) {
      return fail(400, { error: 'Tono de redacción no válido.' });
    }

    // 🚀 V6: Idempotency Protection 
    const rawRequestId = formData.get('request_id');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!rawRequestId || !uuidRegex.test(rawRequestId)) return fail(400, { error: 'Operación malformada. Por favor recarga la página.' });

    // 🚀 V6: Reservar Crédito
    const reservation = await reserveAiCredit(tenantContext.brokerId, rawRequestId, tenantContext.actorUserId);

    if (!reservation || !reservation.ok) {
      if (reservation?.error === 'INELIGIBLE_STATUS') return fail(403, { error: 'Tu cuenta está inactiva o con pagos pendientes.' });
      if (reservation?.error === 'REQUEST_ALREADY_FINALIZED') return fail(409, { error: 'Esta solicitud ya finalizó previamente. Modifica un campo para reintentar.', status: 'released' });
      if (reservation?.error === 'INVALID_PLAN') return fail(409, { error: 'Plan de suscripción no válido o corrupto.' });
      if (reservation?.error === 'REQUEST_ID_BROKER_MISMATCH') return fail(409, { error: 'Identificador de operación inválido.' });
      return fail(403, { error: reservation?.error === 'INSUFFICIENT_CREDITS' ? 'No tienes créditos de IA disponibles para tu plan actual.' : 'Error al reservar crédito.' });
    }

    if (reservation.status === 'in_progress') return fail(429, { error: 'La generación está en proceso.', status: 'running' });
    if (reservation.status === 'already_consumed' && reservation.result) return { ...reservation.result, creditos_ia_restantes: reservation.credits_available };

    let creditConfirmed = false;
    let finalContent = null;
    let errorLog = [];

    try {
      const propertyFacts = {
        operacion,
        tipo,
        ubicacion,
        precio_mxn: precio,
        mantenimiento_estado: cobraMantenimiento 
          ? `$${(mantenimientoNum ?? 0).toLocaleString('es-MX')} MXN` 
          : 'Sin cuota de mantenimiento',
        m2_terreno: m2Terreno ?? null,
        m2_construccion: m2Construccion ?? null,
        recamaras: recamaras ?? null,
        banos: banos ?? null,
        medios_banos: medioBano ?? null,
        estacionamientos: estacionamientos ?? null,
        antiguedad
      };

      const systemPrompt = [
        'Eres un broker inmobiliario profesional en México que está dando de alta un NUEVO INMUEBLE en su CRM operando bajo la estricta normativa PROFECO NOM-247-SE-2021.',
        'Conoces la propiedad y estás transformando los datos reales capturados en una publicación clara, objetiva y comercial.',
        'Tu trabajo NO es inventar beneficios ni escribir publicidad genérica o exagerada.',
        '━━━━━━━━━━━━━━━━━━━━',
        'PRINCIPIO FUNDAMENTAL (CERO ALUCINACIONES):',
        'Los DATOS_PROPIEDAD provistos por el usuario son la ÚNICA fuente de verdad.',
        'Si un dato no aparece explícitamente, NO existe para esta publicación. Nunca inventes: amenidades, albercas, jardines, seguridad, cercanía a escuelas/hospitales, plusvalía, disponibilidad ni características arquitectónicas.',
        '━━━━━━━━━━━━━━━━━━━━',
        'ROL, VOZ Y LEGALIDAD:',
        'Evita frases de relleno tipo "una excelente oportunidad", "la casa de tus sueños", "imperdible".',
        'NUNCA garantices plusvalía, rentabilidad ni retorno.',
        'NUNCA afirmes que la propiedad es "la mejor" o "inigualable".',
        'Usa exactamente los valores monetarios y de superficie proporcionados.',
        `TONO SELECCIONADO: ${TONE_GUIDES[tono]}. El tono nunca puede modificar los hechos, solo la forma de expresarlos.`,
        '━━━━━━━━━━━━━━━━━━━━',
        'INSTRUCCIONES DE FORMATO JSON:',
        'Devuelve ÚNICAMENTE un objeto JSON válido.',
        '{',
        '  "titulo": "Título claro de 6 a 12 palabras (Ej. Casa en venta en Zapopan, 3 recámaras y cochera)",',
        '  "descripcion": "3 párrafos cortos (100-180 palabras). Párrafo 1: Qué es, dónde y precio. Párrafo 2: Características físicas (si un valor numérico como recámaras es null, omítelo). Párrafo 3: Cierre comercial natural. Usa el carácter especial \\n para los saltos de línea, NO uses etiquetas HTML como <br>.",',
        '  "whatsapp": "Mensaje escrito en 1ra persona por el broker. Máximo 3 oraciones. Casual, directo. Elige el siguiente paso lógico (agendar visita, compartir ficha, revisar disponibilidad) según la operación. Máximo 1 emoji."',
        '}'
      ].join('\n');

      const userPrompt = `FICHA REAL DEL INMUEBLE
━━━━━━━━━━━━━━━━━━━━
IDENTIDAD
━━━━━━━━━━━━━━━━━━━━
Operación: ${propertyFacts.operacion}
Tipo: ${propertyFacts.tipo}
Ubicación: ${propertyFacts.ubicacion}

━━━━━━━━━━━━━━━━━━━━
PRECIO Y COSTOS
━━━━━━━━━━━━━━━━━━━━
Precio: $${propertyFacts.precio_mxn.toLocaleString('es-MX')} MXN
Mantenimiento: ${propertyFacts.mantenimiento_estado}

━━━━━━━━━━━━━━━━━━━━
SUPERFICIES
━━━━━━━━━━━━━━━━━━━━
Terreno: ${propertyFacts.m2_terreno ? propertyFacts.m2_terreno + ' m²' : 'No especificado'}
Construcción: ${propertyFacts.m2_construccion ? propertyFacts.m2_construccion + ' m²' : 'No especificada'}

━━━━━━━━━━━━━━━━━━━━
CARACTERÍSTICAS FÍSICAS
━━━━━━━━━━━━━━━━━━━━
Recámaras: ${propertyFacts.recamaras ?? 'No especificado'}
Baños completos: ${propertyFacts.banos ?? 'No especificado'}
Medios baños: ${propertyFacts.medios_banos ?? 'No especificado'}
Estacionamientos: ${propertyFacts.estacionamientos ?? 'No especificado'}
Antigüedad: ${propertyFacts.antiguedad}

OBJETIVO: Convierte estos datos en el JSON solicitado sin inventar NADA.`;

      for (const modelId of MODELS_CASCADE) {
        try {
          const result = await platform.env.AI.run(modelId, {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 800, 
            temperature: 0.3 
          });

          const parsedContent = validateAiContent(parseAiResponse(result));
          finalContent = validateGeneratedCopy(parsedContent);
          
          break; 
        } catch (err) {
          errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
          finalContent = null; 
        }
      }

      if (!finalContent) {
        throw new Error(`Cascada IA fallida tras agotar modelos. Errores: ${errorLog.join(' | ')}`);
      }

      // 🚀 V6: Confirmación Segura de Consumo
      const consumeRes = await confirmAiCredit(tenantContext.brokerId, rawRequestId, finalContent);
      if (!consumeRes || !consumeRes.ok) throw new Error('Fallo confirmación atómica DB.');

      creditConfirmed = true;

      return {
        ...finalContent,
        creditos_ia_restantes: consumeRes.credits_available
      };

    } catch (error) {
      if (!creditConfirmed) {
        // 🚀 V6: AMBIGUITY RESOLVER (Protección en caso de Network Timeout Post-Run)
        const opState = await getAiGenerationOperation(tenantContext.brokerId, rawRequestId);
        
        if (opState.ok) {
           if (opState.status === 'completed' && opState.result) {
             // La Base de Datos sí guardó el consumo y el JSON. Lo devolvemos y cerramos el ciclo.
             return { ...opState.result, creditos_ia_restantes: opState.credits_available }; 
           } else if (opState.status === 'running') {
             // La operación está colgada. NO liberamos a ciegas.
             return fail(429, { error: 'La red está tardando. Por favor, reintenta en unos segundos.', status: 'running' });
           } else if (opState.status === 'failed') {
             // Error formal (Ej. Error de parseo). Aquí sí liberamos.
             await releaseAiCredit(tenantContext.brokerId, rawRequestId, 'AI_TIMEOUT_OR_PARSE_ERROR');
             return fail(500, { error: `La Inteligencia Artificial falló al procesar los datos. Tu crédito fue liberado.`, status: 'released' });
           }
        }
        
        // ESTADO 100% UNKNOWN (Supabase no respondió)
        // No hacemos Release.
        return fail(502, { 
            error: `No pudimos confirmar el estado de la generación debido a inestabilidad de red. Tu operación quedó protegida, reintenta para verificar el estado.`, 
            status: 'unknown' 
        });
      }

      console.error('[AI Generation Error]', { requestId: rawRequestId, message: error instanceof Error ? error.message : 'Error desconocido' });

      return fail(502, {
        error: `Error al generar: ${error instanceof Error ? error.message : 'Intenta nuevamente.'}`
      });
    }
  },

  crear: async ({ request, locals, platform }) => {
    // La función crear() permanece exactamente INTACTA
    const user = locals.user;

    if (!user) {
      throw redirect(303, '/login');
    }

    if (!platform?.env?.INMUBLIA_BUCKET) {
      return fail(503, { error: 'El almacenamiento de imágenes no está disponible.' });
    }

    const formData = await request.formData();

    const titulo = normalizePlainText(formData.get('titulo'), 120);
    const descripcion = normalizeMultilineText(formData.get('descripcion'), 3000);
    const ubicacion = normalizePlainText(formData.get('ubicacion'), 150);
    const operacion = normalizePlainText(formData.get('operacion'), 30);
    const tipo = normalizePlainText(formData.get('tipo'), 50);
    const antiguedad = normalizePlainText(formData.get('antiguedad'), 50) || 'No especificada';
    const templateId = normalizePlainText(formData.get('template_id'), 50) || 'prop_basic_1';

    const precio = parseLocalizedNumber(formData.get('precio'), {
      min: 1,
      max: 1_000_000_000
    });

    const comision = parseLocalizedNumber(formData.get('comision'), {
      min: 0,
      max: 100
    });

    const m2Terreno = parseLocalizedNumber(formData.get('m2_terreno'), {
      min: 0,
      max: 10_000_000
    });

    const m2Construccion = parseLocalizedNumber(formData.get('m2_construccion'), {
      min: 0,
      max: 10_000_000
    });

    const recamaras = parseLocalizedNumber(formData.get('recamaras'), {
      min: 0,
      max: 100,
      integer: true
    });

    const banos = parseLocalizedNumber(formData.get('banos'), {
      min: 0,
      max: 100
    });

    const medioBano = parseLocalizedNumber(formData.get('medio_bano'), {
      min: 0,
      max: 100
    });

    const estacionamientos = parseLocalizedNumber(formData.get('estacionamientos'), {
      min: 0,
      max: 100,
      integer: true
    });

    const cobraMantenimiento =
      formData.get('cobra_mantenimiento') === 'on' ||
      formData.get('cobra_mantenimiento') === 'true';

    const mantenimiento = cobraMantenimiento
      ? parseLocalizedNumber(formData.get('mantenimiento'), {
          min: 0,
          max: 10_000_000
        })
      : 0;

    const videoUrl = parseOptionalHttpsUrl(formData.get('video_url'));
    const recorrido3dUrl = parseOptionalHttpsUrl(formData.get('recorrido_3d_url'));

    const imagen = formData.get('imagen');
    const galeria = formData
      .getAll('galeria')
      .filter((file) => file && typeof file.arrayBuffer === 'function' && file.size > 0);

    if (!titulo || !descripcion || !ubicacion || precio === null) {
      return fail(400, { error: 'Completa título, descripción, ubicación y precio válido.' });
    }

    if (!ALLOWED_TYPES.has(tipo) || !ALLOWED_OPERATIONS.has(operacion)) {
      return fail(400, { error: 'Tipo u operación de propiedad no válidos.' });
    }

    if (mantenimiento === null) {
      return fail(400, { error: 'El mantenimiento debe ser un número válido.' });
    }

    if (videoUrl === undefined || recorrido3dUrl === undefined) {
      return fail(400, { error: 'Las URLs de video y recorrido deben usar HTTPS.' });
    }

    if (!TEMPLATE_MIN_PLAN[templateId]) {
      return fail(400, { error: 'La plantilla seleccionada no existe.' });
    }

    if (!imagen || typeof imagen.arrayBuffer !== 'function') {
      return fail(400, { error: 'Debes cargar una foto de portada válida.' });
    }

    if (galeria.length > MAX_GALLERY_FILES) {
      return fail(400, {
        error: `Solo puedes subir hasta ${MAX_GALLERY_FILES} fotos adicionales.`
      });
    }

    const declaredTotalSize =
      Number(imagen.size || 0) + galeria.reduce((total, file) => total + Number(file.size || 0), 0);

    if (declaredTotalSize > MAX_TOTAL_IMAGE_BYTES) {
      return fail(400, { error: 'El total de imágenes no puede superar 40 MB.' });
    }

    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id, comision_default, plan_suscripcion, status_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) {
      return fail(403, { error: 'Perfil de agencia no encontrado.' });
    }

    const esTrial = broker.status_suscripcion === 'trial';
    const planOriginal = (broker.plan_suscripcion || 'basico').toLowerCase();
    
    const limitesInventario = { basico: 15, trial: 5, pro: 999999, elite: 999999 };
    const limiteActualProps = esTrial ? limitesInventario['trial'] : (limitesInventario[planOriginal] || 15);

    const { count: propsCount } = await locals.supabase
      .from('propiedades')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', broker.id)
      .in('estatus', ['Activa', 'Pre-Mercado']);

    if (propsCount >= limiteActualProps) {
      return fail(403, { error: 'Límite de inventario alcanzado. No puedes publicar más propiedades en tu plan actual.' });
    }

    const currentPlan = getPlan(broker.plan_suscripcion);
    const requiredPlan = TEMPLATE_MIN_PLAN[templateId];

    if (PLAN_RANK[currentPlan] < PLAN_RANK[requiredPlan]) {
      return fail(403, { error: 'Tu plan no permite usar esta plantilla.' });
    }

    const commissionFinal =
      comision === null ? Number(broker.comision_default) || 5 : comision;

    const cdnDomain = platform.env.CDN_URL || 'https://cdn.inmublia.com';

    let cdnBaseUrl;

    try {
      const parsedCdnUrl = new URL(cdnDomain);

      if (parsedCdnUrl.protocol !== 'https:') {
        throw new Error('CDN no HTTPS');
      }

      cdnBaseUrl = parsedCdnUrl.toString().replace(/\/$/, '');
    } catch {
      return fail(500, { error: 'La configuración del CDN no es válida.' });
    }

    const uploadedKeys = [];

    const uploadImage = async (file, label, suffix = '') => {
      const image = await validateImageFile(file, label);
      const key = `${broker.id}/${crypto.randomUUID()}${suffix}.${image.extension}`;

      await platform.env.INMUBLIA_BUCKET.put(key, image.buffer, {
        httpMetadata: {
          contentType: image.contentType
        }
      });

      uploadedKeys.push(key);

      return `${cdnBaseUrl}/${key}`;
    };

    try {
      const portadaUrl = await uploadImage(imagen, 'La foto de portada', '-main');
      const galeriaUrls = [];

      for (let index = 0; index < galeria.length; index += 1) {
        const url = await uploadImage(galeria[index], `La foto ${index + 1}`, `-gallery-${index}`);
        galeriaUrls.push(url);
      }

      const baseSlug =
        titulo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') || 'propiedad';

      const slug = `${baseSlug}-${crypto.randomUUID().split('-')[0]}`;

      const { error: insertError } = await locals.supabase.from('propiedades').insert({
        broker_id: broker.id,
        titulo,
        slug,
        operacion,
        tipo,
        destacada: formData.get('destacada') === 'on',
        descripcion,
        ubicacion,
        estatus: formData.get('is_oculta') === 'on' ? 'Pre-Mercado' : 'Activa',
        antiguedad,
        precio,
        comision: commissionFinal,
        m2_terreno: m2Terreno ?? 0,
        m2_construccion: m2Construccion ?? 0,
        recamaras: recamaras ?? 0,
        banos: banos ?? 0,
        medio_bano: medioBano ?? 0,
        estacionamientos: estacionamientos ?? 0,
        cobra_mantenimiento: cobraMantenimiento,
        mantenimiento,
        imagen_url: portadaUrl,
        galeria_urls: galeriaUrls,
        video_url: videoUrl,
        recorrido_3d_url: recorrido3dUrl,
        template_id: templateId
      });

      if (insertError) {
        throw new Error(`DB insert failed: ${insertError.message}`);
      }
    } catch (error) {
      await Promise.allSettled(
        uploadedKeys.map((key) => platform.env.INMUBLIA_BUCKET.delete(key))
      );

      console.error('[Crear Propiedad Error]', {
        message: error instanceof Error ? error.message : 'Error desconocido'
      });

      return fail(500, {
        error: 'No fue posible guardar la propiedad. No se conservaron imágenes parciales.'
      });
    }

    throw redirect(303, '/admin');
  }
};
