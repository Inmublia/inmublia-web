// src/routes/admin/nueva/+page.server.js
import { redirect, fail } from '@sveltejs/kit';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits.js';

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

// 🚀 CASCADA DE MODELOS DEFINIDA POR EL USUARIO
const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/ibm/granite-4.0-h-micro',
  '@cf/google/gemma-4-26b-a4b-it'
];

// 🚀 MEJORA DE PROMPT: TONE_GUIDES ESTRICTOS (ANTI-MULTAS NOM-247)
const TONE_GUIDES = {
  lujo: 'Exclusivo y sobrio. Resalta estatus y diseño arquitectónico usando un lenguaje premium. PROHIBIDO usar adjetivos exagerados como "majestuoso", "sueño" o "inigualable".',
  familiar: 'Cálido y seguro. Enfocado en la comodidad, la convivencia y la tranquilidad del entorno para la familia.',
  inversionista: 'Analítico y profesional. Enfocado en la ubicación estratégica y funcionalidad. PROHIBIDO garantizar plusvalía, usar la palabra "garantizado" o hacer promesas financieras.'
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
  // El trial tiene permisos equivalentes a elite en plantillas
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

// ⚠️ CERO MODIFICACIONES AQUÍ: LÓGICA ORIGINAL RESTAURADA
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

export const load = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(303, '/login');
  }

  try {
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('ia_creditos_disponibles, plan_suscripcion, comision_default, status_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !broker) {
      return {
        creditos_ia: 0,
        plan_suscripcion: 'basico',
        comision_global: 5,
        limits: null // Pasado por el layout
      };
    }

    // 🚀 LÓGICA DE CRÉDITOS IA (Incluyendo el Trial de 15 créditos)
    let creditosReales = Math.max(0, Number(broker.ia_creditos_disponibles) || 0);

    return {
      creditos_ia: creditosReales,
      plan_suscripcion: getPlan(broker.plan_suscripcion),
      comision_global: Number(broker.comision_default) || 5
    };
  } catch (error) {
    console.error('[Load Nueva Propiedad Error]', error);

    return {
      creditos_ia: 0,
      plan_suscripcion: 'basico',
      comision_global: 5
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

    const ubicacion = normalizePlainText(formData.get('ubicacion'), 100);
    const tipo = normalizePlainText(formData.get('tipo'), 50);
    const operacion = normalizePlainText(formData.get('operacion'), 30);
    const tono = normalizePlainText(formData.get('tono'), 30) || 'lujo';

    const precio = parseLocalizedNumber(formData.get('precio'), {
      min: 1,
      max: 1_000_000_000
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

    const mantenimiento = parseLocalizedNumber(formData.get('mantenimiento'), {
      min: 0,
      max: 10_000_000
    });

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

    const requestId = crypto.randomUUID();

    // 🛡️ C1: Confiamos el bloqueo atómico exclusivamente a la RPC sin SELECT previo
    const reservation = await reserveAiCredit(locals.supabase, user.id, requestId);

    if (!reservation) {
      return fail(403, { error: 'No tienes créditos de IA disponibles o petición duplicada.' });
    }

    let creditConfirmed = false;
    let finalContent = null;
    let errorLog = [];

    try {
      const propertyFacts = {
        operacion,
        tipo,
        ubicacion,
        precio_mxn: precio,
        mantenimiento_mxn: mantenimiento ?? 0,
        recamaras: recamaras ?? 0,
        banos: banos ?? 0,
        medios_banos: medioBano ?? 0,
        estacionamientos: estacionamientos ?? 0,
        antiguedad
      };

      // 🚀 MEJORA DE PROMPT: REGLAS ESTRICTAS DE ANTI-ALUCINACIÓN Y COMPATIBILIDAD CON TU PARSEADOR
      const systemPrompt = [
        'Eres un Copywriter Inmobiliario Certificado operando en México bajo la normativa PROFECO NOM-247-SE-2021.',
        'REGLA 1 (CERO ALUCINACIONES): Usa EXCLUSIVAMENTE los datos proporcionados. Si una amenidad, característica, espacio o métrica no aparece explícitamente en DATOS_PROPIEDAD, ASUME QUE NO EXISTE. No inventes albercas, jardines, seguridad ni cercanía a puntos de interés.',
        'REGLA 2 (LEGALIDAD NOM-247): ESTRICTAMENTE PROHIBIDO usar superlativos engañosos (ej. "el mejor", "único", "inigualable") y hacer promesas financieras o subjetivas (ej. "inversión garantizada", "plusvalía segura", "oportunidad de oro").',
        `REGLA 3 (TONO): ${TONE_GUIDES[tono]}`,
        'REGLA 4 (DATOS NUMÉRICOS): Si el valor de recamaras, banos, medios_banos o estacionamientos es 0, OMÍTELOS POR COMPLETO de la redacción. Si mantenimiento_mxn es 0, redacta textualmente "sin cuota de mantenimiento".',
        'REGLA 5 (FORMATO DE RESPUESTA): Devuelve ÚNICA Y EXCLUSIVAMENTE un objeto JSON válido. No uses bloques Markdown como ```json. Empieza directamente con { y termina con }.',
        'ESTRUCTURA DEL JSON REQUERIDA:',
        '{',
        '  "titulo": "Título descriptivo atractivo de máximo 10 palabras. NO uses comillas dobles internas.",',
        '  "descripcion": "3 párrafos fluidos y descriptivos. IMPORTANTE: Para separar los párrafos, usa estrictamente la etiqueta HTML <br><br> (NO uses caracteres de escape como \\n). Enfócate en la funcionalidad real de los espacios dados.",',
        '  "whatsapp": "Mensaje ultracorto (máximo 2 oraciones) para WhatsApp. Casual y directo. Cierra con una pregunta para agendar visita. Máximo 1 emoji."',
        '}'
      ].join(' ');

      // 🚀 MEJORA DE PROMPT: INPUT ESTRUCTURADO COMO LISTADO
      const userPrompt = `DATOS_PROPIEDAD:
- Operación: ${propertyFacts.operacion}
- Tipo: ${propertyFacts.tipo}
- Ubicación: ${propertyFacts.ubicacion}
- Precio: $${propertyFacts.precio_mxn.toLocaleString('es-MX')} MXN
- Mantenimiento: ${propertyFacts.mantenimiento_mxn > 0 ? '$' + propertyFacts.mantenimiento_mxn.toLocaleString('es-MX') + ' MXN' : 'Sin cuota'}
- Recámaras: ${propertyFacts.recamaras}
- Baños Completos: ${propertyFacts.banos}
- Medios Baños: ${propertyFacts.medios_banos}
- Estacionamientos: ${propertyFacts.estacionamientos}
- Antigüedad: ${propertyFacts.antiguedad}`;

      for (const modelId of MODELS_CASCADE) {
        try {
          const result = await platform.env.AI.run(modelId, {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 1200,
            temperature: 0.5
          });

          finalContent = validateAiContent(parseAiResponse(result));
          break; 
        } catch (err) {
          errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
          finalContent = null; 
        }
      }

      if (!finalContent) {
        throw new Error(`Cascada agotada. Errores: ${errorLog.join(' | ')}`);
      }

      const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);

      if (!confirmed) {
        throw new Error('No fue posible confirmar el consumo del crédito.');
      }

      creditConfirmed = true;

      // 🛡️ C2: Consulta del saldo real tras la confirmación atómica
      const { data: brokerActualizado } = await locals.supabase
        .from('brokers')
        .select('ia_creditos_disponibles')
        .eq('auth_user_id', user.id)
        .single();

      return {
        ...finalContent,
        creditos_ia_restantes: Math.max(0, Number(brokerActualizado?.ia_creditos_disponibles) || 0)
      };
    } catch (error) {
      if (!creditConfirmed) {
        await refundAiCredit(locals.supabase, user.id, requestId);
      }

      console.error('[AI Generation Error]', {
        requestId,
        message: error instanceof Error ? error.message : 'Error desconocido'
      });

      return fail(502, {
        error: 'No fue posible generar el contenido. Tu crédito fue reembolsado.'
      });
    }
  },

  crear: async ({ request, locals, platform }) => {
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

    // 🚀 FIX PAYWALL INVENTARIO: Validación dura en Servidor (Evita hackers)
    const esTrial = broker.status_suscripcion === 'trial';
    const planOriginal = (broker.plan_suscripcion || 'basico').toLowerCase();
    
    const limitesInventario = { basico: 15, trial: 5, pro: 999999, elite: 999999 };
    const limiteActualProps = esTrial ? limitesInventario['trial'] : (limitesInventario[planOriginal] || 15);

    // Contar rápido antes de insertar
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

    const cdnDomain = platform.env.CDN_URL || '[https://cdn.inmublia.com](https://cdn.inmublia.com)';

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
