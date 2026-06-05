import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { crearAgenciaDesdeStripe } from '$lib/server/provisioning';

// Inicializamos Stripe con la API versión más reciente y estable
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-16', // Usa la versión que tengas configurada en tu panel
});

export async function POST({ request }) {
  // 1. Extraer el cuerpo "crudo" (raw) y la firma, OBLIGATORIO para la validación criptográfica
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Falta la firma de Stripe', { status: 401 });
  }

  let event;

  try {
    // 2. Validación criptográfica de grado bancario
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`🔥 [Webhook Error] Firma inválida o manipulación detectada: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3. Evaluar el tipo de evento
  // checkout.session.completed es el evento rey cuando un pago inicial de suscripción es exitoso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // 4. Extracción de datos del comprador
      // El 'client_reference_id' es el auth.uid() que inyectaremos al crear el link de pago
      const authUserId = session.client_reference_id; 
      const email = session.customer_details?.email;
      const stripeCustomerId = session.customer;
      
      // Los 'metadata' son campos ocultos que le pasaremos a Stripe antes del pago
      const nombreComercial = session.metadata?.nombre_comercial || 'Agencia Inmublia';
      const subdominioDeseado = session.metadata?.subdominio || email.split('@')[0];

      if (!authUserId) {
        throw new Error('No se recibió el client_reference_id. Imposible vincular el pago al usuario.');
      }

      // 5. Encender la fábrica: Disparamos el aprovisionamiento
      await crearAgenciaDesdeStripe({
        authUserId,
        email,
        nombreComercial,
        subdominioDeseado,
        stripeCustomerId
      });

    } catch (err) {
      console.error('🔥 [Webhook] Fallo crítico durante el aprovisionamiento:', err);
      // Retornar un 500 obliga a Stripe a REINTENTAR enviar el webhook en un par de horas
      // Esto nos salva la vida si la base de datos se cayó un segundo.
      return new Response('Error procesando la entrega del servicio', { status: 500 });
    }
  }

  // Responder 200 OK a Stripe en menos de 3 segundos para que no marque el webhook como fallido
  return new Response(JSON.stringify({ success: true }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
