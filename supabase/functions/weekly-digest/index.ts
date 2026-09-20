import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4'
import { obtenerMetricasSemana, generarBriefingIA, generarAsunto, hayContenidoRelevante } from './_shared/metricas.ts'
import { renderWeeklyDigest } from './_shared/email-templates.tsx'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

function getLunesPasado() {
  const hoy = new Date();
  const diaSemana = hoy.getDay() || 7; 
  hoy.setDate(hoy.getDate() - diaSemana - 6);
  return hoy.toISOString().split('T')[0];
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)) {
      return new Response('No autorizado', { status: 401 })
    }

    const semanaInicio = getLunesPasado()

    const { data: brokers, error: brokersError } = await supabase
      .from('brokers')
      .select('id, nombre_comercial, email, plan_suscripcion, ia_creditos_disponibles, email_unsubscribe_token, email_digest_hora')
      .eq('status_suscripcion', 'activa')
      .eq('email_digest_activo', true)
      .not('email', 'is', null)

    if (brokersError) throw new Error(`Error obteniendo brokers: ${brokersError.message}`)
    
    console.log(`[weekly-digest] Procesando ${brokers?.length ?? 0} brokers`)

    const BATCH_SIZE = 10
    const resultados = { enviados: 0, errores: 0, omitidos: 0 }

    for (let i = 0; i < (brokers?.length ?? 0); i += BATCH_SIZE) {
      const lote = brokers!.slice(i, i + BATCH_SIZE)
      
      await Promise.allSettled(lote.map(broker =>
        procesarBroker(broker, semanaInicio, resultados)
      ))

      if (i + BATCH_SIZE < brokers!.length) {
        await new Promise(r => setTimeout(r, 5000))
      }
    }

    console.log(`[weekly-digest] Completado:`, resultados)
    return new Response(JSON.stringify({ ok: true, ...resultados }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('[weekly-digest] Error fatal:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})

async function procesarBroker(broker: any, semanaInicio: string, resultados: any): Promise<void> {
  try {
    const { data: yaEnviado } = await supabase
      .from('email_digest_log')
      .select('id')
      .eq('broker_id', broker.id)
      .eq('semana_inicio', semanaInicio)
      .not('estado', 'eq', 'error')
      .single()

    if (yaEnviado) {
      resultados.omitidos++
      return
    }

    const metricas = await obtenerMetricasSemana(supabase, broker.id, semanaInicio)

    if (!hayContenidoRelevante(metricas)) {
      resultados.omitidos++
      return
    }

    const briefing = await generarBriefingIA(supabase, broker, metricas)

    const { html, text } = await renderWeeklyDigest({
      broker,
      metricas,
      briefing,
      semanaInicio,
    })

    const asunto = generarAsunto(broker, metricas)

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: 'Inmublia <digest@inmublia.com>',
      to: broker.email,
      subject: asunto,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<https://inmublia.com/unsubscribe?token=${broker.email_unsubscribe_token}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Inmublia-Broker-Id': broker.id,
        'X-Inmublia-Week': semanaInicio,
      },
      tags: [
        { name: 'tipo', value: 'weekly-digest' },
        { name: 'plan', value: broker.plan_suscripcion ?? 'basico' },
        { name: 'semana', value: semanaInicio },
      ]
    })

    if (resendError) throw new Error(`Resend: ${resendError.message}`)

    await supabase.from('email_digest_log').insert({
      broker_id: broker.id,
      semana_inicio: semanaInicio,
      estado: 'enviado',
      resend_id: resendData?.id,
      metricas_json: metricas,
      enviado_en: new Date().toISOString(),
    })

    resultados.enviados++
  } catch (err) {
    console.error(`[weekly-digest] Error en broker ${broker.id}:`, err.message)
    await supabase.from('email_digest_log').insert({
      broker_id: broker.id,
      semana_inicio: semanaInicio,
      estado: 'error',
      error_mensaje: err.message,
    }).catch(() => {}) 
    resultados.errores++
  }
}
