// src/routes/admin/open-house/nueva/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

const sanitizar = (str, maxLen = 100) => {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '').replace(/\n|\r/g, ' ').substring(0, maxLen).trim();
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker, error: brokerError } = await locals.supabase
    .from('brokers').select('*').eq('auth_user_id', user.id).single();

  if (brokerError || !broker) throw redirect(303, '/login?error=broker-not-found');

  const { data: propiedades } = await locals.supabase
    .from('propiedades').select('id, titulo, operacion')
    .eq('broker_id', broker.id).order('creado_en', { ascending: false });

  return {
    broker,
    propiedades: propiedades || [],
    creditos_ia: broker.ia_creditos_disponibles ?? 15,
    plan_suscripcion: (broker.plan_suscripcion || 'basico').toLowerCase().trim()
  };
}

export const actions = {
  generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: 'Falla Crítica: El motor de IA no está conectado en el servidor.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers').select('id, ia_creditos_disponibles').eq('auth_user_id', user.id).single();

    if (!broker || broker.ia_creditos_disponibles <= 0) return fail(403, { error: 'Has agotado tus créditos.' });

    const formData = await request.formData();
    const propiedad_id = sanitizar(formData.get('propiedad_id'), 100);
    const tonoSeleccionado = sanitizar(formData.get('tono'), 50) || 'Premium / Elegante';

    if (!propiedad_id) return fail(400, { error: 'Selecciona una propiedad base primero.' });

    let propInfo = { tipo: 'Propiedad', operacion: 'Venta', precio: 'A consultar', ubicacion: 'Zona exclusiva', detalles: 'De lujo' };
    
    if (propiedad_id !== 'test') {
      try {
        const { data: propData, error: propError } = await locals.supabase
          .from('propiedades')
          .select('tipo, operacion, precio, ubicacion, recamaras, banos, estacionamientos')
          .eq('id', propiedad_id)
          .eq('broker_id', broker.id)
          .single();
          
        if (propError) throw propError;
        if (propData) {
          propInfo = {
            tipo: propData.tipo || 'Propiedad',
            operacion: propData.operacion || 'Venta',
            precio: propData.precio ? `$${new Intl.NumberFormat('es-MX').format(propData.precio)} MXN` : 'Precio a consultar',
            ubicacion: propData.ubicacion || 'Zona exclusiva',
            detalles: `${propData.recamaras || 0} Rec. | ${propData.banos || 0} Baños | ${propData.estacionamientos || 0} Autos`
          };
        }
      } catch (err) {
        return fail(500, { error: `No se pudo leer la base de datos: ${err.message}` });
      }
    }

    const guiasTono = {
      'Premium / Elegante': 'Sofisticado, aspiracional y exclusivo. Lenguaje de alto valor.',
      'Familiar / Cálido': 'Cercano, seguro y emotivo. Enfocado en crear memorias.',
      'Analítico / ROI': 'Estratégico, financiero y directo. Enfocado en plusvalía.'
    };
    
    const systemPrompt = `<role>Eres el Director Creativo de una agencia inmobiliaria en México. Creas invitaciones para un OPEN HOUSE (evento físico).</role>
<rules>
1. IDIOMA: Español de México. Genera FOMO (miedo a perderse el evento).
2. FORMATO: Responde SOLO con JSON válido.
3. SALTOS: Usa <br><br> para separar párrafos.
4. COMILLAS: Usa SOLO comillas simples (').
5. TONO: ${guiasTono[tonoSeleccionado] || guiasTono['Premium / Elegante']}
</rules>`;

    const userPrompt = `Genera copy comercial en JSON para invitación a Open House:
<data>
Operación: ${propInfo.operacion} | Tipo: ${propInfo.tipo} | Ubicación: ${propInfo.ubicacion} | Precio: ${propInfo.precio}
Detalles: ${propInfo.detalles}
</data>
<json_format>
{ "titulo": "[Título max 6 palabras]", "descripcion": "[Párrafo 1.<br><br>Párrafo 2.<br><br>Párrafo 3.]", "whatsapp": "[Mensaje corto WhatsApp con 2 emojis]" }
</json_format>`;

    const modelosSoportados = ['@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/meta/llama-3.2-3b-instruct'];
    let parsedContent = null;
    let errorLog = [];

    for (const modelo of modelosSoportados) {
      try {
        const result = await platform.env.AI.run(modelo, {
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          max_tokens: 800
        });

        if (!result) throw new Error("Vació");
        let rawResponse = typeof result === 'string' ? result : (result.response ? String(result.response) : JSON.stringify(result));
        let cleanText = rawResponse.replace(/^```json/gi, '').replace(/^```/gi, '').replace(/```$/gi, '').trim();

        if (!cleanText.startsWith('{') && cleanText.includes('"titulo"')) cleanText = '{' + cleanText;
        if (!cleanText.endsWith('}')) cleanText += '}';

        let firstBrace = cleanText.indexOf('{');
        let lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) throw new Error("Truncado");

        parsedContent = JSON.parse(cleanText.substring(firstBrace, lastBrace + 1).replace(/\n|\r/g, ' '));
        break; 
      } catch (e) {
        errorLog.push(`${modelo.split('/').pop()}: ${e.message}`);
      }
    }

    if (!parsedContent) return fail(500, { error: `Modelos colapsados: ${errorLog.join(' | ')}` });

    const { data: rpcData, error: rpcError } = await locals.supabase.rpc('consumir_credito_ia', { p_user_id: user.id });
    if (rpcError || !rpcData || rpcData.length === 0) return fail(403, { error: 'Fallo al procesar crédito.' });

    return {
      titulo: parsedContent.titulo || parsedContent.Titulo || 'Open House Exclusivo',
      descripcion: (parsedContent.descripcion || 'Descubre esta propiedad...').replace(/<br><br>/g, '\n\n'),
      whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || '¡Te invito a conocerla! 🏡✨'
    };
  },

  default: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
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
      .insert([{
          broker_id: broker.id,
          propiedad_id: propiedad_id === 'test' ? null : propiedad_id, 
          title, event_date, time_start, time_end, max_capacity, benefit, description
      }])
      .select().single();

    if (insertError) return fail(500, { error: 'Error BD al guardar evento.' });
    throw redirect(303, `/admin/open-house/${nuevoEvento.id}`);
  }
};
