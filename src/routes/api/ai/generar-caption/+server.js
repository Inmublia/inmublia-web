import { json } from '@sveltejs/kit';
import { reserveAiCredit, confirmAiCredit, refundAiCredit } from '$lib/server/ai-credits';

// 🚀 FIX: Qwen 30B (Modelo masivo y lógico) pasa al frente como prioridad absoluta.
const MODELS_CASCADE = [
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

const AI_TIMEOUT_MS = 8000; 

const PLATFORM_RULES = {
  instagram: 'Máximo 150 palabras. 3 emojis. 3 hashtags relevantes al final.',
  facebook: 'Máximo 250 palabras. Tono más descriptivo y conversacional. 1-2 emojis. Sin hashtags.',
  tiktok: 'Máximo 80 palabras. Tono muy energético y de gancho rápido. 5 hashtags trending.'
};

function buildSystemPrompt({ idioma = 'español', tono = 'cálido y servicial', plataforma = 'instagram' } = {}) {
  const reglaPlataforma = PLATFORM_RULES[plataforma] || PLATFORM_RULES.instagram;
  
  // 🚀 FIX: Prompt de Contención Nivel PROFECO
  return `Eres un Copywriter Inmobiliario Senior en México, estrictamente regulado por PROFECO.
Tu ÚNICO trabajo es redactar un caption atractivo para ${plataforma} en ${idioma} basándote EXCLUSIVAMENTE en los datos proporcionados por el usuario.

⚠️ REGLA DE ORO (CERO ALUCINACIONES - RIESGO LEGAL):
1. TIENES PROHIBIDO inventar medidas (ej. 2.8 x 6.6 m).
2. TIENES PROHIBIDO inventar amenidades (ej. gimnasio, alberca, jardín) que no se mencionen.
3. TIENES PROHIBIDO inventar precios, ubicaciones o características arquitectónicas.
4. Si la información es breve, redacta un texto breve y misterioso. NO rellenes con mentiras.

ESTILO: Tono ${tono}. ${reglaPlataforma}
FORMATO: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura: {"caption": "Texto exacto listo para publicar"}`;
}

function parseAiResponse(result) {
  const raw = result?.response ?? result;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') throw new Error('La IA no devolvió formato de texto.');

  let cleanedStr = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const firstBrace = cleanedStr.indexOf('{');
  const lastBrace = cleanedStr.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) {
    return { caption: cleanedStr.replace(/^["']|["']$/g, '').trim() };
  }
  
  cleanedStr = cleanedStr.substring(firstBrace, lastBrace + 1);
  
  try {
    return JSON.parse(cleanedStr);
  } catch {
    const match = cleanedStr.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
    if (match?.[1]) return { caption: match[1].replace(/\\n/g, '\n') };
    throw new Error('No se pudo extraer el caption de la respuesta JSON.');
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
    return json({ error: 'Descripción de características demasiado corta.' }, { status: 400 });
  }

  const plataformaDestino = body.plataforma || 'instagram';
  const requestId = body.requestId || crypto.randomUUID();

  if (platform?.env?.KV) {
    const rateLimitKey = `rl:caption:${user.id}`;
    const requests = parseInt(await platform.env.KV.get(rateLimitKey) ?? '0');
    if (requests >= 10) {
      return json({ error: 'Demasiadas solicitudes. Espera un momento.' }, { status: 429 });
    }
    await platform.env.KV.put(rateLimitKey, String(requests + 1), { expirationTtl: 60 });
  }

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!broker) return json({ error: 'Perfil no encontrado' }, { status: 403 });
  
  const reservation = await reserveAiCredit(locals.supabase, user.id, requestId);
  if (!reservation) {
    return json({ error: 'No tienes créditos de IA disponibles o existe un error transaccional.' }, { status: 403 });
  }

  let creditConfirmed = false;
  let finalContent = null;
  const attemptLog = [];

  try {
    const systemPrompt = buildSystemPrompt({ plataforma: plataformaDestino });
    
    // 🚀 FIX: Enjaulamos las características en etiquetas XML falsas para que el modelo identifique los límites de la verdad
    const userPrompt = `DATOS REALES DE LA PROPIEDAD:\n<datos>\n${caracteristicas}\n</datos>\n\nRedacta el caption usando ÚNICAMENTE la información dentro de las etiquetas <datos>.`;

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
            temperature: 0.2 // 🚀 FIX: Temperatura congelada. Cero creatividad, 100% analítico.
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout superado`)), AI_TIMEOUT_MS))
        ]);

        const parsed = parseAiResponse(result);
        const textoCaption = parsed.caption || parsed.Caption || parsed.texto || parsed.mensaje;
        if (!textoCaption) throw new Error('Respuesta IA incompleta');
        
        finalContent = { caption: textoCaption };
        attemptLog.push({ model: modelId, status: 'ok', ms: Date.now() - t0 });
        break;
      } catch (err) {
        attemptLog.push({ model: modelId, status: 'error', ms: Date.now() - t0, error: err.message });
        finalContent = null;
      }
    }

    console.log(JSON.stringify({ event: 'ai_caption_attempt', userId: user.id, requestId, attempts: attemptLog }));

    if (!finalContent) throw new Error('Cascada de modelos agotada sin respuesta válida.');

    const confirmed = await confirmAiCredit(locals.supabase, user.id, requestId);
    if (!confirmed) throw new Error('Fallo al confirmar consumo de crédito IA.');
    
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
    if (!creditConfirmed) {
      await refundAiCredit(locals.supabase, user.id, requestId);
    }
    console.error('[IG Caption IA Error]', attemptLog.length ? attemptLog : error.message);
    return json({ error: 'El motor de IA está temporalmente saturado. Por favor, inténtalo de nuevo.' }, { status: 502 });
  }
}
