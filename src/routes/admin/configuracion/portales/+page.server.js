// src/routes/admin/configuracion/portales/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { encryptToken } from '$lib/server/crypto';

export async function load({ locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) throw redirect(303, '/login');

  const { data: broker } = await locals.supabase.from('brokers').select('id, plan_suscripcion').eq('auth_user_id', user.id).single();
  
  const { data: credenciales } = await locals.supabase
    .from('portal_credenciales')
    .select('portal, estatus, actualizado_en')
    .eq('broker_id', broker.id);

  return { broker, credenciales: credenciales || [] };
}

export const actions = {
  guardarEasyBroker: async ({ request, locals }) => {
    const formData = await request.formData();
    const apiKey = formData.get('api_key')?.toString().trim();
    
    if (!apiKey) return fail(400, { error: 'La API Key es requerida' });

    const { user } = await locals.safeGetSession();
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();

    // Cifrado inmediato
    const encryptedKey = encryptToken(apiKey);

    const { error } = await locals.supabase.from('portal_credenciales').upsert({
      broker_id: broker.id,
      portal: 'easybroker',
      api_key_encrypted: encryptedKey,
      estatus: 'activo',
      key_version: 'v1'
    }, { onConflict: 'broker_id, portal' });

    if (error) return fail(500, { error: 'Error de base de datos al guardar la credencial' });
    
    return { success: true, message: 'EasyBroker conectado exitosamente' };
  },
  
  desconectar: async ({ request, locals }) => {
    const formData = await request.formData();
    const portal = formData.get('portal')?.toString().trim();
    
    const { user } = await locals.safeGetSession();
    const { data: broker } = await locals.supabase.from('brokers').select('id').eq('auth_user_id', user.id).single();

    // Soft-delete / Inactivación
    await locals.supabase.from('portal_credenciales')
      .update({ estatus: 'inactivo', api_key_encrypted: null, access_token_encrypted: null, refresh_token_encrypted: null })
      .eq('broker_id', broker.id).eq('portal', portal);

    return { success: true, message: `${portal} ha sido desconectado` };
  }
};
