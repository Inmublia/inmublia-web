import { env } from '$env/dynamic/private';
import Stripe from 'stripe';

// Inicializamos Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-16', 
});

export async function POST({ request, url }) {
  try {
    const data = await request.json();
    const { authUserId, email, nombreComercial, subdominioDeseado, priceId } = data;

    // Validación estricta
    if (!authUserId || !email || !priceId) {
      return new Response(JSON.stringify({ error: 'Faltan datos obligatorios para iniciar el pago.' }), { status: 400 });
    }

    // Detectamos si estás en localhost o en inmublia.com dinámicamente
    const origin = url.origin;

    // Construimos la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // Cambia a 'payment' si es un cobro único
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId, // Aquí va el price_xxx que sacaste en el Paso 1
          quantity: 1,
        },
      ],
      customer_email: email, // Le ahorramos al cliente tener que teclear su correo
      client_reference_id: authUserId, // CRUCIAL: Esto es lo que lee el Webhook para crear la agencia
      metadata: {
        nombre_comercial: nombreComercial || '',
        subdominio: subdominioDeseado || ''
      },
      // Hacia dónde regresan después de pagar o cancelar
      success_url: `${origin}/pago-exitoso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/precios`, 
    });

    // Devolvemos la URL de pago al frontend
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('🔥 Error crítico generando sesión de Stripe:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
