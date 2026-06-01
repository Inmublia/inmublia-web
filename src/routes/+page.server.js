import { supabase } from '$lib/supabase';

export async function load() {
  const { data, error } = await supabase
    .from('propiedades')
    .select('*');

  if (error) {
    console.error('Error de Supabase:', error.message);
    return { propiedades: [] };
  }

  return {
    propiedades: data
  };
}
