// src/routes/admin/directorio/+page.server.js
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

  // 🚀 FIX C3: No hacer select('*') en la tabla brokers para no exponer webhooks/stripe
  let query = db.from('brokers').select('id, nombre_comercial, avatar_url, comision_default, ia_creditos_disponibles, plan_suscripcion');
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', locals.user.id);
  }

  const { data: broker, error: brokerError } = await query.single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // 🚀 FIX C4: Incluir 'tipo' y 'recamaras' en el inner join de propiedades
  const { data: leads } = await db
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus, tipo, recamaras)`)
    .eq('broker_id', broker.id);

  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, tipo, recamaras, ubicacion, slug, imagen_url')
    .eq('broker_id', broker.id)
    .eq('estatus', 'Activa');

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
