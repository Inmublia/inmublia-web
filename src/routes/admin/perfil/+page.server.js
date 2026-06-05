import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  // Traemos los datos actuales del broker para llenar el formulario
  const { data: broker, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error || !broker) {
    throw redirect(303, '/login');
  }

  return { broker };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    // Extracción y limpieza de datos originales
    const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
    const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, ''); // Deja solo números
    const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;

    // Extracción de los nuevos campos de perfil Elite
    const bio = formData.get('bio')?.toString().trim() || null;
    const instagram = formData.get('instagram')?.toString().trim() || null;
    const linkedin = formData.get('linkedin')?.toString().trim() || null;

    if (!nombre_comercial || !whatsapp || !subdominio) {
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // Actualización directa en Supabase
    const { error: updateError } = await supabase
      .from('brokers')
      .update({
        nombre_comercial,
        whatsapp,
        subdominio,
        webhook_url,
        bio,
        instagram,
        linkedin
      })
      .eq('email', user.email);

    if (updateError) {
      // Manejo específico si el subdominio ya está ocupado por otro usuario
      if (updateError.code === '23505') {
        return fail(400, { error: 'Ese enlace personalizado ya está en uso. Elige otro.' });
      }
      return fail(500, { error: `Error interno al actualizar el perfil: ${updateError.message}` });
    }

    return { success: true };
  }
};
