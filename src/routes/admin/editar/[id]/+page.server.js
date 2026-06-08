import { redirect, fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { id } = params;
  
  // USAMOS locals.supabase (aislado por petición) en lugar del cliente global
  const { data: propiedad } = await locals.supabase
    .from('propiedades')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!propiedad) throw redirect(303, '/admin');
  return { propiedad };
}

export const actions = {
  actualizar: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const id = params.id;

    // Limpiamos los números para evitar NaN en la base de datos
    const parseNum = (val) => val ? parseFloat(val) : 0;
    const parseIntNum = (val) => val ? parseInt(val) : 0;

    // Extraemos los enlaces multimedia
    const video_url = formData.get('video_url') || null;
    const recorrido_3d_url = formData.get('recorrido_3d_url') || null; // 🔥 NUEVO: Captura de Matterport

    const actualizaciones = {
      titulo: formData.get('titulo'),
      precio: parseNum(formData.get('precio')),
      descripcion: formData.get('descripcion'),
      operacion: formData.get('operacion'),
      tipo: formData.get('tipo'),
      destacada: formData.get('destacada') === 'on',
      m2_terreno: parseNum(formData.get('m2_terreno')),
      m2_construccion: parseNum(formData.get('m2_construccion')),
      recamaras: parseIntNum(formData.get('recamaras')),
      banos: parseNum(formData.get('banos')),
      medio_bano: parseIntNum(formData.get('medio_bano')),
      estacionamientos: parseIntNum(formData.get('estacionamientos')),
      ubicacion: formData.get('ubicacion') || 'Ubicación Privada',
      video_url: video_url,
      recorrido_3d_url: recorrido_3d_url // 🔥 NUEVO: Envío a la base de datos
    };

    // Validación segura de identidad del asesor
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!broker) return fail(403, { error: 'Perfil de asesor no encontrado.' });

    // ==========================================
    // PROCESAMIENTO DE IMÁGENES EN STORAGE SEGURO
    // ==========================================
    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria');

    // 1. Nueva Foto Principal
    if (imagen && imagen.size > 0) {
      const fileExt = imagen.name.split('.').pop();
      const fileName = `${broker.id}/${Date.now()}-main-edit.${fileExt}`;
      const buffer = await imagen.arrayBuffer();
      
      const { error: uploadError } = await locals.supabase.storage
        .from('propiedades')
        .upload(fileName, buffer, { contentType: imagen.type });
      
      if (!uploadError) {
        const { data: { publicUrl } } = locals.supabase.storage
          .from('propiedades')
          .getPublicUrl(fileName);
        actualizaciones.imagen_url = publicUrl;
      }
    }

    // 2. Nueva Galería Múltiple
    if (galeriaArchivos.length > 0 && galeriaArchivos[0].size > 0) {
      let galeriaUrls = [];
      for (const file of galeriaArchivos) {
        if (file && file.size > 0) {
          const ext = file.name.split('.').pop();
          const gName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
          const gBuffer = await file.arrayBuffer();
          
          const { error: gError } = await locals.supabase.storage
            .from('propiedades')
            .upload(gName, gBuffer, { contentType: file.type });
          
          if (!gError) {
            const { data: { publicUrl } } = locals.supabase.storage
              .from('propiedades')
              .getPublicUrl(gName);
            galeriaUrls.push(publicUrl);
          }
        }
      }
      if (galeriaUrls.length > 0) {
        actualizaciones.galeria_urls = galeriaUrls;
      }
    }

    // ==========================================
    // INSERCIÓN SEGURA (CANDADO DE BROKER ID)
    // ==========================================
    const { data: updatedData, error } = await locals.supabase
      .from('propiedades')
      .update(actualizaciones)
      .eq('id', id)
      .eq('broker_id', broker.id) // Seguridad: Verifica que la propiedad te pertenezca
      .select();

    if (error) return fail(500, { error: `Error SQL al actualizar: ${error.message}` });
    if (!updatedData || updatedData.length === 0) return fail(500, { error: 'No se pudo actualizar. Verifica que la propiedad exista.' });
    
    throw redirect(303, '/admin');
  }
};
