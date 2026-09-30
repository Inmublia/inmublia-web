// src/routes/api/portales/despachar/+server.js
import { json, error as svelteError } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env as privateEnv } from '$env/dynamic/private';
import { procesarDifusion } from '$lib/server/portales-sync';

const PORTALES_VALIDOS = ['mercadolibre', 'proppit', 'easybroker'];
const ACCIONES_VALIDAS = ['publicar', 'actualizar', 'despublicar'];

export async function POST({ request, locals, platform }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw svelteError(401, 'No autorizado');

  const { propiedad_id, portal, accion } = await request.json();

  if (!propiedad_id || !PORTALES_VALIDOS.includes(portal) || !ACCIONES_VALIDAS.includes(accion)) {
    throw svelteError(400, 'Parámetros inválidos');
  }

  const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
  if (!broker) throw svelteError(403, 'Perfil de broker no encontrado');

  const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

  const { data: propiedad } = await supabaseAdmin.from('propiedades')
    .select('id, broker_id').eq('id', propiedad_id).eq('broker_id', broker.id).single();

  if (!propiedad) throw svelteError(403, 'No autorizado para difundir esta propiedad');

  await supabaseAdmin.from('portal_publicaciones').upsert({
    propiedad_id: propiedad.id, broker_id: propiedad.broker_id, portal, estatus: 'pendiente'
  }, { onConflict: 'propiedad_id, portal' });

  const { data: job } = await supabaseAdmin.from('portal_sync_queue').insert([{ 
    broker_id: propiedad.broker_id, propiedad_id: propiedad.id, portal, accion, estatus: 'pendiente' 
  }]).select().single();

  const ejecutarTarea = async () => {
    try { await procesarDifusion(supabaseAdmin, job); } 
    catch (err) { console.error(`[DIFUSION FAIL] Job: ${job.id}`, err); }
  };

  if (platform?.ctx?.waitUntil) platform.ctx.waitUntil(ejecutarTarea());
  else ejecutarTarea().catch(console.error);

  return json({ success: true, message: 'Proceso de difusión encolado' });
}
