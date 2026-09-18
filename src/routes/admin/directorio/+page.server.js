// src/routes/admin/directorio/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  // 🚀 BYPASS RLS: Inyectamos Cliente Dios para el God Mode
  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Buscamos el ID correcto (El tuyo, o el del cliente si estás impersonando)
  let query = db.from('brokers').select('*');
  if (locals.isImpersonating && locals.tenantId) {
    query = query.eq('id', locals.tenantId);
  } else {
    query = query.eq('auth_user_id', locals.user.id);
  }

  const { data: broker, error: brokerError } = await query.single();

  if (brokerError || !broker) throw redirect(303, '/login');

  // 2. Traemos todo el histórico de leads para el análisis (Usando 'db' sin Muro RLS)
  const { data: leads } = await db
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus)`)
    .eq('broker_id', broker.id);

  // 3. OPTIMIZACIÓN: Solo traemos las propiedades 'Activas' para el Matchmaking. (Usando 'db' sin Muro RLS)
  // No tiene caso descargar las vendidas o en pre-mercado si no se pueden cruzar.
  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, ubicacion, slug, imagen_url')
    .eq('broker_id', broker.id)
    .eq('estatus', 'Activa');

  return {
    broker,
    leads: leads || [],
    propiedades: propiedades || []
  };
};
