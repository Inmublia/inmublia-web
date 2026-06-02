import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const user = locals.user;
  if (!user) throw redirect(303, '/login');

  const { id } = params;

  // Traemos los datos actuales de la propiedad para pre-llenar el formulario
  const { data: propiedad } = await supabase.from('propiedades').select('*').eq('id', id).single();
  if (!propiedad) throw redirect(303, '/admin');

  return { propiedad };
}

export const actions = {
  actualizar: async ({ request, locals, params }) => {
    const user = locals.user;
    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const id = params.id;
    
    // Extraemos solo los campos de texto/números para actualizar rápido
    const actualizaciones = {
      titulo: formData.get('titulo'),
      precio: parseFloat(formData.get('precio')),
      descripcion: formData.get('descripcion'),
      operacion: formData.get('operacion'),
      tipo: formData.get('tipo'),
      destacada: formData.get('destacada') === 'on',
      m2_terreno: parseFloat(formData.get('m2_terreno') || 0),
      m2_construccion: parseFloat(formData.get('m2_construccion') || 0),
      recamaras: parseInt(formData.get('recamaras') || 0),
      banos: parseFloat(formData.get('banos') || 0),
      medio_bano: parseInt(formData.get('medio_bano') || 0),
      estacionamientos: parseInt(formData.get('estacionamientos') || 0),
      ubicacion: formData.get('ubicacion')
    };

    const { error } = await supabase.from('propiedades').update(actualizaciones).eq('id', id);

    if (error) return fail(500, { error: `Error al actualizar: ${error.message}` });
    throw redirect(303, '/admin');
  }
};
