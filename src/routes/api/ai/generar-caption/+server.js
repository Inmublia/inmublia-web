import { json } from '@sveltejs/kit';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits';

// 🚀 FIX: Cascada de modelos robustos capaces de seguir instrucciones restrictivas
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
  // 🚀 FIX: Técnica de Lista Blanca. En lugar de prohibir, restringimos el uso exclusivo a la etiqueta [DATO]
  return `Eres un redactor de anuncios inmobiliarios para ${plataforma} en México.

REGLA ABSOLUTA: Solo puedes usar información marcada con [DATO].
Cualquier dato que no esté marcado como [DATO] NO EXISTE.
Prohibido inventar: medidas, precios, amenidades, ubicaciones, características.
Si los datos son pocos, escribe un texto corto. Nunca rellenes con suposiciones.

FORMATO: Responde solo con JSON válido → {"caption": "texto listo para publicar"}
ESTILO: ${reglaPlataforma}`;
}

function formatearDatos(texto) {
  // 🚀 FIX: Convierte el texto libre en una lista estricta etiquetada
  return texto
    .split(/[,\n;]+/)
    .map(l => l.trim())
    .filter(l => l.length > 3)
    .map(l => `[DATO] ${l}`)
    .join('\n');
}

function detectarAlucinacion(caption, inputOriginal) {
  // 🚀 FIX: Guardia de hierro post-generación. Si hay un número nuevo, aborta.
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
  // 🛡️ Mantiene la recuperación de sesión para evitar errores 401
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

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!broker) return json({ error: 'Perfil no encontrado' }, { status: 403 });

  const reservation = await reserveAiCredit(locals.supabase, user.id, requestId);
  if (!reservation) {
    return json({ error: 'Sin créditos de IA disponibles.' }, { status: 403 });
  }

  let creditConfirmed = false;
  let finalContent = null;
  const attemptLog = [];

  try {
    const systemPrompt = buildSystemPrompt({ plataforma: plataformaDestino });
    const datosEtiquetados = formatearDatos(caracteristicas);
    const userPrompt = `Datos de la propiedad:\n${datosEtiquetados}\n\nRedacta el caption usando SOLO los [DATO] anteriores. Responde con JSON: {"caption": "..."}`;

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
            temperature: 0.3 // Ligera flexibilidad sintáctica, pero controlada por las barreras
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), AI_TIMEOUT_MS))
        ]);

        const parsed = parseAiResponse(result);
        const textoCaption = parsed.caption || parsed.Caption || parsed.texto;
        if (!textoCaption) throw new Error('Respuesta incompleta');

        // 🚀 FIX: Guardia anti-alucinación numérica ejecutándose
        detectarAlucinacion(textoCaption, caracteristicas);

        if (textoCaption.length < 20 || textoCaption.length > 600) {
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

    console.log(JSON.stringify({ 
      event: 'ai_caption_attempt', 
      userId: user.id, 
      requestId, 
      plataforma: plataformaDestino,
      attempts: attemptLog 
    }));

    if (!finalContent) throw new Error('Cascada agotada sin respuesta válida.');

    const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);
    if (!confirmed) throw new Error('Fallo al confirmar crédito IA.');
    creditConfirmed = true;

    const { data: saldoActual } = await locals.supabase
      .from('brokers')
      .select('ia_creditos_disponibles')
      .eq('id', broker.id)
      .single();

    return json({
      success: true,
      caption: finalContent.caption,
      tokens_restantes: saldoActual?.ia_creditos_disponibles ?? 0
    });

  } catch (error) {
    if (!creditConfirmed) await refundAiCredit(locals.supabase, user.id, requestId);
    console.error('[Caption IA Error]', attemptLog.length ? attemptLog : error.message);
    return json({ error: 'El motor de IA está temporalmente saturado o no pudo procesar los datos con seguridad. Inténtalo de nuevo.' }, { status: 502 });
  }
}
