import React from 'npm:react'
import { Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Preview } from 'npm:@react-email/components'
import { render } from 'npm:@react-email/render'

interface WeeklyDigestProps {
  broker: any; 
  metricas: any; 
  briefing: string | null; 
  semanaInicio: string;
}

function formatearSemana(semanaInicio: string) {
  const fecha = new Date(`${semanaInicio}T12:00:00Z`);
  return fecha.toLocaleDateString('es-MX', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export async function renderWeeklyDigest(props: WeeklyDigestProps) {
  const html = await render(<WeeklyDigestEmail {...props} />)
  const text = generarTextoPlano(props)
  return { html, text }
}

function WeeklyDigestEmail({ broker, metricas, briefing, semanaInicio }: WeeklyDigestProps) {
  const semanaLabel = formatearSemana(semanaInicio)
  const nombre = broker.nombre_comercial?.split(' ')[0] ?? 'Ejecutivo'
  
  // Paleta Premium Dark Mode (OLED Black base)
  const t = {
    bg: '#000000', // Negro puro para el fondo exterior
    surface: '#0A0A0A', // Negro OLED para el contenedor principal
    card: '#121214', // Fondo para dar peso a las métricas
    border: '#27272A', // zinc-800
    brand: '#3B82F6', // blue-500
    brandSubtle: 'rgba(59, 130, 246, 0.1)',
    textMain: '#FFFFFF', // Blanco
    textMuted: '#A1A1AA', // zinc-400
    success: '#10B981', // emerald-500
    alert: '#F59E0B' // amber-500
  }

  return (
    <Html lang="es" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
      </Head>
      <Preview>Reporte Ejecutivo Inmublia - Semana del {semanaLabel}</Preview>
      <Body style={{ margin: '0', padding: '40px 16px', backgroundColor: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif' }}>
        
        {/* Contenedor expandido a 680px para aprovechar los espacios laterales */}
        <Container style={{ maxWidth: '680px', margin: '0 auto', backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          
          {/* Header Dark Premium con Logotipo Tipográfico */}
          <Section style={{ padding: '32px 40px', borderBottom: `1px solid ${t.border}` }}>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: t.textMain, letterSpacing: '-1px' }}>
                  INMUBLIA<span style={{ color: t.brand }}>.</span>
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ color: t.textMuted, fontSize: '11px', margin: '0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  {broker.plan_suscripcion?.toUpperCase() ?? 'PRO'}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Intro & AI Briefing */}
          <Section style={{ padding: '40px 40px 20px' }}>
            <Text style={{ color: t.textMuted, fontSize: '12px', margin: '0 0 12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Semana del {semanaLabel}
            </Text>
            <Text style={{ fontSize: '32px', fontWeight: '600', color: t.textMain, margin: '0 0 32px', letterSpacing: '-1px' }}>
              Hola, {nombre}.
            </Text>
            
            {briefing && (
              <div style={{ padding: '24px', backgroundColor: t.brandSubtle, borderLeft: `3px solid ${t.brand}`, borderRadius: '0 8px 8px 0', marginBottom: '40px' }}>
                <Text style={{ fontSize: '11px', fontWeight: '700', color: t.brand, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  ✨ Análisis Estratégico AI
                </Text>
                <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#E4E4E7', margin: '0', fontWeight: '400' }}>
                  {briefing}
                </Text>
              </div>
            )}
          </Section>

          {/* Clean KPIs en Tarjetas Oscuras */}
          <Section style={{ padding: '0 40px 40px' }}>
            <Row>
              <Column style={{ width: '33.3%', paddingRight: '8px' }}>
                <div style={{ padding: '24px', border: `1px solid ${t.border}`, borderRadius: '10px', backgroundColor: t.card }}>
                    <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 12px', fontWeight: '500' }}>Nuevos Leads</Text>
                    <Text style={{ fontSize: '48px', fontWeight: '300', color: t.textMain, margin: '0 0 8px', letterSpacing: '-2px' }}>{metricas.leadsNuevos}</Text>
                    <Text style={{ fontSize: '12px', color: metricas.delta >= 0 ? t.success : t.textMuted, margin: '0', fontWeight: '600' }}>
                      {metricas.delta > 0 ? `↑ ${metricas.delta}%` : metricas.delta < 0 ? `↓ ${Math.abs(metricas.delta)}%` : '-'} vs ant.
                    </Text>
                </div>
              </Column>
              <Column style={{ width: '33.3%', paddingRight: '4px', paddingLeft: '4px' }}>
                <div style={{ padding: '24px', border: `1px solid ${t.border}`, borderRadius: '10px', backgroundColor: t.card }}>
                    <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 12px', fontWeight: '500' }}>Cierres</Text>
                    <Text style={{ fontSize: '48px', fontWeight: '300', color: metricas.cerradosEstaSemana > 0 ? t.success : t.textMain, margin: '0 0 8px', letterSpacing: '-2px' }}>{metricas.cerradosEstaSemana}</Text>
                    <Text style={{ fontSize: '12px', color: metricas.cerradosEstaSemana > 0 ? t.success : t.textMuted, margin: '0', fontWeight: '600' }}>
                      Esta semana
                    </Text>
                </div>
              </Column>
              <Column style={{ width: '33.3%', paddingLeft: '8px' }}>
                <div style={{ padding: '24px', border: `1px solid ${t.border}`, borderRadius: '10px', backgroundColor: t.card }}>
                    <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0 0 12px', fontWeight: '500' }}>Cartera</Text>
                    <Text style={{ fontSize: '48px', fontWeight: '300', color: t.textMain, margin: '0 0 8px', letterSpacing: '-2px' }}>{metricas.totalPropiedades}</Text>
                    <Text style={{ fontSize: '12px', color: t.textMuted, margin: '0', fontWeight: '600' }}>Activas</Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Oportunidades Prioritarias */}
          {metricas.leadsCalientes && metricas.leadsCalientes.length > 0 && (
            <Section style={{ padding: '0 40px 40px' }}>
              <Text style={{ fontSize: '12px', fontWeight: '600', color: t.textMuted, margin: '0 0 24px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Oportunidades Críticas
              </Text>
              {metricas.leadsCalientes.map((lead: any, i: number) => (
                <Row key={i} style={{ padding: '20px', border: `1px solid ${t.border}`, borderBottom: 'none', backgroundColor: i % 2 === 0 ? 'transparent' : t.card, ...(i === 0 && { borderRadius: '10px 10px 0 0' }), ...(i === metricas.leadsCalientes.length - 1 && { borderRadius: '0 0 10px 10px', borderBottom: `1px solid ${t.border}` }) }}>
                  <Column>
                    <Text style={{ fontSize: '16px', fontWeight: '500', color: t.textMain, margin: '0 0 6px' }}>{lead.nombre}</Text>
                    <Text style={{ fontSize: '13px', color: t.textMuted, margin: '0' }}>{lead.score_accion}</Text>
                  </Column>
                  <Column align="right">
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: `1px solid rgba(245, 158, 11, 0.2)`, padding: '8px 12px', borderRadius: '6px', display: 'inline-block', textAlign: 'center' }}>
                        <Text style={{ fontSize: '18px', fontWeight: '700', color: t.alert, margin: '0 0 2px' }}>{lead.score_ia}</Text>
                        <Text style={{ fontSize: '9px', color: t.alert, margin: '0', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</Text>
                    </div>
                  </Column>
                </Row>
              ))}
            </Section>
          )}

          {/* Acciones */}
          <Section style={{ padding: '0 40px 40px' }}>
            <Button href="https://app.inmublia.com/admin" style={{ backgroundColor: t.brand, color: t.textMain, padding: '16px 0', borderRadius: '8px', fontSize: '15px', fontWeight: '600', textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%' }}>
              Ingresar al Dashboard
            </Button>
            {metricas.recordatoriosPendientes > 0 && (
              <Text style={{ fontSize: '13px', color: t.textMuted, margin: '20px 0 0', textAlign: 'center' }}>
                Tienes {metricas.recordatoriosPendientes} tareas programadas pendientes.
              </Text>
            )}
          </Section>

          {/* Footer minimalista */}
          <Section style={{ padding: '32px 40px', backgroundColor: '#050505', borderTop: `1px solid ${t.border}`, textAlign: 'center' }}>
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
