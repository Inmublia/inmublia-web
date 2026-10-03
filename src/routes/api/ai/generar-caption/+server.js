import { json } from '@sveltejs/kit';
// 🚀 V6: Importaciones del Motor SRE
import { reserveAiCredit, confirmAiCredit, releaseAiCredit, getAiGenerationOperation } from '$lib/server/ai-credits.js';
import { resolveEffectiveTenant } from '$lib/server/supabase-admin.js';

const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.1-8b-instruct-fp8',
  '@cf/mistralai/mistral-small-3.1-24b-instruct'
];

const AI_TIMEOUT_MS = 8000;

const PLATFORM_RULES = {
  instagram: 'Máximo 150 palabras. Usa 2-3 emojis naturales. Termina con 3 hashtags relevantes.',
  facebook:  'Máximo 250 palabras. Tono descriptivo y cercano. Máximo 2 emojis. Sin hashtags.',
  tiktok:    'Máximo 80 palabras. Gancho en la primera línea. 5 hashtags al final.'
};

function buildSystemPrompt({ plataforma = 'instagram' } = {}) {
  const reglaPlataforma = PLATFORM_RULES[plataforma] || PLATFORM_RULES.instagram;
  
  return `Eres un redactor inmobiliario profesional para ${plataforma} en México.

INSTRUCCIONES VITALES DE REDACCIÓN:
1. Basa tu texto ÚNICA Y EXCLUSIVAMENTE en la información proporcionada (etiquetada como [DATO]).
​2. No agregues medidas, precios, ubicaciones, amenidades ni características arquitectónicas que no estén explícitamente en la lista.
3. Si la lista de datos es breve, redacta un texto corto, elegante y misterioso.

FORMATO ESTRICTO:
Debes responder obligatoriamente con un único objeto JSON válido. No agregues texto fuera del JSON.
Ejemplo de salida: {"caption": "Tu redacción aquí"}

ESTILO: ${reglaPlataforma}`;
}

function formatearDatos(texto) {
  return texto
    .split(/[,\n;]+/)
    .map(l => l.trim())
    .filter(l => l.length > 3)
    .map(l => `[DATO] ${l}`)
    .join('\n');
}

function detectarRechazo(caption) {
  const lower = caption.toLowerCase();
  const rechazos = [
    'lo siento', 'no puedo', 'no puedo cumplir', 'as an ai', 
    'inteligencia artificial', 'no tengo permitido', 'no estoy autorizado'
  ];
  if (rechazos.some(r => lower.includes(r))) {
    throw new Error('El modelo rechazó la solicitud por filtros de seguridad internos.');
  }
}

function detectarAlucinacion(caption, inputOriginal) {
  const numerosCaption = caption.match(/\d+[\.,]?\d*/g) || [];
  const numerosInput = new Set(inputOriginal.match(/\d+[\.,]?\d*/g) || []);
  const inventados = numerosCaption.filter(n => !numerosInput.has(n));
  if (inventados.length > 0) {
    throw new Error(`Números no presentes en el input: ${inventados.join(', ')}`);
  }
}

function parseAiResponse(result) {
  const raw = result?.response ?? result;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') throw new Error('La IA no devolvió texto.');

  let str = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const first = str.indexOf('{');
  const last = str.lastIndexOf('}');

  if (first === -1 || last === -1) {
    return { caption: str.replace(/^["']|["']$/g, '').trim() };
  }

  str = str.substring(first, last + 1);
  try {
    return JSON.parse(str);
  } catch {
    const match = str.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (match?.[1]) return { caption: match[1].replace(/\\n/g, '\n') };
    throw new Error('No se pudo extraer el caption del JSON.');
  }
}

export async function POST({ request, locals, platform }) {
  let user = locals.user;
  if (!user && locals.supabase) {
    const { data } = await locals.supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) return json({ error: 'No autorizado' }, { status: 401 });
  if (!platform?.env?.AI) return json({ error: 'Motor de IA offline.' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.caracteristicas_inmueble !== 'string') {
    return json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const caracteristicas = body.caracteristicas_inmueble.trim().slice(0, 2000);
  if (caracteristicas.length < 10) {
    return json({ error: 'Descripción demasiado corta.' }, { status: 400 });
  }

  const plataformaDestino = ['instagram','facebook','tiktok'].includes(body.plataforma)
    ? body.plataforma 
    : 'instagram';

  const requestId = body.requestId || crypto.randomUUID();

  if (platform?.env?.KV) {
    const key = `rl:caption:${user.id}`;
    const hits = parseInt(await platform.env.KV.get(key) ?? '0');
    if (hits >= 10) return json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
    await platform.env.KV.put(key, String(hits + 1), { expirationTtl: 60 });
  }

  // 🚀 V6: Resolución de Identidad Multi-Tenant
  let tenantContext;
  try {
    tenantContext = await resolveEffectiveTenant(locals, user);
  } catch(e) { 
    return json({ error: 'Perfil de Agencia no encontrado.' }, { status: 404 }); 
  }

  // 🚀 V6: Reserva del Crédito con SRE Constraints
  const reservation = await reserveAiCredit(tenantContext.brokerId, requestId, tenantContext.actorUserId);
  
  if (!reservation || !reservation.ok) {
    if (reservation?.error === 'INELIGIBLE_STATUS') return json({ error: 'Tu cuenta está inactiva o con pagos pendientes.' }, { status: 403 });
    if (reservation?.error === 'REQUEST_ALREADY_FINALIZED') return json({ error: 'Esta solicitud ya finalizó previamente.' }, { status: 409 });
    if (reservation?.error === 'INVALID_PLAN') return json({ error: 'Plan de suscripción no válido o corrupto.' }, { status: 409 });
    if (reservation?.error === 'REQUEST_ID_BROKER_MISMATCH') return json({ error: 'Identificador de operación inválido.' }, { status: 409 });
    return json({ error: reservation?.error === 'INSUFFICIENT_CREDITS' ? 'No tienes créditos de IA.' : 'Error al reservar crédito.' }, { status: 409 });
  }

  if (reservation.status === 'in_progress') return json({ error: 'La generación está en proceso. Espera un momento.' }, { status: 429 });
  
  // Idempotencia absoluta
  if (reservation.status === 'already_consumed' && reservation.result) {
      return json({ success: true, caption: reservation.result.caption, tokens_restantes: reservation.credits_available });
  }

  let creditConfirmed = false;
  let finalContent = null;
  const attemptLog = [];

  try {
    const systemPrompt = buildSystemPrompt({ plataforma: plataformaDestino });
    const datosEtiquetados = formatearDatos(caracteristicas);
    const userPrompt = `Datos de la propiedad:\n${datosEtiquetados}\n\nRedacta el caption usando SOLO los [DATO] anteriores.`;

    for (const modelId of MODELS_CASCADE) {
      const t0 = Date.now();
      try {
        const result = await Promise.race([
          platform.env.AI.run(modelId, {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 350,
            temperature: 0.3
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS))
        ]);

        const parsed = parseAiResponse(result);
        const textoCaption = parsed.caption || parsed.Caption || parsed.texto;
        if (!textoCaption) throw new Error('Respuesta incompleta');

        detectarRechazo(textoCaption);
        detectarAlucinacion(textoCaption, caracteristicas);

        if (textoCaption.length < 15 || textoCaption.length > 600) {
          throw new Error(`Longitud inválida: ${textoCaption.length} chars`);
        }

        finalContent = { caption: textoCaption };
        attemptLog.push({ model: modelId, status: 'ok', ms: Date.now() - t0 });
        break;

      } catch (err) {
        attemptLog.push({ model: modelId, status: 'error', ms: Date.now() - t0, error: err.message });
        finalContent = null;
      }
    }

    if (!finalContent) throw new Error('Cascada agotada sin respuesta válida.');

    // 🚀 V6: Confirmación Atómica Segura
    const consumeRes = await confirmAiCredit(tenantContext.brokerId, requestId, finalContent);
    if (!consumeRes || !consumeRes.ok) throw new Error('Fallo confirmación atómica DB.');
    
    creditConfirmed = true;

    return json({
      success: true,
      caption: finalContent.caption,
      tokens_restantes: consumeRes.credits_available
    });

  } catch (error) {
    if (!creditConfirmed) {
      // 🚀 V6: AMBIGUITY RESOLVER (Protección en caso de Network Timeout Post-Run)
      const opState = await getAiGenerationOperation(tenantContext.brokerId, requestId);
      
      if (opState.ok) {
         if (opState.status === 'completed' && opState.result) {
           return json({ success: true, caption: opState.result.caption, tokens_restantes: opState.credits_available });
         } else if (opState.status === 'running') {
           return json({ error: 'Operación en proceso. Reintenta en unos segundos.' }, { status: 429 });
         } else if (opState.status === 'failed') {
           await releaseAiCredit(tenantContext.brokerId, requestId, 'AI_TIMEOUT_OR_PARSE_ERROR');
           return json({ error: 'La IA no pudo procesar esta solicitud. Tu crédito fue liberado.' }, { status: 500 });
         }
      }
      
      // ESTADO 100% UNKNOWN (Supabase no respondió). No liberamos a ciegas.
      return json({ error: `Fallo de red al confirmar la generación. Reintenta la operación para validar tu estado.` }, { status: 502 });
    }
    
    console.error('[Caption IA Error]', attemptLog.length ? attemptLog : error.message);
    return json({ error: 'Error interno de servidor.' }, { status: 500 });
  }
}
