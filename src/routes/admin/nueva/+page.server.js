import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  crear: async ({ request, locals }) => {
    // 1. Verificamos la identidad del broker
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    // 2. Extraemos los datos del formulario
    const formData = await request.formData();
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const descripcion = formData.get('descripcion');
    const imagen = formData.get('imagen'); // Objeto File de SvelteKit

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Por favor, completa todos los campos y sube una imagen.' });
    }

    // 3. Obtenemos el ID del broker
    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) {
      return fail(400, { error: 'Error de vinculación con tu agencia.' });
    }

    // 4. PREPARACIÓN DE LA IMAGEN
    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    // Convertimos el File a un ArrayBuffer para que Supabase lo digiera perfectamente en el backend
    const buffer = await imagen.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('propiedades')
      .upload(fileName, buffer, {
        contentType: imagen.type, // Le decimos si es JPG, PNG, etc.
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error("Error de Storage:", uploadError);
      return fail(500, { error: `La bóveda rechazó el archivo: ${uploadError.message}` });
    }

    // 5. Obtenemos la URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('propiedades')
      .getPublicUrl(fileName);

    // 6. Generamos el Slug amigable
    const slug = titulo
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^a-z0-9]+/g, '-') 
      .replace(/(^-|-$)+/g, '');

    // 7. Insertamos en la tabla de propiedades
    const { error: insertError } = await supabase
      .from('propiedades')
      .insert({
        broker_id: broker.id,
        titulo: titulo,
        slug: slug,
        precio: parseFloat(precio),
        descripcion: descripcion,
        imagen_url: publicUrl
      });

    if (insertError) {
      console.error("Error de Base de Datos:", insertError);
      // Imprimirá el error exacto de Supabase en tu pantalla
      return fail(500, { error: `Error SQL: ${insertError.message}` });
    }

    // 8. Éxito rotundo
    throw redirect(303, '/admin');
  }
};
