import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Usamos la Service Role Key para saltarnos el RLS al crear el tenant
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Función maestra para aprovisionar un nuevo Broker tras un pago exitoso
 */
export async function crearAgenciaDesdeStripe({ authUserId, email, nombreComercial, subdominioDeseado, stripeCustomerId }) {
  console.log(`[Provisioning] Iniciando creación de agencia para: ${email}`);

  // 1. Limpieza de subdominio (asegurarnos que sea válido para URLs)
  let subdominioLimpio = subdominioDeseado
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9]/g, '-'); // Reemplazar espacios/símbolos con guiones

  // 2. Verificación de colisión (¿Ya existe ese subdominio?)
  const { data: existe } = await supabaseAdmin
    .from('brokers')
    .select('id')
    .eq('subdominio', subdominioLimpio)
    .single();

  if (existe) {
    // Si Juan Pérez ya tomó "juanperez", a este le damos "juanperez-123"
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
    console.error(`[Provisioning] Error creando broker:`, brokerError);
    throw new Error('Fallo crítico aprovisionando el tenant');
  }

  console.log(`[Provisioning] ✅ Agencia creada con éxito: ${subdominioLimpio}.inmublia.com`);
  return nuevoBroker;
}
