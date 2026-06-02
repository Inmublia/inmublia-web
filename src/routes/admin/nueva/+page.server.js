import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  crear: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    
    // 1. Extraemos datos generales
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const descripcion = formData.get('descripcion');
    const operacion = formData.get('operacion');
    const tipo = formData.get('tipo');
    const destacada = formData.get('destacada') === 'on';
    
    // Extraemos campos de ficha técnica
    const m2_terreno = formData.get('m2_terreno') || 0;
    const m2_construccion = formData.get('m2_construccion') || 0;
    const recamaras = formData.get('recamaras') || 0;
    const banos = formData.get('banos') || 0;
    const medio_bano = formData.get('medio_bano') || 0;
    const estacionamientos = formData.get('estacionamientos') || 0;
    const ubicacion = formData.get('ubicacion') || 'Guadalajara, Jalisco';

    // Imágenes
    const imagen = formData.get('imagen'); 
    const galeriaArchivos = formData.getAll('galeria'); // Array de archivos múltiples

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Faltan campos obligatorios o la foto de portada.' });
    }

    const { data: broker } = await supabase.from('brokers').select('id').eq('email', user.email).single();
    if (!broker) return fail(400, { error: 'Agencia no encontrada.' });

    // 2. SUBIR PORTADA
    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-main.${fileExt}`;
    const buffer = await imagen.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage.from('propiedades').upload(fileName, buffer, { contentType: imagen.type });
    if (uploadError) return fail(500, { error: `Error en portada: ${uploadError.message}` });
    const { data: { publicUrl: portadaUrl } } = supabase.storage.from('propiedades').getPublicUrl(fileName);

    // 3. SUBIR GALERÍA MÚLTIPLE (Bucle)
    let galeriaUrls = [];
    for (const file of galeriaArchivos) {
      if (file && file.size > 0) {
        const ext = file.name.split('.').pop();
        const gName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const gBuffer = await file.arrayBuffer();
        const { error: gError } = await supabase.storage.from('propiedades').upload(gName, gBuffer, { contentType: file.type });
        
        if (!gError) {
          const { data: { publicUrl } } = supabase.storage.from('propiedades').getPublicUrl(gName);
          galeriaUrls.push(publicUrl);
        }
      }
    }

    const slug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // 4. INSERTAR TODO A LA BASE DE DATOS
    const { error: insertError } = await supabase.from('propiedades').insert({
        broker_id: broker.id,
        titulo, slug, operacion, tipo, destacada, descripcion, ubicacion,
        precio: parseFloat(precio),
        m2_terreno: parseFloat(m2_terreno),
        m2_construccion: parseFloat(m2_construccion),
        recamaras: parseInt(recamaras),
        banos: parseFloat(banos),
        medio_bano: parseInt(medio_bano),
        estacionamientos: parseInt(estacionamientos),
        imagen_url: portadaUrl,
        galeria_urls: galeriaUrls // El array de fotos
      });

    if (insertError) return fail(500, { error: `Error SQL: ${insertError.message}` });
    throw redirect(303, '/admin');
  }
};
