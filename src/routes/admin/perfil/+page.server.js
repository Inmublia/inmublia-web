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
    
    // Extracción de datos
    const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
    const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
    const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;
    const bio = formData.get('bio')?.toString().trim() || null;
    const instagram = formData.get('instagram')?.toString().trim() || null;
    const linkedin = formData.get('linkedin')?.toString().trim() || null;

    if (!nombre_comercial || !whatsapp || !subdominio) {
      console.error("Faltan campos obligatorios");
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // Manejo de la foto
    const avatarFile = formData.get('avatar');
    let avatar_url = undefined; 

    // Verificamos que realmente venga un archivo (a veces llega un objeto File vacío con size 0)
    if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      console.log(`Subiendo foto al bucket 'agencias': ${fileName}`);

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('agencias')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("Error FATAL subiendo foto a Supabase:", uploadError);
        return fail(500, { error: `Error subiendo foto: ${uploadError.message}` });
      }

      const { data: { publicUrl } } = supabase.storage.from('agencias').getPublicUrl(fileName);
      avatar_url = publicUrl;
      console.log("Foto subida exitosamente:", avatar_url);
    } else {
      console.log("No se detectó un archivo de foto nuevo para subir.");
    }

    const updatePayload = {
      nombre_comercial,
      whatsapp,
      subdominio,
      webhook_url,
      bio,
      instagram,
      linkedin
    };

    if (avatar_url) updatePayload.avatar_url = avatar_url;

    console.log("Payload a inyectar en la base de datos:", updatePayload);

    // Actualizamos la base de datos
    const { error: updateError } = await supabase
      .from('brokers')
      .update(updatePayload)
      .eq('email', user.email);

    if (updateError) {
      console.error("Error FATAL actualizando la tabla brokers:", updateError);
      if (updateError.code === '23505') {
        return fail(400, { error: 'Ese enlace personalizado ya está en uso.' });
      }
      return fail(500, { error: `Error interno BD: ${updateError.message}` });
    }

    console.log("¡Perfil actualizado con éxito en backend!");
    return { success: true };
  }
};
