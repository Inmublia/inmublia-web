import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { data: broker, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error || !broker) throw redirect(303, '/login');

  return { broker };
}

export const actions = {
  updateProfile: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
    const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
    const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;
    const bio = formData.get('bio')?.toString().trim() || null;
    const instagram = formData.get('instagram')?.toString().trim() || null;
    const linkedin = formData.get('linkedin')?.toString().trim() || null;

    if (!nombre_comercial || !whatsapp || !subdominio) {
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // LÓGICA DE SUBIDA DE IMAGEN
    const avatarFile = formData.get('avatar');
    let avatar_url = undefined; // Si es undefined, Supabase no sobreescribe lo que ya existe

    // Solo procesamos si el usuario de verdad subió un archivo nuevo
    if (avatarFile && avatarFile.size > 0) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      // Subimos la imagen al bucket 'agencias' que creaste en el PASO 1
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('agencias')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("Error subiendo foto:", uploadError);
        return fail(500, { error: 'Error al subir la imagen al servidor.' });
      }

      // Generamos la URL pública
      const { data: { publicUrl } } = supabase.storage.from('agencias').getPublicUrl(fileName);
      avatar_url = publicUrl;
    }

    // Preparamos el objeto a actualizar en la BD
    const updatePayload = {
      nombre_comercial,
      whatsapp,
      subdominio,
      webhook_url,
      bio,
      instagram,
      linkedin
    };

    // Solo inyectamos la URL del avatar si hubo foto nueva
    if (avatar_url) updatePayload.avatar_url = avatar_url;

    // Actualización en Supabase
    const { error: updateError } = await supabase
      .from('brokers')
      .update(updatePayload)
      .eq('email', user.email);

    if (updateError) {
      if (updateError.code === '23505') {
        return fail(400, { error: 'Ese enlace personalizado ya está en uso. Elige otro.' });
      }
      return fail(500, { error: `Error interno: ${updateError.message}` });
    }

    return { success: true };
  }
};
