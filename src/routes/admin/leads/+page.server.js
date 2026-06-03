import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { redirect, fail } from '@sveltejs/kit';

// 1. Instanciamos el Cliente de Servidor Confiable (Bypasa el RLS por diseño)
// Esto es el estándar de la industria para rutas de servidor exclusivas (admin).
const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false } // El servidor no debe guardar sesiones
});

export async function load({ locals }) {
  // Verificamos que el hook de SvelteKit validó la cookie de sesión
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // 2. Buscamos al broker (Asegúrate de que el correo con el que entraste EXISTA en tu tabla brokers)
  const { data: broker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (brokerError || !broker) {
    console.error("El correo del usuario logeado no existe en la tabla brokers:", user.email);
    throw redirect(303, '/login?error=broker-not-found');
  }

  // 3. Traemos los prospectos. Como usamos supabaseAdmin, el RLS no nos bloquea la lectura.
  // La seguridad se mantiene porque filtramos estrictamente por el broker.id confirmado.
  const { data: leads } = await supabaseAdmin
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
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('id');
    const nuevoEstado = formData.get('estado');

    if (!leadId || !nuevoEstado) return fail(400, { error: 'Datos incompletos' });

    const { error } = await supabaseAdmin
      .from('leads')
      .update({ estado: nuevoEstado })
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  },

  eliminar: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const leadId = formData.get('id');

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) return fail(500, { error: error.message });
    return { success: true };
  }
};
