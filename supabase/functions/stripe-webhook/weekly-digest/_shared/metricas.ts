function formatearSemana(semanaInicio: string) {
  return new Date(semanaInicio).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export async function obtenerMetricasSemana(supabase: any, brokerId: string, semanaInicio: string) {
  const semanaFin = new Date(semanaInicio)
  semanaFin.setDate(semanaFin.getDate() + 7)
  const semanaInicioAnterior = new Date(semanaInicio)
  semanaInicioAnterior.setDate(semanaInicioAnterior.getDate() - 7)

  const [
    { data: leadsEstaSemana },
    { data: leadsSemanaAnterior },
    { data: leadsActivos },
    { data: propiedades },
    { data: notasRecordatorios },
  ] = await Promise.all([
    supabase.from('leads').select('id, nombre, estado, origen, score_ia, score_etiqueta').eq('broker_id', brokerId).gte('creado_en', semanaInicio).lt('creado_en', semanaFin.toISOString()),
    supabase.from('leads').select('id').eq('broker_id', brokerId).gte('creado_en', semanaInicioAnterior.toISOString()).lt('creado_en', semanaInicio),
    supabase.from('leads').select('id, nombre, estado, score_ia, score_etiqueta, score_accion').eq('broker_id', brokerId).gte('score_ia', 75).not('estado', 'in', '("cerrado","descartado")'),
    supabase.from('propiedades').select('id', { count: 'exact' }).eq('broker_id', brokerId).eq('estatus', 'Activa'),
    supabase.from('lead_notas').select('id, contenido, fecha_recordatorio').eq('broker_id', brokerId).eq('tipo', 'recordatorio').eq('completado', false).lte('fecha_recordatorio', semanaFin.toISOString()),
  ])

  const leadsNuevos = leadsEstaSemana?.length ?? 0
  const leadsNuevosAntes = leadsSemanaAnterior?.length ?? 0
  const cerradosEstaSemana = leadsEstaSemana?.filter((l: any) => l.estado?.toLowerCase() === 'cerrado') ?? []
  
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
    cerradosEstaSemana: cerradosEstaSemana.length,
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
  const cacheKey = `briefing-email:${broker.id}:${metricas.semana}`
  const cached = await supabase.from('ai_cache').select('contenido').eq('cache_key', cacheKey).single()
  
  if (cached.data?.contenido) return cached.data.contenido

  if (metricas.leadsCalientes.length === 0 && metricas.cerradosEstaSemana === 0) return null

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
  
  // 🚀 MEJORA QUIRÚRGICA: Reglas estrictas Anti-Alucinación (NOM-247)
  return `Eres el asistente ejecutivo de ${broker.nombre_comercial}, asesor inmobiliario en México.
Escribe el párrafo de apertura de su resumen semanal por email. Máximo 2 oraciones.

Datos de la semana:
- Leads nuevos: ${metricas.leadsNuevos} (${metricas.delta > 0 ? '+' : ''}${metricas.delta}% vs semana anterior)
- Operaciones cerradas: ${metricas.cerradosEstaSemana}
- Leads calientes que necesitan atención:
${lineasCalientes || '  Ninguno'}
- Recordatorios pendientes: ${metricas.recordatoriosPendientes}

Reglas:
- Tono: profesional, directo y ejecutivo.
- ESTRICTAMENTE PROHIBIDO inventar datos, prometer "plusvalía garantizada", "rendimientos" o usar superlativos exagerados ("el mejor").
- Primera oración: el dato más importante de la semana (logro o urgencia).
- Segunda oración: la acción más crítica sugerida para hoy lunes.
- Sin saludos, sin despedidas, sin emojis, en español mexicano.
- Retorna SOLO el párrafo, sin comillas ni formato Markdown.`
}
