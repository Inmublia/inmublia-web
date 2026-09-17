// src/routes/api/chat/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, locals, platform }) {
  // 1. Capa de Seguridad: Solo brokers autenticados pueden usar el soporte
  const user = locals.user;
  if (!user) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  const { mensaje } = await request.json();

  if (!mensaje) {
    return json({ error: 'Mensaje vacío' }, { status: 400 });
  }

  if (!platform?.env?.AI) {
    return json({ error: 'Falla Crítica: Servicio de IA no conectado.' }, { status: 500 });
  }

  try {
    // ----------------------------------------------------------------------
    // TODO (Siguiente sesión): CONEXIÓN VECTORIAL
    // Aquí recibiremos el "mensaje", generaremos su embedding matemático
    // y buscaremos en Supabase pgvector las 3 reglas que más se parezcan.
    // ----------------------------------------------------------------------
    
    // Simulación del contexto que traerá Supabase (RAG)
    const contextoSupabase = "Las imágenes de la galería no pueden superar los 8MB. El formato debe ser JPG, PNG o WebP.";

    // 2. Construcción del Prompt Restrictivo (El muro de contención)
    const systemPrompt = `Eres el Agente de Soporte Técnico Nivel 1 de Inmublia. 
Eres amable, directo y sumamente profesional.

REGLA DE ORO:
Responde a la pregunta del usuario utilizando ÚNICAMENTE la información dentro de las etiquetas <contexto>. 
Si la respuesta a la pregunta NO está dentro del <contexto>, tienes estrictamente PROHIBIDO inventar una solución. En ese caso, debes responder exactamente: "Esa es una excelente pregunta. Voy a escalar tu caso a nuestro equipo técnico de Nivel 2 para darte una solución precisa."

<contexto>
${contextoSupabase}
</contexto>`;

    // 3. Ejecución Nativa en Cloudflare usando DeepSeek
    // Usamos el modelo DeepSeek disponible en el catálogo de CF
    const result = await platform.env.AI.run('@cf/deepseek-ai/deepseek-r1-distill-qwen-7b', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mensaje }
      ],
      // Parámetros conservadores para evitar alucinaciones
      temperature: 0.1,
      max_tokens: 300
    });

    // 4. Parseo seguro de la respuesta de Workers AI
    const respuestaTexto = typeof result === 'string' ? result : (result.response || 'Sin respuesta del modelo.');

    return json({ 
      respuesta: respuestaTexto 
    });

  } catch (error) {
    console.error('[DeepSeek Support Agent Error]', error.message);
    return json({ 
      error: 'Nuestro agente está experimentando problemas técnicos. Por favor contacta a soporte@inmublia.com' 
    }, { status: 500 });
  }
}
