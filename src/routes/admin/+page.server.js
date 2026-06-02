import { supabase } from '$lib/supabase';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await supabase.from('brokers').select('*').eq('email', user.email).single();
  if (!broker) return { broker: null, propiedades: [] };

  const { data: propiedades } = await supabase.from('propiedades').select('*').eq('broker_id', broker.id).order('creado_en', { ascending: false });

  return { broker, propiedades: propiedades || [] };
}

export const actions = {
  eliminar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');
    
    const formData = await request.formData();
    const id = formData.get('id');

    // Validamos que el broker sea el dueño antes de borrar
    const { data: broker } = await supabase.from('brokers').select('id').eq('email', user.email).single();
    
    if (broker && id) {
      const { error } = await supabase.from('propiedades').delete().match({ id: id, broker_id: broker.id });
      if (error) console.error("Error al eliminar:", error);
    }
  }
};
