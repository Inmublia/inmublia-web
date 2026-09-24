import { json } from '@sveltejs/kit';

export async function POST({ request, locals, platform }) {
  if (!locals.user) return json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { caracteristicas_inmueble } = await request.json();

    // 1. Obtener el ID del broker y verificar sus tokens en Supabase
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id, available_tokens') 
      .eq('auth_user_id', locals.user.id)
      .single();

    if (brokerError || !broker) throw new Error('Perfil de broker no encontrado');
    if (broker.available_tokens <= 0) {
      return json({ error: 'Saldo de tokens insuficiente para usar la IA' }, { status: 403 });
    }

    // 2. Generar el texto con Cloudflare Workers AI de forma nativa
    const aiResponse = await platform.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { 
          role: 'system', 
          content: 'Eres un copywriter inmobiliario. Crea descripciones atractivas para Instagram. Usa emojis, hashtags relevantes y un tono profesional pero persuasivo. Máximo 150 palabras.' 
        },
        { 
          role: 'user', 
          content: `Redacta un post para esta propiedad: ${caracteristicas_inmueble}` 
        }
      ]
    });

    const captionGenerado = aiResponse.response;

    // 3. Descontar 1 token al broker
    const { error: updateError } = await locals.supabase
      .from('brokers')
      .update({ available_tokens: broker.available_tokens - 1 })
      .eq('id', broker.id);

    if (updateError) throw new Error('Error al actualizar el saldo de tokens en la base de datos');

    // 4. Devolver el texto y el nuevo saldo al frontend
    return json({ 
      success: true, 
      caption: captionGenerado,
      tokens_restantes: broker.available_tokens - 1
    });

  } catch (error) {
    console.error('Error en Endpoint de Cloudflare Workers AI:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
