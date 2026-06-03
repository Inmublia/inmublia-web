import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
  // 1. Extraemos tanto al usuario como al cliente autenticado de la petición
  const { user, supabase } = locals; 
  if (!user || !supabase) throw redirect(303, '/login');

  // 2. Obtener el perfil del broker
  const { data: broker, error: brokerError } = await supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // 3. Traer todos los prospectos. Ahora Supabase recibe el token y el RLS te permite leer.
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
  actualizar: async ({ request, locals }) => {
    const { user, supabase } = locals;
    if (!user || !supabase) return fail(401, { error: 'No autorizado' });

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

  eliminar: async ({ request, locals }) => {
    const { user, supabase } = locals;
    if (!user || !supabase) return fail(401, { error: 'No autorizado' });

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
