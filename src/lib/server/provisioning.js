import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * Función maestra para aprovisionar un nuevo Broker tras un pago exitoso
 */
export async function crearAgenciaDesdeStripe({ authUserId, email, nombreComercial, subdominioDeseado, stripeCustomerId }) {
  console.log(`[Provisioning] Iniciando creación de agencia para: ${email}`);

  // Inicialización segura en runtime garantizada para Cloudflare Edge
  const supabaseAdmin = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    privateEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  // 1. Limpieza de subdominio
  let subdominioLimpio = subdominioDeseado
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-');

  // 2. Verificación de colisión (¿Ya existe ese subdominio?)
  const { data: existe } = await supabaseAdmin
    .from('brokers')
    .select('id')
    .eq('subdominio', subdominioLimpio)
    .maybeSingle();

  if (existe) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    subdominioLimpio = `${subdominioLimpio}-${randomSuffix}`;
  }

  // 3. Inserción de la nueva Agencia (Tenant)
  const { data: nuevoBroker, error: brokerError } = await supabaseAdmin
    .from('brokers')
    .insert([{
      auth_user_id: authUserId,
      email: email,
      nombre_comercial: nombreComercial || 'Mi Agencia',
      subdominio: subdominioLimpio,
      stripe_customer_id: stripeCustomerId,
      status_suscripcion: 'activa',
      template: 'luxury'
    }])
    .select()
    .single();

  if (brokerError) {
    console.error(`[Provisioning] Error creando broker en Supabase:`, brokerError);
    throw new Error(`Fallo crítico aprovisionando el tenant: ${brokerError.message}`);
  }

  console.log(`[Provisioning] ✅ Agencia creada con éxito: ${subdominioLimpio}.inmublia.com`);
  return nuevoBroker;
}
