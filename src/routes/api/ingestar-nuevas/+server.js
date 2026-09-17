import { json } from '@sveltejs/kit';

export async function POST({ locals, platform }) {
  if (!platform?.env?.AI) return json({ error: 'AI no conectada' }, { status: 500 });

const nuevosConocimientos = [
    { categoria: 'Funcionalidad IA', contenido: 'El Estudio Creativo IA es el motor de inteligencia artificial de Inmublia. Su función es leer los datos duros de tu propiedad (m2, recámaras, ubicación, amenidades) y autogenerar un título atractivo, una descripción persuasiva lista para publicar y un texto optimizado (copy) para enviar por WhatsApp.' },
    { categoria: 'Consumo de Créditos', contenido: 'Cada vez que oprimes el botón para generar o regenerar textos en el Estudio Creativo IA, se consume exactamente 1 Crédito IA de tu saldo mensual. Si agotas los créditos de tu plan, puedes adquirir paquetes adicionales (Top-Ups) para seguir utilizando la herramienta.' },
    { categoria: 'Tonos de Redacción', contenido: 'Puedes controlar el estilo de los textos generados por la IA seleccionando uno de los tres tonos de redacción disponibles: Premium/Elegante (enfocado en lujo y exclusividad), Familiar/Cálido (emotivo, ideal para familias) y Analítico/ROI (enfocado en números, ideal para inversionistas).' },
    { categoria: 'Reembolsos Automáticos', contenido: 'Inmublia cuenta con un protocolo de protección de créditos. Si el motor de inteligencia artificial experimenta una caída, un error de red (Timeout), o te entrega un texto dañado o con formato incorrecto, el sistema detecta la falla y realiza un reembolso automático de 1 crédito a tu cuenta.' },
    { categoria: 'Buenas Prácticas', contenido: 'Si después de generar textos 2 o 3 veces el resultado no te convence, te recomendamos modificar el Tono de redacción o detallar mejor la información de la propiedad antes de volver a intentar. Esto evitará que agotes tus créditos rápidamente en una sola propiedad.' }
  ];

  try {
    const insertData = [];

    for (const item of nuevosConocimientos) {
      const { data } = await platform.env.AI.run('@cf/baai/bge-m3', {
        text: [item.contenido]
      });

      insertData.push({
        categoria: item.categoria,
        contenido: item.contenido,
        embedding: data[0]
      });
    }

    const { error } = await locals.supabase.from('soporte_glosario').insert(insertData);
    if (error) throw error;

    return json({ success: true, message: 'Nuevas píldoras inyectadas con éxito.' });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
}
