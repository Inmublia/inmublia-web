function formatearSemana(semanaInicio: string) {
  const fecha = new Date(`${semanaInicio}T12:00:00Z`);
  return fecha.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export async function obtenerMetricasSemana(supabase: any, brokerId: string, semanaInicio: string) {
  const inicio = new Date(`${semanaInicio}T00:00:00.000Z`)
  
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 7)
  
  const inicioAnterior = new Date(inicio)
  inicioAnterior.setDate(inicioAnterior.getDate() - 7)

  const [
    { data: leadsEstaSemana },
    { data: leadsSemanaAnterior },
    { data: leadsActivos },
    { data: propiedades },
    { data: notasRecordatorios },
    { data: leadsCerradosEstaSemana }, 
  ] = await Promise.all([
    supabase.from('leads').select('id, nombre, estado, origen, score_ia, score_etiqueta').eq('broker_id', brokerId).gte('creado_en', inicio.toISOString()).lt('creado_en', fin.toISOString()),
    supabase.from('leads').select('id').eq('broker_id', brokerId).gte('creado_en', inicioAnterior.toISOString()).lt('creado_en', inicio.toISOString()),
    supabase.from('leads').select('id, nombre, estado, score_ia, score_etiqueta, score_accion').eq('broker_id', brokerId).gte('score_ia', 75).not('estado', 'in', '("cerrado","descartado")'),
    supabase.from('propiedades').select('id', { count: 'exact' }).eq('broker_id', brokerId).eq('estatus', 'Activa'),
    supabase.from('lead_notas').select('id, contenido, fecha_recordatorio').eq('broker_id', brokerId).eq('tipo', 'recordatorio').eq('completado', false).lte('fecha_recordatorio', fin.toISOString()),
    supabase.from('leads').select('id').eq('broker_id', brokerId).eq('estado', 'cerrado').gte('actualizado_en', inicio.toISOString()).lt('actualizado_en', fin.toISOString()),
  ])

  const leadsNuevos = leadsEstaSemana?.length ?? 0
  const leadsNuevosAntes = leadsSemanaAnterior?.length ?? 0
  const cerradosEstaSemana = leadsCerradosEstaSemana?.length ?? 0
  
  const delta = leadsNuevosAntes > 0 ? Math.round(((leadsNuevos - leadsNuevosAntes) / leadsNuevosAntes) * 100) : leadsNuevos > 0 ? 100 : 0
  
  const leadsCalientes = (leadsActivos ?? []).sort((a: any, b: any) => (b.score_ia ?? 0) - (a.score_ia ?? 0)).slice(0, 3)
  
  const topFuentesMap = (leadsEstaSemana ?? []).reduce((acc: any, l: any) => {
    const f = l.origen || 'Directo';
    acc[f] = (acc[f] || 0) + 1;
    return acc;
  }, {});
  const topFuentes = Object.entries(topFuentesMap).map(([fuente, count]) => ({ fuente, count: count as number })).sort((a, b) => b.count - a.count);

  return {
    semana: semanaInicio,
    leadsNuevos,
    leadsNuevosAntes,
    delta,
    deltaPositivo: delta >= 0,
    cerradosEstaSemana,
    leadsCalientes,
    totalPropiedades: propiedades?.length ?? 0,
    recordatoriosPendientes: notasRecordatorios?.length ?? 0,
    topFuentes,
    sinSeguimiento: 0
  }
}

export function hayContenidoRelevante(metricas: any): boolean {
  return (metricas.leadsNuevos > 0 || metricas.leadsCalientes.length > 0 || metricas.cerradosEstaSemana > 0 || metricas.recordatoriosPendientes > 0)
}

export function generarAsunto(broker: any, metricas: any): string {
  const nombre = broker.nombre_comercial?.split(' ')[0] ?? 'Hola'
  if (metricas.cerradosEstaSemana > 0) return `🎉 ${nombre}: cerraste ${metricas.cerradosEstaSemana} operación${metricas.cerradosEstaSemana > 1 ? 'es' : ''} esta semana`
  if (metricas.leadsCalientes.length > 0) return `🔥 ${nombre}: tienes ${metricas.leadsCalientes.length} lead${metricas.leadsCalientes.length > 1 ? 's' : ''} caliente${metricas.leadsCalientes.length > 1 ? 's' : ''} esperando`
  if (metricas.delta > 20) return `📈 ${nombre}: tus leads subieron ${metricas.delta}% esta semana`
  if (metricas.recordatoriosPendientes > 0) return `📋 ${nombre}: tienes ${metricas.recordatoriosPendientes} tarea${metricas.recordatoriosPendientes > 1 ? 's' : ''} pendiente${metricas.recordatoriosPendientes > 1 ? 's' : ''} esta semana`
  return `Tu resumen semanal de Inmublia — ${formatearSemana(metricas.semana)}`
}

export async function generarBriefingIA(supabase: any, broker: any, metricas: any): Promise<string | null> {
  // CAMBIO CRÍTICO: Nueva llave 'v2' para ignorar el caché negativo anterior y forzar una nueva lectura.
  const cacheKey = `briefing-email-v2:${broker.id}:${metricas.semana}`
  const cached = await supabase.from('ai_cache').select('contenido').eq('cache_key', cacheKey).single()
  
  if (cached.data?.contenido) return cached.data.contenido

  if (metricas.leadsCalientes.length === 0 && metricas.cerradosEstaSemana === 0 && metricas.leadsNuevos === 0) return null

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${Deno.env.get('CF_ACCOUNT_ID')}/ai/run/@cf/meta/llama-3.2-3b-instruct`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('CF_API_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: buildBriefingPrompt(broker, metricas) }],
          max_tokens: 150,
        })
      }
    )
    
    const data = await response.json()
    const briefing = data.result?.response?.trim()
    
    if (briefing) {
      await supabase.from('ai_cache').upsert({
        cache_key: cacheKey,
        contenido: briefing,
        expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    return briefing ?? null
  } catch {
    return null 
  }
}

function buildBriefingPrompt(broker: any, metricas: any): string {
  const lineasCalientes = metricas.leadsCalientes.map((l: any) => `  • ${l.nombre}: ${l.score_accion}`).join('\n')
  
  return `Eres el coach de ventas y analista ejecutivo de ${broker.nombre_comercial}, un asesor inmobiliario top en México.
Escribe el párrafo de apertura de su reporte semanal. Máximo 2 oraciones.

Datos:
- Leads nuevos: ${metricas.leadsNuevos} (${metricas.delta > 0 ? '+' : ''}${metricas.delta}% vs sem. ant.)
- Cierres: ${metricas.cerradosEstaSemana}
- Oportunidades: ${lineasCalientes || 'Ninguno crítico'}
- Tareas: ${metricas.recordatoriosPendientes}

REGLAS ESTRICTAS DE TONO:
- Tono: Ejecutivo, motivador, enfocado a resultados y proactivo.
- PROHIBIDO ABSOLUTAMENTE: Ser negativo, regañar, o usar palabras como "descenso", "caída", "crisis", "problema". 
- Si los números son bajos o cero, enfócalo positivamente como el momento ideal para: prospectar agresivamente, reconectar con cartera antigua, y afinar estrategias. Todo es una "oportunidad".
- Primera oración: El logro principal o la oportunidad más valiosa.
- Segunda oración: Acción directa y motivadora sugerida.
- Sin saludos, sin emojis. Retorna SOLO el texto.`
}
