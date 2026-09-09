import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export async function load({ locals, fetch, url }) {
  const isSandbox = url.searchParams.get('sandbox') === 'true';

  // 🔥 INTERCEPCIÓN SANDBOX: Cero llamadas a BD, respuesta en 5ms.
  if (isSandbox) {
    return {
      broker: {
        nombre_comercial: 'Inmublia Premium',
        subdominio: 'premium',
        avatar_url: 'https://ui-avatars.com/api/?name=Inmublia+Premium&background=0f172a&color=fff',
        plan_suscripcion: 'elite'
      },
      propiedades: [
        {
          id: 'demo-1',
          titulo: 'Residencia de Autor en Valle Real',
          precio: 25500000,
          moneda: 'MXN',
          operacion: 'Venta',
          ubicacion: 'Valle Real, Zapopan',
          recamaras: 4,
          banos: 5,
          medio_bano: 1,
          m2_construccion: 650,
          m2_terreno: 800,
          estacionamientos: 6,
          antiguedad: 'A Estrenar',
          imagen_url: 'https://images.unsplash.com/photo-1613490908571-9ce224a13a86?q=80&w=2000&auto=format&fit=crop'
        }
      ]
    };
  }

  const brokerId = locals.tenantId;

  if (!brokerId) {
    return { propiedades: [], broker: null };
  }

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
