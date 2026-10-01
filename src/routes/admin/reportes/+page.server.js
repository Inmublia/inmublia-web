// src/routes/admin/reportes/+page.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Función para delegar la carga pesada a Cloudflare Workers sin bloquear el renderizado
async function generarYGuardarInsight(supabase, broker, metricasBase, platform) {
  try {
    const prompt = `Eres un estratega inmobiliario top. Analiza estas métricas:
- Pipeline: $${metricasBase.pipelineValue}
- Tasa Cierre: ${metricasBase.tasaCierre}%
- Leads Estancados: ${metricasBase.leadsEstancados}
Responde en JSON estricto: {"resumen": "análisis de 2 líneas", "accion_prioritaria": "1 acción directa"}`;

    // Si estás local y no tienes CF AI, puedes usar un fallback o mock
    if (!platform?.env?.AI) throw new Error("CF AI no disponible en este entorno");

    const result = await platform.env.AI.run('@cf/qwen/qwen3-30b-a3b-fp8', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    });

    const insight = JSON.parse(result.response);

    await supabase.from('ai_insights_cache').upsert({
      broker_id: broker.id,
      tipo: 'reporte_diario',
      contenido: insight,
      generado_en: new Date().toISOString()
    }, { onConflict: 'broker_id, tipo' });

  } catch (err) {
    console.error('[AI Insight] Fallo silencioso en background:', err.message);
  }
}

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  // 1. Ejecutar las lecturas pesadas en paralelo para máxima velocidad
  const [brokerRes, insightRes] = await Promise.all([
    db.from('brokers').select('id, nombre_comercial, comision_default').eq(locals.isImpersonating && locals.tenantId ? 'id' : 'auth_user_id', locals.isImpersonating && locals.tenantId ? locals.tenantId : locals.user.id).single(),
    // Buscamos si hay un insight de las últimas 24 horas
    db.from('ai_insights_cache').select('contenido, generado_en')
      .eq('tipo', 'reporte_diario')
      .gte('generado_en', new Date(Date.now() - 86400000).toISOString())
      .maybeSingle()
  ]);

  if (brokerRes.error || !brokerRes.data) throw redirect(303, '/login');
  const broker = brokerRes.data;

  // Lógica de métricas (resumida por espacio, mantén la que tienes actualmente para tus KPIs)
  const { data: leads } = await db.from('leads').select('*, propiedades (precio)').eq('broker_id', broker.id);
  const metricasCalculadas = { pipelineValue: 0, tasaCierre: 0, leadsEstancados: 0 }; // Reemplaza con tus variables de cálculo

  // 2. MAGIA DE CLOUDFLARE: Si la caché está vacía o vencida, disparamos a la IA sin esperar la respuesta
  const insightGuardado = insightRes.data;
  
  if (!insightGuardado) {
    const tareaIA = generarYGuardarInsight(db, broker, metricasCalculadas, platform);
    
    // Blindaje multiplataforma: Usamos waitUntil si existe (Producción), sino lo lanzamos libre (Local)
    if (platform?.context?.waitUntil) {
      platform.context.waitUntil(tareaIA);
    } else if (platform?.ctx?.waitUntil) {
      platform.ctx.waitUntil(tareaIA);
    } else {
      tareaIA.catch(e => console.error("Error en IA local:", e));
    }
  }

  // 3. Entregamos la página INMEDIATAMENTE
  return {
    broker,
    leads: leads || [],
    insight: insightGuardado?.contenido || null // Si es null, Svelte activará el skeleton animado
  };
};
