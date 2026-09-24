import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  // 1. Validar que la petición viene de un usuario logueado en su CRM
  if (!locals.user) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // 2. Extraer los datos que envía el frontend del CRM
    const { image_url, caption } = await request.json();

    if (!image_url) throw new Error('Se requiere la URL de la imagen (CDN)');

    // 3. Obtener el ID interno del broker
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', locals.user.id)
      .single();

    if (brokerError || !broker) throw new Error('No se encontró el perfil del broker');

    // 4. Extraer el token de larga duración y el ID de Instagram
    const { data: connection, error: connError } = await locals.supabase
      .from('broker_social_connections')
      .select('platform_user_id, access_token')
      .eq('broker_id', broker.id)
      .eq('platform', 'instagram')
      .eq('status', 'active')
      .single();

    if (connError || !connection) {
      throw new Error('La cuenta de Instagram no está conectada o está inactiva');
    }

    const { platform_user_id, access_token } = connection;

    // ==========================================
    // PASO 1 DE META: CREAR EL CONTENEDOR DE MEDIA
    // ==========================================
    const containerUrl = `https://graph.facebook.com/v20.0/${platform_user_id}/media`;
    const containerParams = new URLSearchParams({
      image_url: image_url, // Debe ser tu dominio cdn.inmuvia.com
      caption: caption || '',
      access_token: access_token
    });

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      body: containerParams
    });
    
    const containerData = await containerRes.json();
    
    if (!containerRes.ok || containerData.error) {
      throw new Error(`Fallo al crear contenedor IG: ${containerData.error?.message || 'Error desconocido'}`);
    }

    const creationId = containerData.id;

    // ==========================================
    // PASO 2 DE META: PUBLICAR EN EL FEED
    // ==========================================
    const publishUrl = `https://graph.facebook.com/v20.0/${platform_user_id}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: access_token
    });

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      body: publishParams
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      throw new Error(`Fallo al publicar en feed IG: ${publishData.error?.message || 'Error desconocido'}`);
    }

    // 5. Retornar éxito absoluto al frontend con el ID del Post
    return json({ 
      success: true, 
      instagram_post_id: publishData.id,
      message: 'Publicación exitosa en Instagram'
    });

  } catch (error) {
    console.error('Error crítico en Endpoint IG Publish:', error);
    return json({ error: error.message }, { status: 500 });
  }
}
