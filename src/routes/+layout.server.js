import { PLANES_CONFIG } from '$lib/config/plans';

export const load = async ({ locals, depends }) => {
  depends('supabase:auth');

  const { session, user } = locals.safeGetSession 
    ? await locals.safeGetSession() 
    : { session: null, user: null };

  if (!user) return { session: null, user: null, broker: null, planConfig: null };

  // Traemos los datos de membresía del broker
  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id, nombre_comercial, email, whatsapp, subdominio, avatar_url, template_seleccionado, plan_suscripcion')
    .eq('email', user.email)
    .single();

  // Acoplamos las reglas de su plan según el estado en la base de datos
  const planConfig = broker ? PLANES_CONFIG[broker.plan_suscripcion] : PLANES_CONFIG['basico'];

  return {
    session,
    user,
    broker,
    planConfig
  };
};
