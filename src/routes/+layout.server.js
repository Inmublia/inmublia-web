import { PLANES_CONFIG } from '$lib/config/plans';

export const load = async ({ locals, depends }) => {
  depends('supabase:auth');

  const { session, user } = locals.safeGetSession 
    ? await locals.safeGetSession() 
    : { session: null, user: null };

  if (!user) return { session: null, user: null, broker: null, planConfig: null };

  try {
    // FIX: Usar maybeSingle() para no crashear si el broker no terminó de crearse en Stripe
    const { data: broker, error } = await locals.supabase
      .from('brokers')
      .select('id, nombre_comercial, email, whatsapp, subdominio, avatar_url, template_seleccionado, plan_suscripcion')
      .eq('email', user.email)
      .maybeSingle();

    if (error) throw error;

    // Acoplamos las reglas de su plan de forma segura
    const planConfig = broker && broker.plan_suscripcion 
      ? PLANES_CONFIG[broker.plan_suscripcion] 
      : PLANES_CONFIG['basico'];

    return {
      session,
      user,
      broker,
      planConfig
    };
  } catch (err) {
    console.error('🔥 [Layout Crash Evitado]:', err);
    return { session, user, broker: null, planConfig: PLANES_CONFIG['basico'] };
  }
};
