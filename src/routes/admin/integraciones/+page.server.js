import { fail } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { session } = await locals.safeGetSession();
  
  const { data: webhook } = await locals.supabase
    .from('agency_webhooks')
    .select('*')
    .eq('agency_id', session.user.id)
    .single();

  return { webhook };
};

export const actions = {
  guardar: async ({ request, locals }) => {
    const { session } = await locals.safeGetSession();
    const formData = await request.formData();
    
    const endpoint_url = formData.get('endpoint_url');
    const is_active = formData.get('is_active') === 'on';

    try {
      new URL(endpoint_url);
    } catch {
      return fail(400, { error: 'URL inválida. Debe incluir http:// o https://' });
    }

    const { error } = await locals.supabase
      .from('agency_webhooks')
      .upsert({ 
        agency_id: session.user.id, 
        endpoint_url, 
        is_active 
      }, { onConflict: 'agency_id' });

    if (error) return fail(500, { error: 'Error interno al guardar la configuración.' });

    return { success: true };
  }
};
