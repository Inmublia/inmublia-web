import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';

export async function POST({ request, locals }) {
  if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { caracteristicas_inmueble } = await request.json();

    // 1. Obtener el ID del broker y verificar sus tokens disponibles
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id, available_tokens') // Asegúrate de tener esta columna en tu BD
      .eq('auth_user_id', locals.user.id)
      .single();

    if (brokerError || !broker) throw new Error('Perfil de broker no encontrado');
    if (broker.available_tokens <= 0) {
      return json({ error: 'Saldo de tokens insuficiente para usar la IA' }, { status: 403 });
    }

    // 2. Generar el texto con la IA
    // Si usas OpenAI:
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${privateEnv.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modelo rápido y económico
        messages: [
          { 
            role: 'system', 
            content: 'Eres un experto copywriter inmobiliario. Crea descripciones atractivas para Instagram. Usa emojis, hashtags relevantes y un tono profesional pero persuasivo. Máximo 150 palabras.' 
          },
          { 
            role: 'user', 
            content: `Redacta un post para esta propiedad: ${caracteristicas_inmueble}` 
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) throw new Error('Error al generar el texto con IA');

    const captionGenerado = aiData.choices[0].message.content;

    // 3. Descontar 1 token al broker en Supabase
    const { error: updateError } = await locals.supabase
      .from('brokers')
      .update({ available_tokens: broker.available_tokens - 1 })
      .eq('id', broker.id);

    if (updateError) throw new Error('Error al actualizar el saldo de tokens');

    // 4. Devolver el texto y el nuevo saldo al frontend
    return json({ 
      success: true, 
      caption: captionGenerado,
      tokens_restantes: broker.available_tokens - 1
    });

  } catch (error) {
    console.error('Error en Endpoint IA:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
