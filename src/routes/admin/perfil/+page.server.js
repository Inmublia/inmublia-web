import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { redirect, fail } from '@sveltejs/kit';

// Usamos el cliente con privilegios de Administrador para saltar bloqueos de RLS al subir fotos
const getSupabaseAdmin = () => {
  return createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
};

export async function load({ locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const supabaseAdmin = getSupabaseAdmin();

  const { data: broker, error } = await supabaseAdmin
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

    const supabaseAdmin = getSupabaseAdmin();
    const formData = await request.formData();
    
    const nombre_comercial = formData.get('nombre_comercial')?.toString().trim();
    const whatsapp = formData.get('whatsapp')?.toString().trim().replace(/[^0-9]/g, '');
    const subdominio = formData.get('subdominio')?.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const webhook_url = formData.get('webhook_url')?.toString().trim() || null;
    const bio = formData.get('bio')?.toString().trim() || null;
    const instagram = formData.get('instagram')?.toString().trim() || null;
    const linkedin = formData.get('linkedin')?.toString().trim() || null;

    if (!nombre_comercial || !whatsapp || !subdominio) {
      // Usamos error 400 para que SvelteKit no censure el mensaje en producción
      return fail(400, { error: 'El nombre, WhatsApp y subdominio son obligatorios.' });
    }

    // LÓGICA DE SUBIDA DE IMAGEN (Ahora con permisos de administrador)
    const avatarFile = formData.get('avatar');
    let avatar_url = undefined; 

    if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin
        .storage
        .from('agencias')
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("Error subiendo foto:", uploadError);
        return fail(400, { error: `Permiso denegado al subir foto: ${uploadError.message}` });
      }

      const { data: { publicUrl } } = supabaseAdmin.storage.from('agencias').getPublicUrl(fileName);
      avatar_url = publicUrl;
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

    const { error: updateError } = await supabaseAdmin
      .from('brokers')
      .update(updatePayload)
      .eq('email', user.email);

    if (updateError) {
      if (updateError.code === '23505') {
        return fail(400, { error: 'Ese enlace personalizado ya está en uso. Elige otro.' });
      }
      return fail(400, { error: `Error guardando datos: ${updateError.message}` });
    }

    return { success: true };
  }
};
