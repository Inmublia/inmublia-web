import { json } from '@sveltejs/kit';

export async function POST({ request, locals, platform }) {
  // Solo administradores (tú) deberían poder correr esto
  const user = locals.user;
  if (!user) return json({ error: 'No autorizado' }, { status: 401 });

  if (!platform?.env?.AI) return json({ error: 'AI no disponible' }, { status: 500 });

  // Tu glosario maestro estructurado
  const glosario = [
    { categoria: 'Limites', contenido: 'La plataforma permite una foto de portada obligatoria y una galería secundaria con un máximo de 20 fotografías adicionales. Cada imagen no debe superar los 8 MB de peso. El total de una carga masiva está limitado a 40 MB.' },
    { categoria: 'Formatos', contenido: 'El sistema realiza validación criptográfica (Magic Bytes) y solo acepta archivos de imagen en formato JPG, PNG o WebP. No se permiten PDFs ni documentos.' },
    { categoria: 'IA Reglas', contenido: 'El Estudio Creativo IA autogenera títulos, descripciones editoriales persuasivas y copys para WhatsApp. Cada generación exitosa consume 1 crédito de forma atómica. Si el modelo de IA falla o hay un error de red, el sistema realiza un reembolso automático de 1 crédito al usuario.' },
    { categoria: 'Plantillas', contenido: 'Un usuario con plan Básico no puede utilizar plantillas de nivel Pro o Elite. El Smart Brochure tiene plantillas Básico (Clean Showcase), Pro (Lead Magnet) o Elite (Luxury Immersive) dependiendo del plan de suscripción.' },
    { categoria: 'Privacidad', contenido: 'El estado Pre-Mercado (Oculta) significa que una propiedad no es visible en el catálogo público general y solo puede ser accedida mediante un enlace directo (URL secreta) proporcionado por el broker.' }
  ];

  try {
    const insertData = [];

    for (const item of glosario) {
      // 1. Convertir el texto a Vector matemático usando BGE-M3
      const { data } = await platform.env.AI.run('@cf/baai/bge-m3', {
        text: [item.contenido]
      });

      insertData.push({
        categoria: item.categoria,
        contenido: item.contenido,
        embedding: data[0] // El array de 1024 flotantes
      });
    }

    // 2. Guardar en Supabase
    const { error } = await locals.supabase
      .from('soporte_glosario')
      .insert(insertData);

    if (error) throw error;

    return json({ success: true, message: 'Glosario vectorizado e ingestado con éxito.' });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
}
