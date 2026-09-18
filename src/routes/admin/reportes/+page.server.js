// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  let query = db.from('brokers').select('*');
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', locals.user.id);
  }

  const { data: broker, error: brokerError } = await query.single();

  if (brokerError || !broker) throw redirect(303, '/login');

  const { data: leads } = await db
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

  // 🚀 FIX: Traemos el inventario para cruzar información de propiedades que se vendieron directamente (sin lead asociado en CRM)
  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, updated_at')
    .eq('broker_id', broker.id);

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
