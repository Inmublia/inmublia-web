import { json } from '@sveltejs/kit';

export async function POST({ request, locals, platform }) {
  // 1. Validar que el usuario esté logueado (Seguridad básica)
  const user = locals.user;
  if (!user) return json({ error: 'No autorizado' }, { status: 401 });

  const { mensaje } = await request.json();

  if (!mensaje) {
    return json({ error: 'Mensaje vacío' }, { status: 400 });
  }

  // TODO (Siguiente sesión):
  // 1. Convertir el "mensaje" en un vector usando platform.env.AI
  // 2. Buscar en Supabase (soporte_glosario) las reglas que coincidan
  // 3. Mandar las reglas + el mensaje del usuario a Gemini 1.5 Flash
  // 4. Devolver la respuesta generada al frontend

  return json({ 
    respuesta: 'Hola, soy el agente Inmublia. Mi cerebro está en construcción, pronto podré leer el glosario.' 
  });
}
