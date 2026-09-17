import { json } from '@sveltejs/kit';

export async function POST({ locals, platform }) {
  if (!platform?.env?.AI) return json({ error: 'AI no conectada' }, { status: 500 });

  const nuevosConocimientos = [
    { categoria: 'Crear Propiedad', contenido: 'Para crear o subir una nueva propiedad en Inmublia, haz clic en el botón "+ Nueva Propiedad" en el panel principal. Debes completar obligatoriamente la ubicación, un precio válido, el tipo de inmueble (Casa, Departamento, etc.) y la operación (Venta o Renta). También deberás proporcionar un título y una descripción.' },
    { categoria: 'Multimedia Propiedad', contenido: 'Al cargar una propiedad nueva, es obligatorio subir una foto de portada. Opcionalmente, puedes añadir hasta 20 fotos adicionales en la galería. Las imágenes deben ser JPG, PNG o WebP, y no superar los 8MB cada una. Además, puedes agregar URLs seguras (HTTPS) para enlazar videos y recorridos 3D.' },
    { categoria: 'Uso IA Propiedad', contenido: 'Durante la creación de una propiedad, puedes usar el "Estudio Creativo IA" para autogenerar el título, la descripción y un copy para WhatsApp basándose en las características del inmueble (recámaras, baños, m2). Utilizar esta función consume 1 Crédito IA atómico de tu cuenta.' },
    { categoria: 'Open House', contenido: 'Para crear o configurar un evento de Open House, dirígete al módulo "Open House" en la consola operativa. El sistema generará un control de acceso físico mediante escaneo QR y tecnología NFC, permitiendo a los visitantes hacer un Check-in automático validando su número de WhatsApp en la plataforma.' }
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
