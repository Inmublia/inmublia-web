import { supabase } from '$lib/supabase';
import { error } from '@sveltejs/kit';

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
