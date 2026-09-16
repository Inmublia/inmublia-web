// src/routes/admin/open-house/nueva/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

const sanitizar = (str, maxLen = 150) => {
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
  // 🤖 ACCIÓN NOMBRADA PARA LA IA
  generarPromptIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(400, { error: 'Falla Crítica: El Binding "AI" no está conectado en el servidor.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers').select('id, ia_creditos_disponibles').eq('auth_user_id', user.id).single();

    if (!broker || broker.ia_creditos_disponibles <= 0) return fail(400, { error: 'Has agotado tus créditos de IA.' });

    const formData = await request.formData();
    const propiedad_id = sanitizar(formData.get('propiedad_id'), 100);
    const tonoSeleccionado = sanitizar(formData.get('tono'), 50) || 'Gala / Exclusiva';
    
    // 🚀 CAPTURA DE DATOS REALES DEL EVENTO PARA EVITAR ALUCINACIONES
    const event_date = sanitizar(formData.get('date'), 50);
    const time_start = sanitizar(formData.get('timeStart'), 20);
    const time_end = sanitizar(formData.get('timeEnd'), 20);
    const max_capacity = sanitizar(formData.get('maxCapacity'), 10);
    const benefit = sanitizar(formData.get('benefit'), 100);

    if (!propiedad_id) return fail(400, { error: 'Selecciona una propiedad base del menú primero.' });

    let propInfo = { tipo: 'Propiedad', operacion: 'Venta', precio: 'Precio a consultar', ubicacion: 'Zona exclusiva', detalles: 'Propiedad de alto valor' };
    
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
            precio: propData.precio ? `$${new Intl.NumberFormat('es-MX').format(propData.precio)} MXN` : 'A consultar',
            ubicacion: propData.ubicacion || 'Zona Exclusiva',
            detalles: `${propData.recamaras || 0} Rec. | ${propData.banos || 0} Baños | ${propData.estacionamientos || 0} Autos`
          };
        }
      } catch (err) {
        return fail(400, { error: `Error conectando con la BD de Propiedades: ${err.message}` });
      }
    }

    const guiasTono = {
      'Gala / Exclusiva': 'Sofisticado, aspiracional y enfocado en la exclusividad absoluta.',
      'Casual / Familiar': 'Cercano, cálido y seguro. Enfocado en crear memorias familiares.',
      'Business / Inversión': 'Estratégico, financiero y directo. Enfocado en plusvalía y retorno.'
    };
    
    const systemPrompt = `<role>Eres el Director Creativo de una agencia inmobiliaria de lujo. Estás invitando a un OPEN HOUSE (evento físico presencial).</role>
<rules>
1. IDIOMA: Español de México. Genera FOMO (urgencia por asistir al evento).
2. FORMATO: Responde SOLO con un objeto JSON válido. Cero texto extra.
3. SALTOS: Usa la etiqueta <br><br> para separar párrafos. NO uses la tecla Enter.
4. COMILLAS: Usa SOLO comillas simples (') en tus descripciones.
5. NO ALUCINES DATOS: Usa estrictamente los datos del evento proporcionados.
6. TONO: ${guiasTono[tonoSeleccionado] || guiasTono['Gala / Exclusiva']}
</rules>`;

    const userPrompt = `Redacta copy persuasivo en JSON para invitar a este Open House.
<datos_propiedad>
Operación: ${propInfo.operacion} | Tipo: ${propInfo.tipo} | Ubicación: ${propInfo.ubicacion} | Precio: ${propInfo.precio}
Detalles: ${propInfo.detalles}
</datos_propiedad>

<datos_evento>
Fecha: ${event_date || '[Fecha por definir]'}
Horario: ${time_start || '[Hora de inicio]'} a ${time_end || '[Hora de cierre]'}
Aforo Máximo: ${max_capacity || 'Cupo limitado'} personas
Incentivo Especial: ${benefit || 'Recorrido exclusivo'}
</datos_evento>

<json_format>
{
  "titulo": "[Título del evento, max 6 palabras]",
  "descripcion": "[Párrafo 1: Gancho sobre el evento y la propiedad.<br><br>Párrafo 2: La experiencia de recorrerla y mención del incentivo si lo hay.<br><br>Párrafo 3: Llamado urgente a asistir con los datos exactos de fecha, horario y aforo.]",
  "whatsapp": "[Mensaje persuasivo para WhatsApp invitando a asistir. Incluye la fecha y horario exacto. Usa 2 emojis]"
}
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

        if (!result) throw new Error("API devolvió una respuesta vacía.");
        
        let rawResponse = typeof result === 'string' ? result : (result.response ? String(result.response) : JSON.stringify(result));
        let cleanText = rawResponse.replace(/^```json/gi, '').replace(/^
