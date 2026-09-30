// src/routes/admin/propiedades/[id]/difusion/+page.server.js
import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  const { id } = params;
  const { user } = await locals.safeGetSession();
  
  if (!user) throw error(401, 'No autorizado');

  const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();
  
  const { data: propiedad, error: propErr } = await locals.supabase
    .from('propiedades').select('id, titulo').eq('id', id).eq('broker_id', broker.id).single();

  if (propErr || !propiedad) throw error(404, 'Propiedad no encontrada');

  const { data: publicaciones } = await locals.supabase
    .from('portal_publicaciones')
    .select('portal, estatus, portal_url, ultimo_error, sincronizado_en')
    .eq('propiedad_id', propiedad.id);

  return { propiedad, publicaciones: publicaciones || [] };
}
