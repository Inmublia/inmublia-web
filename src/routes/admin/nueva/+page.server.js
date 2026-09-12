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
      // Fallback seguro: Asumimos el nuevo límite básico de 15 si hay error de DB
      return { creditos_ia: 15, plan_suscripcion: 'basico', comision_global: 5 };
    }

    return {
      creditos_ia: broker.ia_creditos_disponibles ?? 15,
      plan_suscripcion: broker.plan_suscripcion || 'basico',
      comision_global: broker.comision_default || 5
    };
  } catch (err) {
    return { creditos_ia: 15, plan_suscripcion: 'basico', comision_global: 5 };
  }
};

export const actions = {
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: 'Falla de Servidor: El Binding "AI" no está conectado en Cloudflare.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, ia_creditos_disponibles')
      .eq('auth_user_id', user.id)
      .single();

    // Verificación estricta del paywall en el backend
    if (!broker || broker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: 'Te has quedado sin créditos de IA. Mejora tu plan.' });
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

    const systemPrompt = `Eres el mejor copywriter inmobiliario de Norteamérica. 
    REGLA 1: Tu respuesta DEBE ser un objeto JSON puro, en una sola línea, sin saltos de línea crudos (usa \\n si necesitas saltos).
    REGLA 2: No uses markdown (\`\`\`json).
    REGLA 3: Usa comillas simples dentro de tus textos. NUNCA uses comillas dobles en los valores internos.`;

    const userPrompt = `
      Crea campaña de Alto Valor. Tono: ${tono}. Operación: ${operacion} de ${tipo} en ${ubicacion}. Precio: $${precio}.
      Características: ${recamaras} Recámaras, ${banos} Baños Completos, ${medio_bano} Medios Baños, ${estacionamientos} Autos, Antigüedad: ${antiguedad}.
      
      Debes devolver ESTRICTAMENTE este JSON rellenando cada llave bajo estas reglas inflexibles:
      {
        "titulo": "(Máximo 10 palabras. Debe ser un gancho irresistible y aspiracional)",
        "descripcion": "(OBLIGATORIO: Mínimo 150 palabras. Escribe 3 párrafos profundos. Párrafo 1: El gancho emocional y estilo de vida. Párrafo 2: Arquitectura, distribución detallada y comodidades. Párrafo 3: Ubicación estratégica, plusvalía y llamado a la acción poderoso)",
        "whatsapp": "(Mensaje estructurado con viñetas de emojis. Resalta el precio, la ubicación y un Call to Action urgente para agendar cita hoy mismo)",
        "tiktok": "(Guion hiper-detallado de 45 segundos. Formato estricto -> [0:00-0:05 VISUAL: toma rápida de fachada] AUDIO: Gancho agresivo. [0:05-0:30 VISUAL: Recorrido interior] AUDIO: Destaca lo mejor. [0:30-0:45 VISUAL: Vista de amenidades] AUDIO: Llamado a la acción con urgencia)"
      }
    `;

    try {
      const response = await platform.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500 
      });

      let rawResponse = response.response;
      let parsedContent = {};

      if (typeof rawResponse === 'object' && rawResponse !== null) {
        parsedContent = rawResponse;
      } else {
        let cleanText = String(rawResponse);
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
          return fail(500, { error: 'La IA no generó la estructura JSON.' });
        }

        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        cleanText = cleanText.replace(/[\u0000-\u001F]+/g, ' '); 

        try {
          parsedContent = JSON.parse(cleanText);
        } catch (err) {
          console.error("JSON PARSE ERROR:", cleanText);
          return fail(500, { error: `La IA generó caracteres incompatibles: ${err.message}` });
        }
      }

      await locals.supabase
        .from('brokers')
        .update({ ia_creditos_disponibles: broker.ia_creditos_disponibles - 1 })
        .eq('id', broker.id);

      return {
        titulo: parsedContent.titulo || parsedContent.Titulo || 'Propiedad Exclusiva',
        descripcion: parsedContent.descripcion || parsedContent.Descripcion || 'Contacta al broker para más detalles.',
        whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te comparto esta increíble propiedad...',
        tiktok: parsedContent.tiktok || parsedContent.TikTok || parsedContent.Tiktok || '[Gancho] ¡Mira esta propiedad! [Desarrollo] Contáctame.'
      };

    } catch (e) {
      return fail(500, { error: `Fallo de conexión Cloudflare AI: ${e.message}` });
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
