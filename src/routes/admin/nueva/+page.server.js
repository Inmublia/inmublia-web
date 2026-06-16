import { redirect, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private'; 

export const load = async ({ locals }) => {
  // 1. Validar sesión
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  try {
    // 2. Buscar al broker de forma estricta usando su ID de Autenticación
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('ia_creditos_disponibles, plan_suscripcion')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !broker) {
      console.error("Broker no encontrado en carga de formulario:", error);
      // Fallback seguro para que no se caiga la pantalla con error 500
      return { creditos_ia: 0, plan_suscripcion: 'basico' };
    }

    // 3. Devolver datos limpios al frontend
    return {
      creditos_ia: broker.ia_creditos_disponibles ?? 5,
      plan_suscripcion: broker.plan_suscripcion || 'basico'
    };
  } catch (err) {
    console.error("Fallo crítico en load /admin/nueva:", err);
    return { creditos_ia: 0, plan_suscripcion: 'basico' };
  }
};

export const actions = {
  generarCampañaIA: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, ia_creditos_disponibles, plan_suscripcion')
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
      1. "titulo": Un título SEO corto y muy atractivo (max 10 palabras).
      2. "descripcion": Descripción editorial de 2 a 3 párrafos, vendiendo el estilo de vida.
      3. "whatsapp": Un mensaje corto, persuasivo, con emojis y saltos de línea para enviar por listas de difusión de WhatsApp.
      4. "tiktok": Un guion para un video vertical (Short/Reel/TikTok) dividido en [Gancho], [Desarrollo] y [Llamado a la Acción].
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

  crear: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
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
    const ubicacion = formData.get('ubicacion') || 'Guadalajara, Jalisco';
    
    const video_url = formData.get('video_url') || null;
    const recorrido_3d_url = formData.get('recorrido_3d_url') || null;

    const template_id = formData.get('template_id') || 'classic';

    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria'); 

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Faltan campos obligatorios o la foto de portada.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(400, { error: 'Perfil de agencia no encontrado.' });

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

    const slug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

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
        precio: cleanNumber(precio), 
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
