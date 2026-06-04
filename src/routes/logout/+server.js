import { redirect } from '@sveltejs/kit';

export const POST = async ({ locals }) => {
  // Destruimos la sesión activa en el servidor
  if (locals.supabase) {
    const { error } = await locals.supabase.auth.signOut();
    if (error) console.error("Error destruyendo sesión:", error.message);
  }
  
  // Redirigimos limpio a la página de login
  throw redirect(303, '/login');
};
