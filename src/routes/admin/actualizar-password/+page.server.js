import { supabase } from '$lib/supabase';
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
  const user = locals.user;
  
  // Si alguien intenta entrar a esta página escribiendo la URL manual sin haber
  // pasado por el link mágico del correo (o si el link ya expiró), lo rebotamos.
  if (!user) throw redirect(303, '/login?error=El+enlace+ha+expirado+o+es+invalido');
  
  return {};
}

export const actions = {
  actualizar: async ({ request }) => {
    const formData = await request.formData();
    const password = formData.get('password')?.toString();
    const confirm = formData.get('confirm')?.toString();

    // 1. Validaciones de negocio
    if (!password || !confirm) {
      return fail(400, { error: 'Por favor, llena ambos campos.' });
    }
    
    if (password !== confirm) {
      return fail(400, { error: 'Las contraseñas no coinciden.' });
    }

    if (password.length < 6) {
      return fail(400, { error: 'La contraseña debe tener al menos 6 caracteres por seguridad.' });
    }

    // 2. Ejecutamos el cambio de contraseña en Supabase
    // Como el usuario ya trae la sesión activa del link, esto actualiza SU perfil.
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return fail(500, { error: `Hubo un error al actualizar: ${error.message}` });
    }

    // 3. Redirección al panel principal con la nueva clave lista
    throw redirect(303, '/admin');
  }
};
