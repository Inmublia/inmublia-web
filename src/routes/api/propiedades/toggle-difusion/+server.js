// src/routes/api/propiedades/toggle-difusion/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  const { user } = await locals.safeGetSession();
  if (!user) return json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { propiedad_id, portal, activar } = await request.json();

    if (!propiedad_id || !portal) {
      return json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Obtener el broker_id y validar propiedad (Zero-Trust)
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return json({ error: 'Perfil de broker no encontrado' }, { status: 403 });

    const { data: propiedad } = await locals.supabase
      .from('propiedades')
      .select('id')
      .eq('id', propiedad_id)
      .eq('broker_id', broker.id)
      .single();

    if (!propiedad) return json({ error: 'Propiedad no encontrada o sin acceso' }, { status: 404 });

    // 2. Determinar la acción exacta
    const accion = activar ? 'publicar' : 'despublicar';

    // 3. Insertar la tarea en la cola con Fair Queuing
    // Si ya había una orden pendiente para esta propiedad y portal, la sobreescribimos para evitar duplicidad
    const { error: queueErr } = await locals.supabase
      .from('portal_sync_queue')
      .upsert({
        propiedad_id: propiedad.id,
        broker_id: broker.id,
        portal: portal,
        accion: accion,
        estatus: 'pendiente',
        intentos: 0,
        ejecutar_en: new Date().toISOString()
      }, { onConflict: 'propiedad_id, portal', ignoreDuplicates: false });

    if (queueErr) throw queueErr;

    // 4. Actualizar optimísticamente el estado de la publicación a "pendiente" / "sincronizando"
    await locals.supabase
      .from('portal_publicaciones')
      .upsert({
        propiedad_id: propiedad.id,
        broker_id: broker.id,
        portal: portal,
        estatus: activar ? 'pendiente' : 'inactivo'
      }, { onConflict: 'propiedad_id, portal' });

    return json({ success: true, message: `Orden de ${accion} encolada exitosamente.` });

  } catch (err) {
    console.error('[API TOGGLE DIFUSION]', err);
    return json({ error: 'Error interno al procesar la solicitud' }, { status: 500 });
  }
}
