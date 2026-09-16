// src/routes/admin/open-house/nueva/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

// 🛡️ FUNCIÓN DE SANITIZACIÓN PARA PREVENIR PROMPT INJECTION
const sanitizar = (str, maxLen = 100) => {
  if (!str) return '';
  return String(str)
    .replace(/[<>]/g, '')           // Elimina HTML básico
    .replace(/\n|\r/g, ' ')         // Elimina saltos que rompan el prompt
    .substring(0, maxLen)           // Limita longitud
    .trim();
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // Búsqueda estricta por ID de Autenticación usando el cliente seguro
  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();

  if (brokerError || !broker) {
    console.error("No se encontró broker asociado al token:", user.id);
    throw redirect(303, '/login?error=broker-not-found');
  }

  // Obtenemos solo los títulos y IDs para el selector
  const { data: propiedades } = await locals.supabase
    .from('propiedades')
    .select('id, titulo, operacion')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    propiedades: propiedades || [],
    creditos_ia: broker.ia_creditos_disponibles ?? 15,
    plan_suscripcion: (broker.plan_suscripcion || 'basico').toLowerCase().trim()
  };
}

export const actions = {
  // 🤖 ACTION PARA LA INTELIGENCIA ARTIFICIAL (Basado en la arquitectura de 'Nueva Propiedad')
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: 'Falla Crítica: El Binding "AI" no está conectado.' });
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
    const propiedad_id = sanitizar(formData.get('propiedad_id'), 100);
    const tonoSeleccionado = sanitizar(formData.get('tono'), 50) || 'Premium / Elegante';

    if (!propiedad_id) return fail(400, { error: 'Debes seleccionar una propiedad primero.' });

    // Extraer los datos de la propiedad para alimentar a la IA
    let propInfo = { tipo: 'Inmueble', operacion: 'Venta', precio: 'No especificado', ubicacion: 'Exclusiva', detalles: '' };
    
    if (propiedad_id !== 'test') {
      const { data: propData } = await locals.supabase
        .from('propiedades')
        .select('*')
        .eq('id', propiedad_id)
        .eq('broker_id', broker.id)
        .single();
        
      if (propData) {
        propInfo = {
          tipo: propData.tipo,
          operacion: propData.operacion,
          precio: `$${new Intl.NumberFormat('es-MX').format(propData.precio)} MXN`,
          ubicacion: propData.ubicacion,
          detalles: `${propData.recamaras} Rec. | ${propData.banos} Baños | ${propData.estacionamientos} Autos`
        };
      }
    }

    const guiasTono = {
      'Premium / Elegante': 'Sofisticado, aspiracional y enfocado en exclusividad. Lenguaje de alto valor.',
      'Familiar / Cálido': 'Cercano, seguro y emotivo. Enfocado en crear memorias y tranquilidad.',
      'Analítico / ROI': 'Estratégico, financiero y directo. Enfocado en plusvalía y diseño inteligente.'
    };
    
    const instruccionTono = guiasTono[tonoSeleccionado] || guiasTono['Premium / Elegante'];

    const systemPrompt = `<role>Eres el Director Creativo de una agencia inmobiliaria de lujo en México. Estás organizando un OPEN HOUSE (evento físico).</role>
<rules>
1. IDIOMA: Español de México. Redacción impecable y persuasiva que invite a la ASISTENCIA.
2. ESTRUCTURA: Transforma los datos fríos en una invitación a vivir la experiencia presencial.
3. FORMATO: Responde EXCLUSIVAMENTE con un objeto JSON válido.
4. SALTOS DE LÍNEA: PROHIBIDO usar Enter. Usa la etiqueta literal <br><br> para separar párrafos.
5. COMILLAS: Usa SOLO comillas simples (') dentro de las descripciones.
6. TONO: ${instruccionTono}
</rules>`;

    const userPrompt = `Genera un copy comercial irresistible para la invitación a un OPEN HOUSE de esta propiedad, en JSON:
<data>
Operación: ${propInfo.operacion} | Tipo: ${propInfo.tipo} | Ubicación: ${propInfo.ubicacion} | Precio: ${propInfo.precio}
Detalles: ${propInfo.detalles}
</data>

<json_format>
{
  "titulo": "[Título del evento, ej: Open House Exclusivo: Residencia de Autor]",
  "descripcion": "[Párrafo 1: Gancho emocional sobre descubrir la propiedad.<br><br>Párrafo 2: Lo que experimentarán durante el recorrido.<br><br>Párrafo 3: Sentido de urgencia y llamado a asegurar su lugar hoy mismo.]",
  "whatsapp": "[Mensaje persuasivo para enviar por WhatsApp invitando al Open House, usando 2 o 3 emojis]"
}
</json_format>`;

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

        let rawResponse = typeof result === 'string' ? result : (result.response ? String(result.response) : JSON.stringify(result));

        let cleanText = rawResponse.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();

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
        jsonString = jsonString.replace(/\n/g, ' ').replace(/\r/g, ''); 

        parsedContent = JSON.parse(jsonString);
        break; 

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

    const { data: rpcData, error: rpcError } = await locals.supabase.rpc('consumir_credito_ia', {
      p_user_id: user.id
    });

    if (rpcError || !rpcData || rpcData.length === 0) {
      return fail(403, { error: 'Sin créditos de IA disponibles para finalizar la acción.' });
    }

    let descripcionLimpia = (parsedContent.descripcion || 'Sin descripción').replace(/<br><br>/g, '\n\n');

    return {
      titulo: parsedContent.titulo || parsedContent.Titulo || 'Open House Exclusivo',
      descripcion: descripcionLimpia,
      whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te invito a nuestro Open House...'
    };
  },

  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(401, { error: 'Broker no encontrado' });

    const formData = await request.formData();
    
    const propiedad_id = formData.get('propiedad_id');
    const title = formData.get('title');
    const event_date = formData.get('date');
    const time_start = formData.get('timeStart');
    const time_end = formData.get('timeEnd');
    const max_capacity = parseInt(formData.get('maxCapacity')) || 15;
    const benefit = formData.get('benefit');
    const description = formData.get('description');

    if (!propiedad_id || !title || !event_date || !time_start || !time_end || !description) {
      return fail(400, { error: 'Faltan campos obligatorios' });
    }

    const { data: nuevoEvento, error: insertError } = await locals.supabase
      .from('open_houses')
      .insert([
        {
          broker_id: broker.id,
          propiedad_id: propiedad_id === 'test' ? null : propiedad_id, 
          title,
          event_date,
          time_start,
          time_end,
          max_capacity,
          benefit,
          description
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Error al crear Open House:", insertError);
      return fail(500, { error: 'Error en la base de datos al guardar el evento.' });
    }

    throw redirect(303, `/admin/open-house/${nuevoEvento.id}`);
  }
};
