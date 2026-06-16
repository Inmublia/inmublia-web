import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private'; 

export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { id } = params;
  
  // 1. Extraemos los datos del broker basándonos ESTRICTAMENTE en su token de seguridad
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('id, ia_creditos_disponibles')
    .eq('auth_user_id', user.id)
    .single();

  if (brokerError || !broker) throw redirect(303, '/admin');

  // 2. Extraemos la propiedad, asegurando que PERTENEZCA a este broker
  const { data: propiedad, error: propError } = await locals.supabase
    .from('propiedades')
    .select('*')
    .eq('id', id)
    .eq('broker_id', broker.id) // <- CANDADO DE SEGURIDAD APLICADO
    .single();
  
  if (propError || !propiedad) throw redirect(303, '/admin');

  return { 
    propiedad,
    creditos_ia: broker.ia_creditos_disponibles ?? 5 
  };
}

export const actions = {
  // 🔥 MOTOR IA COMPARTIDO
  generarCampañaIA: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    // Corrección: Búsqueda estricta
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, ia_creditos_disponibles')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(400, { error: 'Perfil no encontrado.' });
    if (broker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: '🔒 Te has quedado sin créditos. Mejora tu plan a Pro para obtener 100 créditos mensuales.' });
    }

    const formData = await request.formData();
    const ubicacion = formData.get('ubicacion');
    const precio = formData.get('precio');
    const tipo = formData.get('tipo');
    const operacion = formData.get('operacion');
    const recamaras = formData.get('recamaras');
    const tono = formData.get('tono');

    if (!ubicacion || !precio) return fail(400, { error: 'Se requiere precio y ubicación.' });

    let systemPrompt = `Eres un estratega de marketing inmobiliario de alto nivel. Tu única función es crear material de ventas para propiedades. Si te preguntan algo ajeno, responde: "Solo redacto textos inmobiliarios."
    Tono requerido: ${tono === 'lujo' ? 'Exclusivo, aspiracional y elegante.' : tono === 'familiar' ? 'Cálido, seguro y enfocado en la familia.' : 'Analítico, enfocado en plusvalía y retorno de inversión.'}`;

    const userPrompt = `
      Crea una campaña para esta propiedad:
      - Operación: ${operacion}
      - Tipo: ${tipo}
      - Ubicación: ${ubicacion}
      - Precio: $${precio} MXN
      - Recámaras: ${recamaras}
      
      Debes devolver ÚNICAMENTE un objeto JSON válido con estas 4 llaves:
      1. "titulo": Un título SEO corto y atractivo (max 10 palabras).
      2. "descripcion": Descripción editorial de 2 a 3 párrafos, vendiendo el estilo de vida.
      3. "whatsapp": Un mensaje corto, persuasivo, con viñetas nativas y saltos de línea para enviar por listas de WhatsApp. No uses Emojis, usa viñetas normales.
      4. "tiktok": Un guion para video vertical (Short/Reel) dividido en [Gancho], [Desarrollo] y [Llamado a la Acción].
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) throw new Error('Fallo en la API de IA');

      const iaData = await response.json();
      let iaText = iaData.choices[0].message.content;
      
      iaText = iaText.replace(/```json/g, '').replace(/```/g, '');
      const parsedContent = JSON.parse(iaText);

      await locals.supabase
        .from('brokers')
        .update({ ia_creditos_disponibles: broker.ia_creditos_disponibles - 1 })
        .eq('id', broker.id);

      return {
        titulo: parsedContent.titulo,
        descripcion: parsedContent.descripcion,
        whatsapp: parsedContent.whatsapp,
        tiktok: parsedContent.tiktok
      };

    } catch (e) {
      console.error("Error en IA:", e);
      return fail(500, { error: 'Error procesando la IA. Revisa tu saldo o API Key.' });
    }
  },

  // GUARDADO ESTÁNDAR
  actualizar: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const id = params.id;

    const parseNum = (val) => val ? parseFloat(val) : 0;
    const parseIntNum = (val) => val ? parseInt(val) : 0;

    const video_url = formData.get('video_url') || null;
    const recorrido_3d_url = formData.get('recorrido_3d_url') || null; 

    // Revisamos el estatus de visibilidad basado en el checkbox
    const is_oculta = formData.get('is_oculta') === 'on';
    const estatus = is_oculta ? 'Pre-Mercado' : 'Activa';

    const actualizaciones = {
      titulo: formData.get('titulo'),
      precio: parseNum(formData.get('precio')),
      descripcion: formData.get('descripcion'),
      operacion: formData.get('operacion'),
      tipo: formData.get('tipo'),
      destacada: formData.get('destacada') === 'on',
      estatus: estatus,
      m2_terreno: parseNum(formData.get('m2_terreno')),
      m2_construccion: parseNum(formData.get('m2_construccion')),
      recamaras: parseIntNum(formData.get('recamaras')),
      banos: parseNum(formData.get('banos')),
      medio_bano: parseIntNum(formData.get('medio_bano')),
      estacionamientos: parseIntNum(formData.get('estacionamientos')),
      ubicacion: formData.get('ubicacion') || 'Ubicación Privada',
      video_url: video_url,
      recorrido_3d_url: recorrido_3d_url 
    };

    // Corrección: Búsqueda estricta
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil de asesor no encontrado.' });

    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria');

    if (imagen && imagen.size > 0) {
      const fileExt = imagen.name.split('.').pop();
      const fileName = `${broker.id}/${Date.now()}-main-edit.${fileExt}`;
      const buffer = await imagen.arrayBuffer();
      
      const { error: uploadError } = await locals.supabase.storage
        .from('propiedades')
        .upload(fileName, buffer, { contentType: imagen.type });
      
      if (!uploadError) {
        const { data: { publicUrl } } = locals.supabase.storage
          .from('propiedades')
          .getPublicUrl(fileName);
        actualizaciones.imagen_url = publicUrl;
      }
    }

    if (galeriaArchivos.length > 0 && galeriaArchivos[0].size > 0) {
      let galeriaUrls = [];
      for (const file of galeriaArchivos) {
        if (file && file.size > 0) {
          const ext = file.name.split('.').pop();
          const gName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
          const gBuffer = await file.arrayBuffer();
          
          const { error: gError } = await locals.supabase.storage
            .from('propiedades')
            .upload(gName, gBuffer, { contentType: file.type });
          
          if (!gError) {
            const { data: { publicUrl } } = locals.supabase.storage
              .from('propiedades')
              .getPublicUrl(gName);
            galeriaUrls.push(publicUrl);
          }
        }
      }
      if (galeriaUrls.length > 0) {
        // En una app real de producción, podrías querer fusionar el arreglo nuevo con el viejo. 
        // Por ahora, este código reemplaza la galería, tal como lo tenías diseñado.
        actualizaciones.galeria_urls = galeriaUrls;
      }
    }

    // Actualizamos asegurando que pertenece al broker
    const { data: updatedData, error } = await locals.supabase
      .from('propiedades')
      .update(actualizaciones)
      .eq('id', id)
      .eq('broker_id', broker.id)
      .select();

    if (error) return fail(500, { error: `Error SQL al actualizar: ${error.message}` });
    if (!updatedData || updatedData.length === 0) return fail(500, { error: 'No se pudo actualizar o la propiedad no te pertenece.' });
    
    throw redirect(303, '/admin');
  }
};
