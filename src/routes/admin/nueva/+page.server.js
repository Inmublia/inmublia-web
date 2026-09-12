import { redirect, fail } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  try {
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('ia_creditos_disponibles, plan_suscripcion, comision_default')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !broker) {
      return { creditos_ia: 0, plan_suscripcion: 'basico', comision_global: 5 };
    }

    return {
      creditos_ia: broker.ia_creditos_disponibles ?? 5,
      plan_suscripcion: broker.plan_suscripcion || 'basico',
      comision_global: broker.comision_default || 5
    };
  } catch (err) {
    return { creditos_ia: 0, plan_suscripcion: 'basico', comision_global: 5 };
  }
};

export const actions = {
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: '🚨 Falla de Servidor: El Binding "AI" no está conectado en Cloudflare.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, ia_creditos_disponibles, plan_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(400, { error: 'Perfil no encontrado.' });
    if (broker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: '🔒 Te has quedado sin créditos. Mejora tu plan a Pro o Elite.' });
    }

    const formData = await request.formData();
    const ubicacion = formData.get('ubicacion');
    const precio = formData.get('precio');
    const tipo = formData.get('tipo');
    const operacion = formData.get('operacion');
    const tono = formData.get('tono');
    
    const recamaras = formData.get('recamaras') || '0';
    const banos = formData.get('banos') || '0';
    const medio_bano = formData.get('medio_bano') || '0';
    const estacionamientos = formData.get('estacionamientos') || '0';
    const antiguedad = formData.get('antiguedad') || 'No especificada';

    if (!ubicacion || !precio) return fail(400, { error: 'Se requiere precio y ubicación.' });

    let systemPrompt = `Eres un copywriter inmobiliario de élite. Tono: ${tono}.
    REGLA ABSOLUTA: Responde ÚNICAMENTE con un objeto JSON. Cero palabras antes, cero palabras después.`;

    const userPrompt = `
      Crea campaña para: ${operacion} de ${tipo} en ${ubicacion}. Precio: $${precio}.
      Specs: ${recamaras} Rec, ${banos} Baños, ${medio_bano} Medios, ${estacionamientos} Autos, Antigüedad: ${antiguedad}.
      
      Devuelve ESTE FORMATO EXACTO EN JSON PURO:
      {
        "titulo": "Título atractivo max 10 palabras",
        "descripcion": "Descripción comercial vendiendo estilo de vida",
        "whatsapp": "Mensaje para enviar por chat con emojis",
        "tiktok": "Guion corto de video vertical"
      }
    `;

    try {
      const response = await platform.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      let iaText = response.response;
      if (typeof iaText !== 'string') iaText = JSON.stringify(iaText);

      let parsedContent;
      
      // PARSER INDESTRUCTIBLE: Limpieza y Extracción Forzada
      let cleanText = iaText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      try {
        parsedContent = JSON.parse(cleanText);
      } catch (err1) {
        // Si falla, extraemos solo lo que esté entre corchetes { }
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsedContent = JSON.parse(jsonMatch[0]);
          } catch (err2) {
            console.error("JSON Corrupto extraído:", jsonMatch[0]);
            return fail(500, { error: 'La IA devolvió un formato inválido. Reintenta.' });
          }
        } else {
          console.error("Respuesta cruda de IA:", iaText);
          return fail(500, { error: `La IA no generó JSON. Respuesta recibida: ${iaText.substring(0, 50)}...` });
        }
      }

      if (!parsedContent.titulo || !parsedContent.descripcion) {
         return fail(500, { error: 'El contenido generado está incompleto. Intenta de nuevo.' });
      }

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
      console.error("Fallo General Workers AI:", e);
      return fail(500, { error: `Error conectando con Cloudflare: ${e.message}` });
    }
  },

  crear: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const comisionStr = formData.get('comision'); 
    const descripcion = formData.get('descripcion');
    const operacion = formData.get('operacion');
    const tipo = formData.get('tipo');
    const destacada = formData.get('destacada') === 'on';
    const is_oculta = formData.get('is_oculta') === 'on';
    const estatus = is_oculta ? 'Pre-Mercado' : 'Activa';
    
    const m2_terreno = formData.get('m2_terreno') || 0;
    const m2_construccion = formData.get('m2_construccion') || 0;
    const recamaras = formData.get('recamaras') || 0;
    const banos = formData.get('banos') || 0;
    const medio_bano = formData.get('medio_bano') || 0;
    const estacionamientos = formData.get('estacionamientos') || 0;
    const antiguedad = formData.get('antiguedad') || 'No especificada'; 
    const ubicacion = formData.get('ubicacion') || 'Guadalajara, Jalisco';
    
    const video_url = formData.get('video_url') || null;
    const recorrido_3d_url = formData.get('recorrido_3d_url') || null;
    const template_id = formData.get('template_id') || 'prop_basic_1'; 

    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria'); 

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Faltan campos obligatorios o la foto de portada.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, comision_default')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(400, { error: 'Perfil de agencia no encontrado.' });

    const comisionFinal = comisionStr ? parseFloat(comisionStr) : (broker.comision_default || 5);

    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-main.${fileExt}`;
    const buffer = await imagen.arrayBuffer();
    
    const { error: uploadError } = await locals.supabase.storage
      .from('propiedades')
      .upload(fileName, buffer, { contentType: imagen.type });
    
    if (uploadError) return fail(500, { error: `Error en portada: ${uploadError.message}` });
    
    const { data: { publicUrl: portadaUrl } } = locals.supabase.storage
      .from('propiedades')
      .getPublicUrl(fileName);

    const validGaleriaArchivos = galeriaArchivos.filter(file => file && file.size > 0);
    
    const galeriaPromises = validGaleriaArchivos.map(async (file) => {
      const ext = file.name.split('.').pop();
      const gName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const gBuffer = await file.arrayBuffer();
      
      const { error: gError } = await locals.supabase.storage
        .from('propiedades')
        .upload(gName, gBuffer, { contentType: file.type });
      
      if (!gError) {
        const { data: { publicUrl } } = locals.supabase.storage
          .from('propiedades')
          .getPublicUrl(gName);
        return publicUrl;
      }
      return null;
    });

    const galeriaResults = await Promise.all(galeriaPromises);
    const galeriaUrls = galeriaResults.filter(url => url !== null);

    const baseSlug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const sufijoUnico = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${sufijoUnico}`;

    const cleanNumber = (val) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.]/g, ''); 
        return parseFloat(cleaned) || 0;
    };

    const { error: insertError } = await locals.supabase
      .from('propiedades')
      .insert({
        broker_id: broker.id,
        titulo, 
        slug, 
        operacion, 
        tipo, 
        destacada, 
        descripcion, 
        ubicacion,
        estatus,
        antiguedad, 
        precio: cleanNumber(precio), 
        comision: comisionFinal,
        m2_terreno: cleanNumber(m2_terreno), 
        m2_construccion: cleanNumber(m2_construccion), 
        recamaras: parseInt(recamaras) || 0,
        banos: cleanNumber(banos), 
        medio_bano: parseInt(medio_bano) || 0,
        estacionamientos: parseInt(estacionamientos) || 0,
        imagen_url: portadaUrl,
        galeria_urls: galeriaUrls, 
        video_url,
        recorrido_3d_url,
        template_id 
      });

    if (insertError) return fail(500, { error: `Error SQL: ${insertError.message}` });
    
    throw redirect(303, '/admin');
  }
};
