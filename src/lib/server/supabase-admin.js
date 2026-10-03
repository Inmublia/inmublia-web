import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function resolveEffectiveTenant(locals, user) {
  if (locals.isImpersonating && locals.tenantId) {
    return { brokerId: locals.tenantId, actorUserId: user.id, isImpersonating: true };
  }
  const { data } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
  if (!data) throw new Error('BROKER_NOT_FOUND');
  return { brokerId: data.id, actorUserId: user.id, isImpersonating: false };
}
