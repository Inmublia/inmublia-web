// src/routes/unsubscribe/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ url, locals }) => {
  const token = url.searchParams.get('token');
  if (!token) throw redirect(303, '/');

  const { data: broker } = await locals.supabase
    .from('brokers')
    .select('id, nombre_comercial, email_digest_activo')
    .eq('email_unsubscribe_token', token)
    .single();

  if (!broker) throw redirect(303, '/');

  return { broker, token };
};

export const actions = {
  unsubscribe: async ({ request, locals }) => {
    const fd = await request.formData();
    const token = fd.get('token');

    await locals.supabase
      .from('brokers')
      .update({ email_digest_activo: false })
      .eq('email_unsubscribe_token', token);

    return { success: true, action: 'unsubscribed' };
  },
  
  resubscribe: async ({ request, locals }) => {
    const fd = await request.formData();
    const token = fd.get('token');

    await locals.supabase
      .from('brokers')
      .update({ email_digest_activo: true })
      .eq('email_unsubscribe_token', token);

    return { success: true, action: 'subscribed' };
  }
};
