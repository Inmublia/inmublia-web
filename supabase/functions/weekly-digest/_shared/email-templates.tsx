import React from 'npm:react'
import { Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Preview, Img } from 'npm:@react-email/components'
import { render } from 'npm:@react-email/render'

interface WeeklyDigestProps {
  broker: any; 
  metricas: any; 
  briefing: string | null; 
  semanaInicio: string;
}

function formatearSemana(semanaInicio: string) {
  const fecha = new Date(`${semanaInicio}T12:00:00Z`);
  return fecha.toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function renderWeeklyDigest(props: WeeklyDigestProps) {
  const html = await render(<WeeklyDigestEmail {...props} />)
  const text = generarTextoPlano(props)
  return { html, text }
}

function WeeklyDigestEmail({ broker, metricas, briefing, semanaInicio }: WeeklyDigestProps) {
  const semanaLabel = formatearSemana(semanaInicio)
  const nombre = broker.nombre_comercial?.split(' ')[0] ?? 'Ejecutivo'
  
  // Paleta Enterprise Clean (Stripe/Linear vibes)
  const t = {
    black: '#09090B',
    white: '#FFFFFF',
    brand: '#2563EB',
    textMain: '#18181B',
    textMuted: '#71717A',
    bg: '#FAFAFA',
    border: '#E4E4E7',
    success: '#10B981',
    alert: '#F59E0B'
  }

  return (
    <Html lang="es" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Preview>Reporte Ejecutivo Inmublia - Semana del {semanaLabel}</Preview>
      <Body style={{ margin: '0', padding: '40px 0', backgroundColor: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
        <Container style={{ maxWidth: '640px', margin: '0 auto', backgroundColor: t.white, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          
          {/* Header Black */}
          <Section style={{ backgroundColor: t.black, padding: '40px' }}>
            <Row>
              <Column>
                <Img 
                  src="https://app.inmublia.com/logo.png" 
                  width="130" 
                  height="auto" 
                  alt="Inmublia" 
                  style={{ display: 'block', outline: 'none', border: 'none', textDecoration: 'none' }}
                />
              </Column>
              <Column align="right">
                <Text style={{ color: t.white, opacity: 0.6, fontSize: '12px', margin: '0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {broker.plan_suscripcion?.toUpperCase() ?? 'PRO'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Intro & AI Briefing */}
          <Section style={{ padding: '40px 40px 20px' }}>
            <Text style={{ color: t.textMuted, fontSize: '13px', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Semana del {semanaLabel}
            </Text>
            <Text style={{ fontSize: '24px', fontWeight: '600', color: t.textMain, margin: '0 0 30px', letterSpacing: '-0.5px' }}>
              Hola, {nombre}.
            </Text>
            
            {briefing && (
              <div style={{ paddingLeft: '20px', borderLeft: `2px solid ${t.brand}`, marginBottom: '40px' }}>
                <Text style={{ fontSize: '11px', fontWeight: '700', color: t.brand, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Análisis Estratégico AI
                </Text>
                <Text style={{ fontSize: '16px', lineHeight: '1.6', color: t.textMain, margin: '0', fontWeight: '400' }}>
                  {briefing}
                </Text>
              </div>
            )}
          </Section>

          {/* Clean KPIs */}
          <Section style={{ padding: '0 40px 40px' }}>
            <Row>
              <Column style={{ width: '33.3%' }}>
                <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px', fontWeight: '500' }}>Nuevos Leads</Text>
                <Text style={{ fontSize: '40px', fontWeight: '300', color: t.textMain, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.leadsNuevos}</Text>
                <Text style={{ fontSize: '12px', color: metricas.delta >= 0 ? t.success : t.textMuted, margin: '0', fontWeight: '500' }}>
                  {metricas.delta > 0 ? `+${metricas.delta}%` : metricas.delta < 0 ? `${metricas.delta}%` : '-'} vs ant.
                </Text>
              </Column>
              <Column style={{ width: '33.3%' }}>
                <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px', fontWeight: '500' }}>Cierres</Text>
                <Text style={{ fontSize: '40px', fontWeight: '300', color: metricas.cerradosEstaSemana > 0 ? t.success : t.textMain, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.cerradosEstaSemana}</Text>
                <Text style={{ fontSize: '12px', color: metricas.cerradosEstaSemana > 0 ? t.success : t.textMuted, margin: '0', fontWeight: '500' }}>
                  Esta semana
                </Text>
              </Column>
              <Column style={{ width: '33.3%' }}>
                <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 8px', fontWeight: '500' }}>Cartera</Text>
                <Text style={{ fontSize: '40px', fontWeight: '300', color: t.textMain, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.totalPropiedades}</Text>
                <Text style={{ fontSize: '12px', color: t.textMuted, margin: '0', fontWeight: '500' }}>Activas</Text>
              </Column>
            </Row>
          </Section>

          {/* Oportunidades Prioritarias */}
          {metricas.leadsCalientes && metricas.leadsCalientes.length > 0 && (
            <Section style={{ padding: '0 40px 40px' }}>
              <Text style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Oportunidades Críticas
              </Text>
              {metricas.leadsCalientes.map((lead: any, i: number) => (
                <Row key={i} style={{ padding: '16px 0', borderTop: `1px solid ${t.border}` }}>
                  <Column>
                    <Text style={{ fontSize: '15px', fontWeight: '500', color: t.textMain, margin: '0 0 4px' }}>{lead.nombre}</Text>
                    <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0' }}>{lead.score_accion}</Text>
                  </Column>
                  <Column align="right">
                    <Text style={{ fontSize: '18px', fontWeight: '500', color: t.alert, margin: '0' }}>{lead.score_ia}</Text>
                    <Text style={{ fontSize: '10px', color: t.textMuted, margin: '0', fontWeight: '600', textTransform: 'uppercase' }}>Score</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* Acciones */}
          <Section style={{ padding: '0 40px 40px' }}>
            <Button href="https://app.inmublia.com/admin" style={{ backgroundColor: t.black, color: t.white, padding: '16px 0', borderRadius: '8px', fontSize: '15px', fontWeight: '500', textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%' }}>
              Ingresar al Dashboard
            </Button>
            {metricas.recordatoriosPendientes > 0 && (
              <Text style={{ fontSize: '13px', color: t.textMuted, margin: '16px 0 0', textAlign: 'center' }}>
                Tienes {metricas.recordatoriosPendientes} tareas programadas pendientes.
              </Text>
            )}
          </Section>

          {/* Footer minimalista */}
          <Section style={{ padding: '30px 40px', backgroundColor: t.bg, borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
            <Text style={{ fontSize: '12px', color: t.textMuted, margin: '0 0 8px' }}>
              Inmublia Software — Inteligencia Inmobiliaria
            </Text>
            <Text style={{ fontSize: '11px', color: t.textMuted, margin: '0' }}>
              <Link href={`https://app.inmublia.com/unsubscribe?token=${broker.email_unsubscribe_token}`} style={{ color: t.textMuted, textDecoration: 'underline' }}>
                Ajustar preferencias de correo
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

function generarTextoPlano(props: WeeklyDigestProps): string {
  const { metricas, semanaInicio } = props
  const calientes = (metricas.leadsCalientes || []).map((l: any) => `- ${l.nombre} (Score IA: ${l.score_ia})`).join('\n')
  
  return `
INMUBLIA - REPORTE EJECUTIVO
Semana del: ${formatearSemana(semanaInicio)}
-------------------------------------
Nuevos Leads: ${metricas.leadsNuevos}
Cierres: ${metricas.cerradosEstaSemana}
Propiedades Activas: ${metricas.totalPropiedades}

Oportunidades críticas:
${calientes.length > 0 ? calientes : 'Al día.'}

Ingresa al dashboard: https://app.inmublia.com/admin
  `.trim()
}
