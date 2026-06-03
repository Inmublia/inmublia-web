import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // 1. Obtener el perfil del broker
  const { data: broker } = await supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (!broker) throw redirect(303, '/login');

  // 2. Traer todos los prospectos de este broker, ordenados por los más recientes
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('broker_id', broker.id)
    .order('creado_en', { ascending: false });

  return {
    broker,
    leads: leads || []
  };
}

export const actions = {
  // Acción que recibe el nuevo estado al arrastrar y soltar
  actualizar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('id');
    const nuevoEstado = formData.get('estado');

    if (!leadId || !nuevoEstado) return fail(400, { error: 'Datos incompletos' });

    const { error } = await supabase
      .from('leads')
      .update({ estado: nuevoEstado })
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  // Acción para limpiar prospectos basura
  eliminar: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('id');

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  }
};
