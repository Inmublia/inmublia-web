// src/routes/api/admin/reportes/insight/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
  const brokerId = url.searchParams.get('broker_id');
  
  if (!locals.user || !brokerId) {
    return json({ ready: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
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
