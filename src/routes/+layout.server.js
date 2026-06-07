export const load = async ({ locals, depends }) => {
  // Declaramos la dependencia para invalidación reactiva cuando cambie la sesión
  depends('supabase:auth');

  const { session, user } = await locals.safeGetSession();

  return {
    session,
    user
  };
};
