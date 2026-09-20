import React from 'npm:react'
import { Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Hr, Preview } from 'npm:@react-email/components'
import { renderAsync } from 'npm:@react-email/render'

interface WeeklyDigestProps {
  broker: any; metricas: any; briefing: string | null; semanaInicio: string;
}

function formatearSemana(semanaInicio: string) {
  return new Date(semanaInicio).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export async function renderWeeklyDigest(props: WeeklyDigestProps) {
  const html = await renderAsync(<WeeklyDigestEmail {...props} />)
  const text = generarTextoPlano(props)
  return { html, text }
}

function WeeklyDigestEmail({ broker, metricas, briefing, semanaInicio }: WeeklyDigestProps) {
  const semanaLabel = formatearSemana(semanaInicio)
  const nombre = broker.nombre_comercial?.split(' ')[0] ?? 'Asesor'
  
  const c = {
    navy: '#0F2444', blue: '#2563EB', green: '#10B981', amber: '#F59E0B', red: '#EF4444',
    orange: '#F97316', slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0',
    slate500: '#64748B', slate700: '#334155', slate900: '#0F172A', white: '#FFFFFF',
  }

  return (
    <Html lang="es" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
      </Head>
      <Preview>
        {metricas.leadsCalientes.length > 0
          ? `🔥 ${metricas.leadsCalientes[0].nombre} necesita tu atención hoy`
          : `${metricas.leadsNuevos} leads nuevos esta semana — ${semanaLabel}`
        }
      </Preview>
      <Body style={{ margin: '0', padding: '0', backgroundColor: c.slate50, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Section style={{ backgroundColor: c.navy, padding: '28px 32px 24px', borderRadius: '0 0 0 0' }}>
            <Row>
              <Column>
                <Text style={{ color: c.white, fontSize: '18px', fontWeight: '700', margin: '0 0 4px' }}>🏠 Inmublia</Text>
                <Text style={{ color: '#7BA4D4', fontSize: '12px', margin: '0' }}>Resumen semanal · {semanaLabel}</Text>
              </Column>
              <Column align="right">
                <Text style={{ color: '#7BA4D4', fontSize: '11px', margin: '0', fontWeight: '500' }}>{broker.plan_suscripcion?.toUpperCase() ?? 'BÁSICO'}</Text>
              </Column>
            </Row>
          </Section>
          
          <Section style={{ backgroundColor: c.white, padding: '28px 32px 0' }}>
            <Text style={{ fontSize: '22px', fontWeight: '700', color: c.slate900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Buenos días, {nombre} 👋</Text>
            {briefing && (
              <Text style={{ fontSize: '15px', lineHeight: '1.6', color: c.slate700, margin: '0 0 24px', borderLeft: `3px solid ${c.blue}`, paddingLeft: '14px' }}>
                {briefing}
              </Text>
            )}
          </Section>

          <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
            <Row>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <div style={{ backgroundColor: c.slate50, borderRadius: '10px', padding: '16px', textAlign: 'center', border: `1px solid ${c.slate200}` }}>
                  <Text style={{ fontSize: '28px', fontWeight: '800', color: c.blue, margin: '0', letterSpacing: '-1px' }}>{metricas.leadsNuevos}</Text>
                  <Text style={{ fontSize: '11px', color: c.slate500, margin: '4px 0 0', fontWeight: '500' }}>Leads nuevos</Text>
                  <Text style={{ fontSize: '11px', color: metricas.deltaPositivo ? c.green : c.red, margin: '4px 0 0', fontWeight: '700' }}>
                    {metricas.deltaPositivo ? '↑' : '↓'} {Math.abs(metricas.delta)}% vs sem. ant.
                  </Text>
                </div>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px', paddingLeft: '8px' }}>
                <div style={{ backgroundColor: metricas.cerradosEstaSemana > 0 ? '#F0FDF4' : c.slate50, borderRadius: '10px', padding: '16px', textAlign: 'center', border: `1px solid ${metricas.cerradosEstaSemana > 0 ? '#BBF7D0' : c.slate200}` }}>
                  <Text style={{ fontSize: '28px', fontWeight: '800', color: metricas.cerradosEstaSemana > 0 ? c.green : c.slate500, margin: '0', letterSpacing: '-1px' }}>{metricas.cerradosEstaSemana}</Text>
                  <Text style={{ fontSize: '11px', color: c.slate500, margin: '4px 0 0', fontWeight: '500' }}>{metricas.cerradosEstaSemana === 1 ? 'Cierre' : 'Cierres'}</Text>
                  <Text style={{ fontSize: '11px', color: metricas.cerradosEstaSemana > 0 ? c.green : c.slate500, margin: '4px 0 0', fontWeight: '700' }}>
                    {metricas.cerradosEstaSemana > 0 ? '¡Excelente!' : 'Esta semana'}
                  </Text>
                </div>
              </Column>
              <Column style={{ width: '33%', paddingLeft: '8px' }}>
                <div style={{ backgroundColor: c.slate50, borderRadius: '10px', padding: '16px', textAlign: 'center', border: `1px solid ${c.slate200}` }}>
                  <Text style={{ fontSize: '28px', fontWeight: '800', color: c.slate700, margin: '0', letterSpacing: '-1px' }}>{metricas.totalPropiedades}</Text>
                  <Text style={{ fontSize: '11px', color: c.slate500, margin: '4px 0 0', fontWeight: '500' }}>Propiedades activas</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {metricas.leadsCalientes.length > 0 && (
            <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
              <Hr style={{ borderColor: c.slate100, margin: '0 0 20px' }} />
              <Text style={{ fontSize: '13px', fontWeight: '700', color: c.slate900, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔥 Leads calientes — actúa hoy</Text>
              {metricas.leadsCalientes.map((lead: any, i: number) => (
                <div key={i} style={{ backgroundColor: '#FFF7ED', borderRadius: '10px', padding: '14px 16px', marginBottom: '8px', border: '1px solid #FED7AA' }}>
                  <Row>
                    <Column>
                      <Text style={{ fontSize: '14px', fontWeight: '700', color: c.slate900, margin: '0 0 2px' }}>{lead.nombre}</Text>
                      <Text style={{ fontSize: '12px', color: '#92400E', margin: '0', lineHeight: '1.4' }}>👉 {lead.score_accion}</Text>
                    </Column>
                    <Column align="right" style={{ minWidth: '60px' }}>
                      <Text style={{ fontSize: '18px', fontWeight: '800', color: c.orange, margin: '0' }}>{lead.score_ia}</Text>
                      <Text style={{ fontSize: '9px', color: '#92400E', margin: '0', textAlign: 'right' }}>SCORE</Text>
                    </Column>
                  </Row>
                </div>
              ))}
              <Button href="https://app.inmublia.com/admin/leads" style={{ backgroundColor: c.orange, color: c.white, padding: '12px 24px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}>Ver mis leads →</Button>
            </Section>
          )}

          {metricas.recordatoriosPendientes > 0 && (
            <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
              <Hr style={{ borderColor: c.slate100, margin: '0 0 20px' }} />
              <Row>
                <Column>
                  <Text style={{ fontSize: '13px', fontWeight: '700', color: c.slate900, margin: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📋 Tienes {metricas.recordatoriosPendientes} recordatorios pendientes
                  </Text>
                </Column>
                <Column align="right">
                  <Link href="https://app.inmublia.com/admin/leads" style={{ fontSize: '12px', color: c.blue, fontWeight: '600' }}>Ver todos →</Link>
                </Column>
              </Row>
            </Section>
          )}

          <Section style={{ backgroundColor: c.navy, padding: '28px 32px', textAlign: 'center' }}>
            <Text style={{ fontSize: '16px', fontWeight: '700', color: c.white, margin: '0 0 8px' }}>
              {metricas.recordatoriosPendientes > 0 ? 'El seguimiento rápido marca la diferencia.' : 'Tu pipeline está al día 🎉'}
            </Text>
            <Button href="https://app.inmublia.com/admin" style={{ backgroundColor: c.blue, color: c.white, padding: '14px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textDecoration: 'none' }}>Abrir mi CRM →</Button>
          </Section>

          <Section style={{ padding: '20px 32px', textAlign: 'center' }}>
            <Text style={{ fontSize: '11px', color: c.slate500, margin: '0 0 6px' }}>Inmublia · Tu CRM inmobiliario</Text>
            <Text style={{ fontSize: '11px', color: c.slate500, margin: '0' }}>
              <Link href={`https://app.inmublia.com/unsubscribe?token=${broker.email_unsubscribe_token}`} style={{ color: c.slate500, textDecoration: 'underline' }}>
                Cancelar suscripción a este resumen
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function generarTextoPlano(props: WeeklyDigestProps): string {
  const { broker, metricas, semanaInicio } = props
  return `Resumen Inmublia - ${formatearSemana(semanaInicio)}\nNuevos: ${metricas.leadsNuevos} | Cierres: ${metricas.cerradosEstaSemana}\nVer CRM: https://app.inmublia.com/admin`
}
