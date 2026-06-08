import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  crear: async ({ request, locals }) => {
    // 1. Verificación de identidad a través de la sesión de Edge SSR
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    // 2. Extraemos datos generales
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const descripcion = formData.get('descripcion');
    const operacion = formData.get('operacion');
    const tipo = formData.get('tipo');
    const destacada = formData.get('destacada') === 'on';
    
    // Visibilidad y estatus
    const is_oculta = formData.get('is_oculta') === 'on';
    const estatus = is_oculta ? 'Pre-Mercado' : 'Activa';
    
    // Ficha técnica
    const m2_terreno = formData.get('m2_terreno') || 0;
    const m2_construccion = formData.get('m2_construccion') || 0;
    const recamaras = formData.get('recamaras') || 0;
    const banos = formData.get('banos') || 0;
    const medio_bano = formData.get('medio_bano') || 0;
    const estacionamientos = formData.get('estacionamientos') || 0;
    const ubicacion = formData.get('ubicacion') || 'Guadalajara, Jalisco';
    
    // Enlaces multimedia
    const video_url = formData.get('video_url') || null;
    const recorrido_3d_url = formData.get('recorrido_3d_url') || null; // 🔥 NUEVO: Recorrido 3D

    // Imágenes
    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria'); // Array de archivos múltiples

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Faltan campos obligatorios o la foto de portada.' });
    }

    // Buscamos el ID real del broker
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!broker) return fail(400, { error: 'Perfil de agencia no encontrado.' });

    // 3. SUBIR PORTADA
    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-main.${fileExt}`;
    const buffer = await imagen.arrayBuffer();
    
    const { error: uploadError } = await locals.supabase.storage
      .from('propiedades')
      .upload(fileName, buffer, { contentType: imagen.type });
    
    if (uploadError) return fail(500, { error: `Error en portada: ${uploadError.message}` });
    
    const { data: { publicUrl: portadaUrl } } = locals.supabase.storage
      .from('propiedades')
      .getPublicUrl(fileName);

    // 4. SUBIR GALERÍA MÚLTIPLE (Bucle)
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

    const slug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // 5. INSERTAR TODO A LA BASE DE DATOS
    const cleanNumber = (val) => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[^0-9.]/g, ''); 
        return parseFloat(cleaned) || 0;
    };

    const { error: insertError } = await locals.supabase
      .from('propiedades')
      .insert({
        broker_id: broker.id,
        titulo, 
        slug, 
        operacion, 
        tipo, 
        destacada, 
        descripcion, 
        ubicacion,
        estatus,
        precio: cleanNumber(precio), 
        m2_terreno: cleanNumber(m2_terreno), 
        m2_construccion: cleanNumber(m2_construccion), 
        recamaras: parseInt(recamaras) || 0,
        banos: cleanNumber(banos), 
        medio_bano: parseInt(medio_bano) || 0,
        estacionamientos: parseInt(estacionamientos) || 0,
        imagen_url: portadaUrl,
        galeria_urls: galeriaUrls, 
        video_url,
        recorrido_3d_url // 🔥 NUEVO: Persistimos el enlace 3D en Supabase
      });

    if (insertError) return fail(500, { error: `Error SQL: ${insertError.message}` });
    
    throw redirect(303, '/admin');
  }
};
