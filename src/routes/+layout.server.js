export const load = async ({ locals, depends }) => {
  depends('supabase:auth');

  // Programación defensiva (SSR seguro)
  const { session, user } = locals.safeGetSession 
    ? await locals.safeGetSession() 
    : { session: null, user: null };

  return { session, user };
};
