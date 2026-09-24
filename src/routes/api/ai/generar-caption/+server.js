import { json } from '@sveltejs/kit';

// 🚀 ARQUITECTURA DE IA 2026: Cascada inyectada desde tu lógica de leads
const MODELS_CASCADE = [
  '@cf/meta/llama-3.2-3b-instruct',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/ibm-granite/granite-4.0-h-micro'
];

function getRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
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
  cleanedStr = cleanedStr.replace(/\n/g, '\\n').replace(/\r/g, '');
  
  try {
    return JSON.parse(cleanedStr);
  } catch (err) {
    throw new Error('JSON malformado devuelto por la IA.');
  }
}

// 🛡️ BLINDAJE TRANSACCIONAL DE TOKENS (Igual que en Leads)
async function reserveAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('reservar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const reservation = getRpcRow(data);
  if (error || !reservation?.reserved) return null;
  return reservation;
}

async function confirmAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('confirmar_consumo_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const confirmation = getRpcRow(data);
  return !error && confirmation?.confirmed === true;
}

async function refundAiCredit(supabase, userId, requestId) {
  const { error } = await supabase.rpc('reembolsar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  if (error) console.error('[Refund Error]', { requestId, message: error.message });
}

export async function POST({ request, locals, platform }) {
  if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });
  if (!platform?.env?.AI) return json({ error: 'Motor de IA offline.' }, { status: 503 });

  const { caracteristicas_inmueble } = await request.json();

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id, ia_creditos_disponibles')
    .eq('auth_user_id', locals.user.id)
    .single();

  if (!broker) return json({ error: 'Perfil no encontrado' }, { status: 403 });
  
  if ((broker.ia_creditos_disponibles || 0) <= 0) {
    return json({ error: 'Has alcanzado el límite de créditos IA de tu plan actual.' }, { status: 403 });
  }

  const requestId = crypto.randomUUID();
  const reservation = await reserveAiCredit(locals.supabase, locals.user.id, requestId);
  if (!reservation) return json({ error: 'No tienes créditos de IA o existe un error transaccional.' }, { status: 403 });

  let creditConfirmed = false;
  let finalContent = null;
  let errorLog = [];

  try {
    const systemPrompt = [
      'Eres un Asesor Inmobiliario Senior experto en redes sociales.',
      'Redacta una descripción atractiva (caption) para publicar una propiedad en Instagram.',
      'REGLAS ESTRICTAS:',
      '1. Tono cálido, servicial y persuasivo.',
      '2. Máximo 150 palabras. Muy directo.',
      '3. Usa máximo 3 emojis.',
      '4. Incluye 3 hashtags relevantes al final.',
      '5. Responde EXCLUSIVAMENTE con un objeto JSON válido. Sin texto adicional ni markdown.',
      'FORMATO REQUERIDO:',
      '{',
      '  "caption": "Texto exacto listo para publicar en Instagram."',
      '}'
    ].join(' ');

    const userPrompt = `Redacta un post para la siguiente propiedad: ${caracteristicas_inmueble}`;

    for (const modelId of MODELS_CASCADE) {
      try {
        const result = await platform.env.AI.run(modelId, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7 
        });

        const parsed = parseAiResponse(result);
        const textoCaption = parsed.caption || parsed.Caption || parsed.texto || parsed.mensaje;
        if (!textoCaption) throw new Error('Respuesta IA incompleta');
        
        finalContent = { caption: textoCaption };
        break;
      } catch (err) {
        errorLog.push(`${modelId.split('/').pop()}: ${err.message}`);
        finalContent = null;
      }
    }

    if (!finalContent) throw new Error(`Cascada agotada. Errores: ${errorLog.join(' | ')}`);

    const confirmed = await confirmAiCredit(locals.supabase, locals.user.id, requestId);
    if (!confirmed) throw new Error('Fallo al confirmar consumo de crédito IA.');
    
    creditConfirmed = true;

    return json({ 
      success: true, 
      caption: finalContent.caption,
      tokens_restantes: broker.ia_creditos_disponibles - 1 // 🛡️ FIX (Bug 4): Devuelve el saldo real descontado para sincronizar el cliente
    });

  } catch (error) {
    if (!creditConfirmed) {
      await refundAiCredit(locals.supabase, locals.user.id, requestId);
    }
    console.error('[IG Caption IA Error]', errorLog.length ? errorLog : error.message);
    return json({ error: 'El redactor de IA está temporalmente saturado. Por favor, inténtalo de nuevo.' }, { status: 502 });
  }
}
