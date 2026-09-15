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
      plan_suscripcion: (broker.plan_suscripcion || 'basico').toLowerCase().trim(),
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
      'Premium / Elegante': 'Tono profesional, moderno y de alto valor. Destaca la amplitud y la plusvalía. Cero poético.',
      'Familiar / Cálido': 'Tono seguro y funcional. Destaca la practicidad para el día a día y la tranquilidad.',
      'Analítico / ROI': 'Tono financiero y estratégico. Destaca la rentabilidad y distribución inteligente.'
    };
    
    const instruccionTono = guiasTono[tonoSeleccionado] || guiasTono['Premium / Elegante'];

    const systemPrompt = `<role>Eres un Copywriter Inmobiliario en México.</role>
<rules>
1. IDIOMA: 100% Español de México.
2. FORMATO: Jamás juntes texto con números.
3. TONO: ${instruccionTono}
4. SALIDA: Debes generar EXCLUSIVAMENTE un objeto JSON válido. SIN MARKDOWN. SIN SALUDOS.
</rules>`;

    const userPrompt = `Genera la campaña para esta propiedad en formato JSON estricto:
<data>
Operación: ${operacion}
Tipo: ${tipo}
Ubicación: ${ubicacion}
Precio: $${precio} MXN
Recámaras: ${recamaras}
Baños: ${banos}
Medios Baños: ${medio_bano}
Autos: ${estacionamientos}
Antigüedad: ${antiguedad}
</data>

<json_format>
{
  "titulo": "[Título magnético, max 8 palabras]",
  "descripcion": "[3 párrafos separados por \\n\\n. Párrafo 1: Intro. Párrafo 2: Características. Párrafo 3: Cierre.]",
  "whatsapp": "[Mensaje para WhatsApp con 3 emojis]"
}
</json_format>`;

    try {
      // 🚀 BLINDAJE 1: Usar el modelo más rápido de Cloudflare para evitar Timeouts
      const modeloExitoso = '@cf/meta/llama-3.1-8b-instruct';
      
      // 🚀 BLINDAJE 2: Petición pura, sin parámetros que causan drop silencioso en Cloudflare AI
      const response = await platform.env.AI.run(modeloExitoso, {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      if (!response || !response.response) {
        throw new Error("El modelo de IA devolvió una respuesta vacía o Cloudflare cortó la conexión.");
      }

      let rawResponse = String(response.response).trim();
      
      // 🚀 BLINDAJE 3: Destruir el código Markdown que Llama siempre intenta inyectar
      rawResponse = rawResponse.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("La IA no devolvió la estructura JSON requerida.");
      }

      let jsonString = jsonMatch[0];
      
      // Escapamos los saltos de línea para que JSON.parse no explote
      jsonString = jsonString.replace(/\n/g, '\\n').replace(/\r/g, '');
      // Borramos caracteres nulos que a veces retornan los LLM
      jsonString = jsonString.replace(/[\u0000-\u0009\u000B-\u001F]+/g, ' ');

      const parsedContent = JSON.parse(jsonString);

      // Descontamos crédito si y solo si todo fue exitoso
      await locals.supabase
        .from('brokers')
        .update({ ia_creditos_disponibles: broker.ia_creditos_disponibles - 1 })
        .eq('id', broker.id);

      return {
        titulo: parsedContent.titulo || parsedContent.Titulo || 'Propiedad en Venta',
        descripcion: parsedContent.descripcion || parsedContent.Descripcion || 'Contacta al broker para más detalles.',
        whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te comparto los detalles de esta propiedad...'
      };

    } catch (error) {
      console.error("🔥 FALLO IA CAPTURADO:", error);
      
      // 🚀 BLINDAJE 4: LA CURA AL "SPINNER INFINITO"
      // Si devolvemos fail(), el frontend buggy se queda girando. 
      // Al devolver estos strings como un éxito falso, desbloqueamos el botón INMEDIATAMENTE
      // y el usuario recibe el aviso directo en pantalla sin perder sus datos.
      return {
        titulo: '⚠️ Error de Conexión IA',
        descripcion: `El servidor de Inteligencia Artificial de Cloudflare superó el tiempo de espera o está saturado.\n\nDetalle técnico para soporte: ${error.message}\n\nPor favor, intenta presionar el botón nuevamente. No se te han descontado créditos.`,
        whatsapp: 'Intenta nuevamente más tarde.'
      };
    }
  },

  crear: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    if (!platform?.env?.INMUBLIA_BUCKET) {
      return fail(500, { error: 'Falla Crítica: Cloudflare R2 (INMUBLIA_BUCKET) no está conectado.' });
    }
    
    const CDN_DOMAIN = platform?.env?.CDN_URL || '[https://cdn.inmublia.com](https://cdn.inmublia.com)';

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
