import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  crear: async ({ request, locals }) => {
    // 1. Verificamos la identidad del broker desde la sesión segura
    const user = locals.user;
    if (!user) {
      throw redirect(303, '/login');
    }

    // 2. Extraemos los datos del formulario
    const formData = await request.formData();
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const descripcion = formData.get('descripcion');
    const imagen = formData.get('imagen'); // Esto es el archivo físico

    // Validaciones básicas
    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Por favor, completa todos los campos y sube una imagen.' });
    }

    // 3. Obtenemos el ID del broker en la base de datos
    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) {
      return fail(400, { error: 'Error de vinculación con tu agencia.' });
    }

    // 4. Procesamiento y subida de la imagen a Supabase Storage
    // Generamos un nombre único para evitar que se sobreescriban fotos con el mismo nombre
    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('propiedades')
      .upload(fileName, imagen, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error(uploadError);
      return fail(500, { error: 'Hubo un problema al subir la fotografía de alta calidad.' });
    }

    // 5. Obtenemos la URL pública generada por Supabase
    const { data: { publicUrl } } = supabase.storage
      .from('propiedades')
      .getPublicUrl(fileName);

    // 6. Generamos un "Slug" amigable para SEO (Ej: "casa-en-zapopan")
    const slug = titulo
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplaza espacios por guiones
      .replace(/(^-|-$)+/g, '');

    // 7. Insertamos todo en la tabla de propiedades
    const { error: insertError } = await supabase
      .from('propiedades')
      .insert({
        broker_id: broker.id,
        titulo: titulo,
        slug: slug,
        precio: parseFloat(precio),
        descripcion: descripcion,
        imagen_url: publicUrl
        // Aquí agregaremos galeria_urls: [] en la siguiente iteración
      });

    if (insertError) {
      console.error(insertError);
      return fail(500, { error: 'La imagen se subió, pero hubo un error al guardar los datos de la propiedad.' });
    }

    // 8. Éxito rotundo: Devolvemos al broker a su panel de control
    throw redirect(303, '/admin');
  }
};
