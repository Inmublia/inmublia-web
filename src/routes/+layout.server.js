// src/routes/+layout.server.js

export const load = async ({ locals, depends }) => {
  // 1. Declaramos una dependencia. Esto le dice a SvelteKit:
  // "Si la autenticación de Supabase cambia (ej. el broker cierra sesión), 
  // recarga toda la interfaz de la plataforma automáticamente."
  depends('supabase:auth');

  // 2. Extraemos la sesión usando el método seguro que construiremos en el Hook.
  // Esto evita hacer llamadas redundantes a la base de datos en cada clic.
  // Si el RLS fallara, aquí lo detectamos antes de que la página intente renderizarse.
  const { session, user } = await locals.safeGetSession();

  // 3. Inyectamos tu identidad globalmente.
  // A partir de ahora, CUALQUIER página (leads, inventario, configuración) 
  // tendrá acceso a 'data.user' sin tener que volver a consultar a Supabase.
  return {
    session,
    user
  };
};
