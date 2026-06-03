import { supabase } from '$lib/supabase';
import { error, fail } from '@sveltejs/kit';

export async function load({ params }) {
  const { slug } = params;

  // 1. Buscamos la propiedad exacta por su slug amigable
  const { data: propiedad, error: propError } = await supabase
    .from('propiedades')
    .select('*')
    .eq('slug', slug)
    .single();

  // Si la propiedad no existe o hubo un error, mandamos un 404 elegante
  if (propError || !propiedad) {
    throw error(404, {
      message: 'La propiedad que buscas no está disponible o ha sido removida.'
    });
  }

  // 2. Extraemos el perfil completo del broker dueño de esta propiedad
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', propiedad.broker_id)
    .single();

  if (brokerError || !broker) {
    throw error(404, {
      message: 'La agencia encargada de esta propiedad no se encuentra activa.'
    });
  }

  // Devolvemos el paquete de datos limpio al lado visual
  return {
    propiedad,
    broker
  };
}

export const actions = {
  contacto: async ({ request }) => {
    const formData = await request.formData();
    
    const nombre = formData.get('nombre');
    const correo = formData.get('correo');
    const telefono = formData.get('telefono');
    const propiedad_id = formData.get('propiedad_id');
    const broker_id = formData.get('broker_id');
    const propiedad_titulo = formData.get('propiedad_titulo');

    // Validación estricta de campos obligatorios (ahora incluye correo)
    if (!nombre || !correo || !telefono || !propiedad_id || !broker_id) {
      return fail(400, { error: 'Por favor, llena todos los campos obligatorios del formulario.' });
    }

    const leadData = {
      nombre,
      correo,
      telefono,
      propiedad_id,
      broker_id,
      estado: 'nuevo', // Estado inicial por defecto para el Tablero Kanban
      creado_en: new Date().toISOString()
    };

    // 1. Registro nativo en el CRM-Lite (Tabla de leads)
    const { error: insertError } = await supabase
      .from('leads')
      .insert([leadData]);

    if (insertError) {
      return fail(500, { error: `Error del servidor al registrar el prospecto: ${insertError.message}` });
    }

    // 2. Consulta de configuración para el Webhook Universal (Plan Elite)
    const { data: brokerConfig } = await supabase
      .from('brokers')
      .select('webhook_url')
      .eq('id', broker_id)
      .single();

    // 3. El Puente de Oro: Disparo asíncrono directo a plataformas externas (Zapier, HubSpot, Clientify, etc.)
    if (brokerConfig && brokerConfig.webhook_url) {
      fetch(brokerConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuente: "Inmublia SaaS",
          evento: "nuevo_prospecto",
          propiedad_interes: propiedad_titulo,
          prospecto: {
            nombre,
            correo,
            telefono,
            registro: leadData.creado_en
          }
        })
      }).catch(err => console.error("Error silencioso al disparar el webhook universal:", err));
    }

    return { success: true, message: 'La información ha sido enviada con éxito.' };
  }
};
