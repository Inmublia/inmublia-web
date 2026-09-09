import { supabase } from '$lib/supabase';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, url }) {
  const { slug } = params;
  const templateForzado = url.searchParams.get('template')?.toString().trim() || null;
  const isSandbox = url.searchParams.get('sandbox') === 'true';

  // 🔥 INTERCEPCIÓN QUIRÚRGICA Y SANDBOX
  if (slug === 'propiedad-demo' || isSandbox) {
    return {
      propiedad: {
        id: 'demo-id',
        titulo: 'Residencia Signature de Alto Diseño',
        descripcion: 'Esta es una propiedad de demostración generada para previsualizar los acabados del catálogo de diseños de Inmublia. Arquitectura contemporánea y espacios optimizados.',
        precio: 18500000,
        moneda: 'MXN',
        operacion: 'Venta',
        ubicacion: 'Puerta de Hierro, Zapopan',
        recamaras: 4,
        banos: 4,
        medio_bano: 1,
        estacionamientos: 4,
        m2_construccion: 450,
        m2_terreno: 500,
        antiguedad: 'Nuevo',
        imagen_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000',
        galeria_urls: [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1600607687931-cece5ce21460?auto=format&fit=crop&q=80&w=1200',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80&w=1200'
        ],
        video_url: null, // Apagado por seguridad en Sandbox (Ahorra RAM)
        recorrido_3d_url: null, // Apagado por seguridad en Sandbox
        estatus: 'Activa',
        tipo_operacion: 'Venta',
        tipo_inmueble: 'Casa'
      },
      broker: {
        id: 'demo-broker-id',
        nombre_comercial: 'Inmublia Premium Properties',
        subdominio: 'demo',
        avatar_url: 'https://ui-avatars.com/api/?name=Premium&background=0f172a&color=fff',
        whatsapp: '523312345678', // Habilita el dibujo del botón WhatsApp
        pixel_fb: null, // Píxeles en null para garantizar que no haya métricas fantasma
        pixel_google: null,
        pixel_tiktok: null
      },
      templateForzado
    };
  }

  // 1. Buscamos la propiedad exacta por su slug amigable
  const { data: propiedad, error: propError } = await supabase
    .from('propiedades')
    .select('*')
    .eq('slug', slug)
    .single();

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

  return { propiedad, broker, templateForzado };
}

export const actions = {
  contacto: async ({ request }) => {
    const formData = await request.formData();
    
    const nombre = formData.get('nombre')?.toString().trim();
    const correo = formData.get('correo')?.toString().trim();
    const telefono = formData.get('telefono')?.toString().trim();
    const propiedad_id = formData.get('propiedad_id');
    const broker_id = formData.get('broker_id');
    const propiedad_titulo = formData.get('propiedad_titulo');
    const origen_lead = formData.get('origen_lead')?.toString().trim() || 'Tráfico Directo';

    if (!nombre || !correo || !telefono || !propiedad_id || !broker_id) {
      return fail(400, { error: 'Por favor, llena todos los campos obligatorios del formulario.' });
    }

    const leadData = {
      nombre, 
      correo, 
      telefono, 
      propiedad_id, 
      broker_id,
      origen: origen_lead,
      estado: 'nuevo',
      creado_en: new Date().toISOString()
    };

    const { error: insertError } = await supabase.from('leads').insert([leadData]);

    if (insertError) {
      return fail(500, { error: `Error del servidor al registrar el prospecto: ${insertError.message}` });
    }

    return { success: true, message: 'La información ha sido enviada con éxito.' };
  }
};
