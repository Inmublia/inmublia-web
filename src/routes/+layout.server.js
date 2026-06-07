export const load = async ({ locals, depends }) => {
  // Declaramos la dependencia para invalidación reactiva cuando cambie la sesión
  depends('supabase:auth');

  // Programación defensiva: Evitamos fallos de compilación (build/prerender) si locals no está hidratado
  const { session, user } = locals.safeGetSession 
    ? await locals.safeGetSession() 
    : { session: null, user: null };

  return {
    session,
    user
  };
};
