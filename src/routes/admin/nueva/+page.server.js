// src/routes/admin/nueva/+page.server.js
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

    if (!broker || broker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: 'Has agotado tus créditos de IA.' });
    }

    const formData = await request.formData();
    const ubicacion = formData.get('ubicacion');
    const precio = formData.get('precio');
    const tipo = formData.get('tipo');
    const operacion = formData.get('operacion');
    const tonoSeleccionado = formData.get('tono') || 'Premium / Elegante';
    const recamaras = formData.get('recamaras') || '0';
    const banos = formData.get('banos') || '0';
    const medio_bano = formData.get('medio_bano') || '0';
    const estacionamientos = formData.get('estacionamientos') || '0';
    const antiguedad = formData.get('antiguedad') || 'No especificada';

    if (!ubicacion || !precio) return fail(400, { error: 'Se requiere precio y ubicación.' });

    const guiasTono = {
      'Premium / Elegante': 'Tono profesional, moderno y de alto valor. Destaca la amplitud y la calidad de vida de forma objetiva. EVITA clichés como "lujo extremo", "paraíso" o "estilo de vida sofisticado".',
      'Familiar / Cálido': 'Tono cercano, seguro y funcional. Destaca la practicidad de los espacios para el día a día y la tranquilidad de la zona. EVITA sonar cursi o excesivamente poético.',
      'Analítico / ROI': 'Tono objetivo, financiero y estratégico. Destaca la ubicación, rentabilidad y distribución inteligente. Usa lenguaje de negocios claro y directo.'
    };
    
    const instruccionTono = guiasTono[tonoSeleccionado] || guiasTono['Premium / Elegante'];

    const systemPrompt = `Eres un redactor inmobiliario profesional y persuasivo en México.
    REGLA 0: ESCRIBE TODO ESTRICTAMENTE EN ESPAÑOL DE MÉXICO.
    REGLA 1: Devuelve SOLO un objeto JSON puro, en una línea.
    REGLA 2: No uses markdown (\`\`\`json).
    REGLA 3: Usa comillas simples dentro de tus textos. NUNCA uses comillas dobles en los valores internos.
    REGLA 4: PROHIBIDO usar palabras rebuscadas, rimbombantes o aduladoras (ej. "maravilla", "exclusivo", "amante del lujo", "sofisticado"). Escribe con naturalidad, objetividad y elegancia moderna.
    REGLA 5: CEÑIRSE ESTRICTAMENTE A LOS DATOS. No inventes amenidades.`;

    const userPrompt = `
      Redacta una ficha técnica atractiva. Operación: ${operacion} de ${tipo} en ${ubicacion}. Precio: $${precio}.
      Características exactas: ${recamaras} Recámaras, ${banos} Baños Completos, ${medio_bano} Medios Baños, ${estacionamientos} Autos, Antigüedad: ${antiguedad}.
      
      TONO REQUERIDO: "${tonoSeleccionado}".
      Instrucción de tono: ${instruccionTono}
      
      Devuelve ESTRICTAMENTE este JSON:
      {
        "titulo": "(Máximo 10 palabras. Título descriptivo y comercial, sin exagerar)",
        "descripcion": "(Mínimo 150 palabras. Escribe exactamente 3 párrafos separados por el texto literal '\\n\\n'. Párrafo 1: Introducción directa al inmueble y su mayor atractivo real. Párrafo 2: Integra las características numéricas de forma fluida y natural en la redacción, NO repitas instrucciones textualmente. Párrafo 3: Ventajas de la zona y llamado a la acción. Sé convincente pero realista)",
        "whatsapp": "(Mensaje de WhatsApp directo, profesional y amable. Máximo 2 emojis. Separa las líneas con '\\n\\n'. Cierre con pregunta o llamado a la acción claro)"
      }
    `;

    const modelosActivos = [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/meta/llama-3-8b-instruct'
    ];

    let rawResponse = null;
    let modeloExitoso = '';
    let erroresLog = [];

    for (const modelo of modelosActivos) {
      try {
        const response = await platform.env.AI.run(modelo, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1024 
        });
        
        rawResponse = response.response;
        
        if (rawResponse) {
          modeloExitoso = modelo;
          break; 
        }
      } catch (e) {
        erroresLog.push(`[${modelo}]: ${e.message}`);
      }
    }

    if (!rawResponse) {
      return fail(500, { error: `Todos los motores caídos. Detalles: ${erroresLog.join(' | ')}` });
    }

    let parsedContent = {};

    if (typeof rawResponse === 'object' && rawResponse !== null) {
      parsedContent = rawResponse;
    } else {
      let cleanText = String(rawResponse);
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        return fail(500, { error: `El motor ${modeloExitoso} falló al generar JSON.` });
      }

      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      cleanText = cleanText.replace(/\n/g, '\\n').replace(/\r/g, '');
      cleanText = cleanText.replace(/[\u0000-\u0009\u000B-\u001F]+/g, ' ');

      try {
        parsedContent = JSON.parse(cleanText);
      } catch (err) {
        console.error("JSON PARSE ERROR en", modeloExitoso, ":", cleanText);
        return fail(500, { error: `Error JSON (${modeloExitoso}): ${err.message}` });
      }
    }

    await locals.supabase
      .from('brokers')
      .update({ ia_creditos_disponibles: broker.ia_creditos_disponibles - 1 })
      .eq('id', broker.id);

    return {
      titulo: parsedContent.titulo || parsedContent.Titulo || 'Propiedad en Venta',
      descripcion: parsedContent.descripcion || parsedContent.Descripcion || 'Contacta al broker para más detalles.',
      whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te comparto los detalles de esta propiedad...'
    };
  },

  crear: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    if (!platform?.env?.INMUBLIA_BUCKET) {
      return fail(500, { error: 'Falla Crítica: Cloudflare R2 (INMUBLIA_BUCKET) no está conectado.' });
    }
    
    const CDN_DOMAIN = platform?.env?.CDN_URL || 'https://cdn.inmublia.com';

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

    const fileExt = imagen.name.split('.').pop() || 'webp';
    const fileName = `${broker.id}/${Date.now()}-main.${fileExt}`;
    const buffer = await imagen.arrayBuffer();
    let portadaUrl = '';
    
    try {
      await platform.env.INMUBLIA_BUCKET.put(fileName, buffer, {
        httpMetadata: { contentType: imagen.type || 'image/webp' }
      });
      // Eliminamos la barra final si existe en el CDN_URL por seguridad en la concatenación
      const baseCdnUrl = CDN_DOMAIN.replace(/\/$/, "");
      portadaUrl = `${baseCdnUrl}/${fileName}`;
    } catch (uploadError) {
      return fail(500, { error: `Error R2 Portada: ${uploadError.message}` });
    }

    const validGaleriaArchivos = galeriaArchivos.filter(file => file && file.size > 0);
    
    const galeriaPromises = validGaleriaArchivos.map(async (file, index) => {
      const ext = file.name.split('.').pop() || 'webp';
      const gName = `${broker.id}/${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
      const gBuffer = await file.arrayBuffer();
      
      try {
        await platform.env.INMUBLIA_BUCKET.put(gName, gBuffer, {
          httpMetadata: { contentType: file.type || 'image/webp' }
        });
        const baseCdnUrl = CDN_DOMAIN.replace(/\/$/, "");
        return `${baseCdnUrl}/${gName}`;
      } catch (gError) {
        console.error("Error R2 Galería:", gError);
        return null;
      }
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
