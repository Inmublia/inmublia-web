import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

const getSupabaseAdmin = () => {
  return createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

export async function load({ params }) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Traemos el Open House cruzando datos de propiedad y broker en una sola consulta
  const { data: oh, error: ohError } = await supabaseAdmin
    .from('open_houses')
    .select('*, propiedades(*), brokers(*)')
    .eq('id', params.id)
    .single();

  if (ohError || !oh) {
    throw error(404, 'El Open House solicitado no existe.');
  }

  // 2. Traemos los asistentes ya registrados para calcular disponibilidad real
  const { data: attendees } = await supabaseAdmin
    .from('open_house_attendees')
    .select('*')
    .eq('open_house_id', params.id)
    .order('creado_en', { ascending: true });

  // 3. Mapeamos la respuesta relacional de la BD a la estructura exacta del componente
  return {
    attendeesDb: attendees || [],
    event: {
      id: oh.id,
      title: oh.title,
      address: oh.propiedades?.ubicacion || 'Dirección no especificada',
      city: oh.propiedades?.ubicacion?.split(',')[1]?.trim() || 'Jalisco',
      price: oh.propiedades?.precio || 0,
      bedrooms: oh.propiedades?.recamaras || 0,
      bathrooms: oh.propiedades?.banos || 0,
      sqm: oh.propiedades?.m2_construccion || 0,
      date: oh.event_date,
      timeStart: oh.time_start,
      timeEnd: oh.time_end,
      maxCapacity: oh.max_capacity,
      benefit: oh.benefit,
      description: oh.description,
      // Usamos la portada y agregamos la galería secundaria si existe
      photos: oh.propiedades?.galeria_urls?.length 
        ? [oh.propiedades.imagen_url, ...oh.propiedades.galeria_urls] 
        : [oh.propiedades?.imagen_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
      agent: {
        name: oh.brokers?.nombre_comercial || 'Asesor Inmobiliario',
        phone: oh.brokers?.whatsapp || '',
        specialty: 'Asesor Certificado · AMPI',
        rating: 4.9,
        reviews: 24,
        avatar: oh.brokers?.nombre_comercial?.slice(0, 2).toUpperCase() || 'AI',
        whatsapp: oh.brokers?.whatsapp || '',
        url: `${oh.brokers?.subdominio}.inmublia.com`
      }
    }
  };
}

export const actions = {
  rsvp: async ({ request, params }) => {
    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();

    const name = formData.get('name');
    const phone = formData.get('phone');
    const intent = formData.get('intent');
    const budget = formData.get('budget');
    const status = formData.get('status') || 'confirmed'; // 'confirmed' o 'waitlist'

    if (!name || !phone || !intent) {
      return fail(400, { error: 'Campos requeridos incompletos.' });
    }

    // Insertamos directo al asistente en Supabase vinculado al evento
    const { error: insertError } = await supabaseAdmin
      .from('open_house_attendees')
      .insert([
        {
          open_house_id: params.id,
          name,
          phone,
          intent,
          budget,
          status
        }
      ]);

    if (insertError) {
      console.error(insertError);
      return fail(500, { error: 'Error al registrar tus datos en el servidor.' });
    }

    return { success: true };
  }
};
