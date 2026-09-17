// src/routes/api/chat/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, locals, platform }) {
  // 🚀 FIX: Consultamos la sesión directamente a Supabase para evitar el salto del hook
  const { data: { user } } = await locals.supabase.auth.getUser();
  
  if (!user) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const { mensaje } = await request.json();
  
  if (!mensaje) {
    return json({ error: 'Mensaje vacío' }, { status: 400 });
  }
  
  if (!platform?.env?.AI) {
    return json({ error: 'Servicio AI no conectado' }, { status: 500 });
  }

  try {
    // 1. Convertir la pregunta del usuario en un vector
    const { data: queryEmbeddings } = await platform.env.AI.run('@cf/baai/bge-m3', {
      text: [mensaje]
    });
    const queryVector = queryEmbeddings[0];

    // 2. Buscar en Supabase el contexto que más se parezca (RAG)
    const { data: contextoData, error: rpcError } = await locals.supabase.rpc('match_soporte_glosario', {
      query_embedding: queryVector,
      match_threshold: 0.5, // Similitud mínima del 50%
      match_count: 3        // Traer máximo 3 reglas relevantes
    });

    if (rpcError) throw rpcError;

    // 3. Extraer el texto de las reglas encontradas
    const contextoSupabase = contextoData && contextoData.length > 0
      ? contextoData.map(c => `- ${c.contenido}`).join('\n')
      : 'No se encontró información relevante en el manual sobre este tema.';

    // 4. Prompt Restrictivo (El muro de contención para DeepSeek)
    const systemPrompt = `Eres el Agente de Soporte Técnico Nivel 1 de Inmublia.
Eres amable, directo y sumamente profesional.

REGLA DE ORO:
Responde utilizando ÚNICAMENTE la información dentro de las etiquetas <contexto>. 
Si la respuesta NO está dentro del <contexto>, tienes PROHIBIDO inventar una solución. En ese caso, debes responder literalmente: "Esa es una excelente pregunta. Voy a escalar tu caso a nuestro equipo técnico de Nivel 2 para darte una solución precisa."

<contexto>
${contextoSupabase}
</contexto>`;

    // 5. Ejecutar DeepSeek
    const result = await platform.env.AI.run('@cf/deepseek-ai/deepseek-r1-distill-qwen-7b', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    const respuestaTexto = typeof result === 'string' ? result : (result.response || 'Sin respuesta del modelo.');

    return json({ respuesta: respuestaTexto });

  } catch (error) {
    console.error('[Soporte RAG Error]', error.message);
    return json({ error: 'Agente fuera de línea.' }, { status: 500 });
  }
}
