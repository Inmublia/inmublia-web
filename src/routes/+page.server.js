import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export async function load({ setHeaders, locals, fetch }) {
  setHeaders({
    'Cache-Control': 'no-store, max-age=0'
  });

  const brokerId = locals.tenantId;

  if (!brokerId) {
    return { propiedades: [], broker: null };
  }

  // FIX: Usamos Service Role para saltarnos el RLS de Supabase y poder leer la agencia públicamente
  const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY, {
    global: { fetch: fetch },
    auth: { persistSession: false }
  });

  const { data: broker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .eq('id', brokerId)
    .single();

  if (brokerError || !broker) {
      return { propiedades: [], broker: null };
  }

  const { data: propiedades } = await supabaseAdmin
      .from('propiedades')
      .select('*')
      .eq('broker_id', brokerId)
      .eq('estatus', 'Activa');

  return {
    propiedades: propiedades || [],
    broker: broker
  };
}
