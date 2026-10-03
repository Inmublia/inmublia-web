import { json } from '@sveltejs/kit';
// 🚀 V6: Verificación estricta de seguridad
import { resolveEffectiveTenant } from '$lib/server/supabase-admin.js';

export async function GET({ locals, url }) {
  const user = locals.user;
  if (!user) {
    return json({ ready: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Garantizamos que el usuario (o el admin impersonating) solo pueda pedir 
    // el caché del brokerId que le corresponde.
    const { brokerId } = await resolveEffectiveTenant(locals, user);

    // Verificamos si el request intenta pedir el caché de un broker ajeno
    const queryBrokerId = url.searchParams.get('broker_id');
    if (queryBrokerId && queryBrokerId !== brokerId) {
        return json({ ready: false, error: 'Acceso denegado al caché de otra agencia.' }, { status: 403 });
    }

    const { data, error } = await locals.supabase
      .from('ai_insights_cache')
      .select('contenido, generado_en')
      .eq('broker_id', brokerId)
      .eq('tipo', 'reporte_diario')
      // Solo busca caché fresco de las últimas 24 hrs
      .gte('generado_en', new Date(Date.now() - 86400000).toISOString())
      .maybeSingle();

    if (error) throw error;

    if (data && data.contenido && data.contenido.resumen) {
      return json({ ready: true, insight: data.contenido });
    }

    return json({ ready: false });
  } catch (err) {
    console.error('[API Insight Polling Error]', err);
    return json({ ready: false, error: err.message }, { status: 500 });
  }
}
