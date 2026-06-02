import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export const actions = {
  crear: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const titulo = formData.get('titulo');
    const precio = formData.get('precio');
    const descripcion = formData.get('descripcion');
    const operacion = formData.get('operacion');
    const tipo = formData.get('tipo');
    const destacada = formData.get('destacada') === 'on'; // Checkbox a booleano
    const imagen = formData.get('imagen'); 

    if (!titulo || !precio || !imagen || imagen.size === 0) {
      return fail(400, { error: 'Faltan campos obligatorios.' });
    }

    const { data: broker, error: brokerError } = await supabase
      .from('brokers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (brokerError || !broker) return fail(400, { error: 'Agencia no encontrada.' });

    const fileExt = imagen.name.split('.').pop();
    const fileName = `${broker.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const buffer = await imagen.arrayBuffer();
    
    const { error: uploadError } = await supabase.storage
      .from('propiedades')
      .upload(fileName, buffer, { contentType: imagen.type, upsert: false });

    if (uploadError) return fail(500, { error: `Error en bóveda: ${uploadError.message}` });

    const { data: { publicUrl } } = supabase.storage.from('propiedades').getPublicUrl(fileName);

    const slug = titulo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const { error: insertError } = await supabase.from('propiedades').insert({
        broker_id: broker.id,
        titulo, slug, operacion, tipo, destacada, descripcion,
        precio: parseFloat(precio),
        imagen_url: publicUrl
      });

    if (insertError) return fail(500, { error: `Error SQL: ${insertError.message}` });

    throw redirect(303, '/admin');
  }
};
