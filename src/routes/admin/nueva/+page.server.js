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

// 🛡️ FUNCIÓN DE SANITIZACIÓN PARA PREVENIR PROMPT INJECTION
const sanitizar = (str, maxLen = 100) => {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')           // Elimina HTML básico
    .replace(/\n|\r/g, ' ')         // Elimina saltos que rompan el prompt
    .substring(0, maxLen)           // Limita longitud
    .trim();
};

// 🛡️ FUNCIÓN DE PARSEO DE NÚMEROS ROBUSTA (Formato MX / Europeo)
const cleanNumber = (val) => {
  if (!val && val !== 0) return 0;
  const str = String(val).trim();
  
  const dots = (str.match(/\./g) || []).length;
  const commas = (str.match(/,/g) || []).length;
  
  let normalized = str;
  if (dots > 1) {
    // Formato europeo: 1.500.000 -> quitamos puntos
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else if (commas > 0 && dots > 0) {
    // Formato MX formal: 1,500,000.50 -> quitamos comas
    normalized = str.replace(/,/g, '');
  } else {
    // Limpieza general
    normalized = str.replace(/[^0-9.]/g, '');
  }
  
  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : result;
};

export const actions = {
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: 'Falla Crítica: El Binding "AI" no está conectado.' });
    }

    // Chequeo inicial ligero (Para abortar si ya están en 0 y no gastar en Cloudflare)
    const { data: checkBroker } = await locals.supabase
      .from('brokers')
      .select('ia_creditos_disponibles')
      .eq('auth_user_id', user.id)
      .single();

    if (!checkBroker || checkBroker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: 'Has agotado tus créditos de IA.' });
    }

    const formData = await request.formData();
    
    // 🛡️ APLICAMOS SANITIZACIÓN A TODAS LAS VARIABLES DE ENTRADA
    const ubicacion = sanitizar(formData.get('ubicacion'), 100);
    const precio = sanitizar(formData.get('precio'), 30);
    const tipo = sanitizar(formData.get('tipo'), 50);
    const operacion = sanitizar(formData.get('operacion'), 30);
    const tonoSeleccionado = sanitizar(formData.get('tono'), 50) || 'Premium / Elegante';
    const recamaras = sanitizar(formData.get('recamaras'), 10) || '0';
    const banos = sanitizar(formData.get('banos'), 10) || '0';
    const medio_bano = sanitizar(formData.get('medio_bano'), 10) || '0';
    const estacionamientos = sanitizar(formData.get('estacionamientos'), 10) || '0';
    const antiguedad = sanitizar(formData.get('antiguedad'), 50) || 'No especificada';

    if (!ubicacion || !precio) return fail(400, { error: 'Se requiere precio y ubicación.' });

    const guiasTono = {
      'Premium / Elegante': 'Sofisticado, aspiracional y enfocado en exclusividad. Lenguaje de alto valor.',
      'Familiar / Cálido': 'Cercano, seguro y emotivo. Enfocado en crear memorias y tranquilidad.',
      'Analítico / ROI': 'Estratégico, financiero y directo. Enfocado en plusvalía y diseño inteligente.'
    };
    
    const instruccionTono = guiasTono[tonoSeleccionado] || guiasTono['Premium / Elegante'];

    const systemPrompt = `<role>Eres el Director Creativo de una agencia inmobiliaria de lujo en México. Vendes un ESTILO DE VIDA.</role>
<rules>
1. IDIOMA: Español de México. Redacción impecable y persuasiva.
2. ESTRUCTURA: Transforma los datos fríos en una experiencia emocional.
3. FORMATO: Responde EXCLUSIVAMENTE con un objeto JSON válido.
4. SALTOS DE LÍNEA: PROHIBIDO usar Enter. Usa la etiqueta literal <br><br> para separar párrafos.
5. COMILLAS: Usa SOLO comillas simples (') dentro de las descripciones.
6. TONO: ${instruccionTono}
</rules>`;

    const userPrompt = `Genera un copy comercial irresistible para esta propiedad en JSON:
<data>
Operación: ${operacion} | Tipo: ${tipo} | Ubicación: ${ubicacion} | Precio: $${precio} MXN
Recámaras: ${recamaras} | Baños: ${banos} | Autos: ${estacionamientos} | Antigüedad: ${antiguedad}
</data>

<json_format>
{
  "titulo": "[Título emocional y magnético, max 10 palabras]",
  "descripcion": "[Párrafo 1: Gancho emocional.<br><br>Párrafo 2: Descripción sensorial.<br><br>Párrafo 3: Llamado a la acción.]",
  "whatsapp": "[Mensaje persuasivo para WhatsApp, usando 2 emojis]"
}
</json_format>`;

    // 🚀 TUS MODELOS DE VANGUARDIA (Optimizados y Cuantizados para Velocidad Absoluta)
    const modelosSoportados = [
      '@cf/meta/llama-3.1-8b-instruct-fp8',
      '@cf/meta/llama-3.2-3b-instruct',
      '@cf/qwen/qwen3-30b-a3b-fp8'
    ];

    let parsedContent = null;
    let errorLog = [];

    for (const modelo of modelosSoportados) {
      try {
        const result = await platform.env.AI.run(modelo, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 800
        });

        if (!result) throw new Error("API devolvió vacío");

        let rawResponse = '';
        if (typeof result === 'string') {
          rawResponse = result;
        } else if (result.response) {
          rawResponse = String(result.response);
        } else {
          rawResponse = JSON.stringify(result);
        }

        // 🚀 EL FIX MAGISTRAL QUE SOLICITASTE PARA LAS LLAVES
        let cleanText = rawResponse
          .replace(/^```json/gi, '')
          .replace(/^```/gi, '')
          .replace(/```$/gi, '')
          .trim();

        if (!cleanText.startsWith('{') && cleanText.includes('"titulo"')) {
          cleanText = '{' + cleanText;
          if (!cleanText.endsWith('}')) cleanText += '}';
        }

        let firstBrace = cleanText.indexOf('{');
        let lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
          throw new Error(`Timeout o truncado. Fragmento: ${cleanText.substring(0, 40)}...`);
        }

        let jsonString = cleanText.substring(firstBrace, lastBrace + 1);
        jsonString = jsonString.replace(/\n/g, ' ').replace(/\r/g, ''); // Mata Enters ocultos

        parsedContent = JSON.parse(jsonString);
        break; // ¡JSON PERFECTO! 

      } catch (e) {
        const nombreModelo = modelo.split('/').pop();
        errorLog.push(`${nombreModelo}: ${e.message}`);
      }
    }

    if (!parsedContent) {
      return fail(500, { 
        error: `Fallo en IA: Todos los modelos sufrieron Timeout o fallaron.\nDetalle: ${errorLog.join(' | ')}\nNo se te han descontado créditos.` 
      });
    }

    // 🚀 DEFENSA CRÍTICA: COBRO ATÓMICO ANTI RACE-CONDITION
    // Usamos el RPC que creaste en Supabase. Garantiza que no pase a negativos.
    const { data: rpcData, error: rpcError } = await locals.supabase.rpc('consumir_credito_ia', {
      p_user_id: user.id
    });

    if (rpcError || !rpcData || rpcData.length === 0) {
      // Si llega aquí, significa que spameó el botón en 2 tabs y este fue el request lento.
      return fail(403, { error: 'Sin créditos de IA disponibles para finalizar la acción.' });
    }

    // Restauramos los <br><br> a saltos de línea reales
    let descripcionLimpia = (parsedContent.descripcion || 'Sin descripción').replace(/<br><br>/g, '\n\n');

    return {
      titulo: parsedContent.titulo || parsedContent.Titulo || 'Propiedad Exclusiva',
      descripcion: descripcionLimpia,
      whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te comparto esta propiedad...'
    };
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

    // 🛡️ DEFENSA CRÍTICA: LÍMITES DE R2 (Tipos permitidos y tamaño máx 8MB)
    const MAX_SIZE_MB = 8;
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

    if (imagen.size > MAX_SIZE_MB * 1024 * 1024) {
      return fail(400, { error: `La foto de portada supera el límite de ${MAX_SIZE_MB}MB. Su tamaño es ${(imagen.size / 1024 / 1024).toFixed(1)}MB.` });
    }
    if (!TIPOS_PERMITIDOS.includes(imagen.type)) {
      return fail(400, { error: `Formato de portada no soportado (${imagen.type}). Usa JPG, PNG o WebP.` });
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
      return fail(500, { error: `Error en servidor al subir portada: ${uploadError.message}` });
    }

    // 🛡️ DEFENSA CRÍTICA: LÍMITE Y REPORTES DE GALERÍA
    const validGaleriaArchivos = galeriaArchivos.filter(file => file && file.size > 0);
    
    if (validGaleriaArchivos.length > 20) {
      return fail(400, { error: 'Por rendimiento, solo puedes subir un máximo de 20 fotos en la galería por carga.' });
    }

    const galeriaPromises = validGaleriaArchivos.map(async (file, index) => {
      // Validación individual de la galería
      if (file.size > MAX_SIZE_MB * 1024 * 1024) throw new Error(`Foto ${index + 1} excede ${MAX_SIZE_MB}MB`);
      if (!TIPOS_PERMITIDOS.includes(file.type)) throw new Error(`Foto ${index + 1} tiene formato inválido`);

      const ext = file.name.split('.').pop() || 'webp';
      const gName = `${broker.id}/${Date.now()}-${index}-${crypto.randomUUID().split('-')[0]}.${ext}`;
      const gBuffer = await file.arrayBuffer();
      
      await platform.env.INMUBLIA_BUCKET.put(gName, gBuffer, {
        httpMetadata: { contentType: file.type || 'image/webp' }
      });
      const baseCdnUrl = CDN_DOMAIN.replace(/\/$/, "");
      return `${baseCdnUrl}/${gName}`;
    });

    // Promise.allSettled para no perder el tracking si una sola foto falla
    const galeriaResults = await Promise.allSettled(galeriaPromises);
    const galeriaUrls = [];
    const galeriaFallidas = [];

    for (const result of galeriaResults) {
      if (result.status === 'fulfilled' && result.value) {
        galeriaUrls.push(result.value);
      } else {
        galeriaFallidas.push(result.reason?.message ?? 'Error desconocido');
      }
    }

    // 🛡️ DEFENSA CRÍTICA: SLUGS MÁS ROBUSTOS (Evita colisiones matemáticas)
    const baseSlug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${crypto.randomUUID().split('-')[0]}`; // 8 Caracteres alfanuméricos seguros

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
        recamaras: cleanNumber(recamaras),
        banos: cleanNumber(banos), 
        medio_bano: cleanNumber(medio_bano),
        estacionamientos: cleanNumber(estacionamientos),
        imagen_url: portadaUrl,
        galeria_urls: galeriaUrls, 
        video_url,
        recorrido_3d_url,
        template_id 
      });

    if (insertError) return fail(500, { error: `Error de Base de Datos: ${insertError.message}` });
    
    // Si hubo fotos fallidas, lo ideal sería notificar al usuario, pero para no romper el flujo
    // de SvelteKit redirect, enviamos a admin. (Podemos añadir notificaciones Toast después).
    if (galeriaFallidas.length > 0) {
      console.warn(`[Inmublia Warning] ${galeriaFallidas.length} fotos fallaron al subirse:`, galeriaFallidas);
    }
    
    throw redirect(303, '/admin');
  }
};
