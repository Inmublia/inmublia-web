import React from 'npm:react'
import { Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Hr, Preview, Img } from 'npm:@react-email/components'
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
  
  // Paleta Enterprise (Tailwind Base)
  const theme = {
    bg: '#F8FAFC',          // slate-50
    surface: '#FFFFFF',     // white
    border: '#E2E8F0',      // slate-200
    borderLight: '#F1F5F9', // slate-100
    primary: '#0F172A',     // slate-900 (Textos principales)
    secondary: '#475569',   // slate-600 (Textos secundarios)
    accent: '#0F2444',      // Inmublia Navy Brand
    brandBlue: '#2563EB',   // blue-600 (CTAs y links)
    success: '#059669',     // emerald-600
    successBg: '#ECFDF5',   // emerald-50
    warning: '#D97706',     // amber-600
    warningBg: '#FFFBEB'    // amber-50
  }

  return (
    <Html lang="es" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
      </Head>
      <Preview>
        {metricas.leadsCalientes?.length > 0
          ? `Reporte Ejecutivo: ${metricas.leadsCalientes[0].nombre} requiere atención prioritaria hoy.`
          : `Reporte Ejecutivo de Pipeline - Semana del ${semanaLabel}`}
      </Preview>
      <Body style={{ margin: '0', padding: '0', backgroundColor: theme.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '40px auto', backgroundColor: theme.surface, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${theme.border}`, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)' }}>
          
          {/* Header Corporativo */}
          <Section style={{ padding: '32px 32px 24px', borderBottom: `1px solid ${theme.borderLight}` }}>
            <Row>
              <Column>
                {/* INSERTA AQUÍ LA URL REAL DE TU LOGO */}
                <Img 
                  src="https://app.inmublia.com/assets/logo-dark.png" 
                  width="110" 
                  height="auto" 
                  alt="Inmublia" 
                  style={{ display: 'block', outline: 'none', border: 'none', textDecoration: 'none' }}
                />
              </Column>
              <Column align="right">
                <Text style={{ color: theme.secondary, fontSize: '12px', margin: '0', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reporte Confidencial
                </Text>
                <Text style={{ color: theme.primary, fontSize: '13px', margin: '4px 0 0', fontWeight: '600' }}>
                  {semanaLabel}
                </Text>
              </Column>
            </Row>
          </Section>
          
          {/* Executive Summary (IA) */}
          <Section style={{ padding: '32px 32px 0' }}>
            <Text style={{ fontSize: '20px', fontWeight: '700', color: theme.primary, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
              Estimado {nombre},
            </Text>
            
            {briefing && (
              <div style={{ backgroundColor: theme.bg, borderLeft: `3px solid ${theme.brandBlue}`, padding: '20px', marginBottom: '32px' }}>
                <Text style={{ fontSize: '11px', fontWeight: '700', color: theme.secondary, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Análisis de Inteligencia de Negocios
                </Text>
                <Text style={{ fontSize: '15px', lineHeight: '1.6', color: theme.primary, margin: '0' }}>
                  {briefing}
                </Text>
              </div>
            )}
          </Section>

          {/* Core Metrics Grid */}
          <Section style={{ padding: '0 32px 32px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', color: theme.primary, margin: '0 0 16px' }}>
              Rendimiento del Pipeline
            </Text>
            <Row>
              {/* Nuevos Leads */}
              <Column style={{ width: '33.33%', paddingRight: '8px' }}>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '16px', height: '100%' }}>
                  <Text style={{ fontSize: '12px', color: theme.secondary, margin: '0 0 8px', fontWeight: '500' }}>Volumen de Leads</Text>
                  <Text style={{ fontSize: '28px', fontWeight: '700', color: theme.primary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{metricas.leadsNuevos}</Text>
                  <Text style={{ fontSize: '12px', color: metricas.deltaPositivo ? theme.success : theme.secondary, margin: '0', fontWeight: '500' }}>
                    {metricas.deltaPositivo && metricas.delta > 0 ? `+${metricas.delta}% vs ant.` : metricas.delta < 0 ? `${metricas.delta}% vs ant.` : 'Sin variación'}
                  </Text>
                </div>
              </Column>
              
              {/* Cierres */}
              <Column style={{ width: '33.33%', paddingRight: '4px', paddingLeft: '4px' }}>
                <div style={{ backgroundColor: metricas.cerradosEstaSemana > 0 ? theme.successBg : theme.surface, border: `1px solid ${metricas.cerradosEstaSemana > 0 ? '#A7F3D0' : theme.border}`, borderRadius: '6px', padding: '16px', height: '100%' }}>
                  <Text style={{ fontSize: '12px', color: theme.secondary, margin: '0 0 8px', fontWeight: '500' }}>Operaciones Cerradas</Text>
                  <Text style={{ fontSize: '28px', fontWeight: '700', color: metricas.cerradosEstaSemana > 0 ? theme.success : theme.primary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{metricas.cerradosEstaSemana}</Text>
                  <Text style={{ fontSize: '12px', color: metricas.cerradosEstaSemana > 0 ? theme.success : theme.secondary, margin: '0', fontWeight: '500' }}>
                    {metricas.cerradosEstaSemana > 0 ? 'Objetivo alcanzado' : 'Pendiente'}
                  </Text>
                </div>
              </Column>
              
              {/* Propiedades */}
              <Column style={{ width: '33.33%', paddingLeft: '8px' }}>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '16px', height: '100%' }}>
                  <Text style={{ fontSize: '12px', color: theme.secondary, margin: '0 0 8px', fontWeight: '500' }}>Cartera Activa</Text>
                  <Text style={{ fontSize: '28px', fontWeight: '700', color: theme.primary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{metricas.totalPropiedades}</Text>
                  <Text style={{ fontSize: '12px', color: theme.secondary, margin: '0', fontWeight: '500' }}>
                    Propiedades
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Origen de Leads */}
          {metricas.topFuentes && metricas.topFuentes.length > 0 && (
            <Section style={{ padding: '0 32px 32px' }}>
              <Text style={{ fontSize: '14px', fontWeight: '600', color: theme.primary, margin: '0 0 16px' }}>
                Distribución de Adquisición
              </Text>
              <div style={{ border: `1px solid ${theme.border}`, borderRadius: '6px' }}>
                {metricas.topFuentes.slice(0, 3).map((fuente: any, i: number) => (
                  <Row key={i} style={{ borderBottom: i === metricas.topFuentes.slice(0, 3).length - 1 ? 'none' : `1px solid ${theme.borderLight}`, padding: '12px 16px' }}>
                    <Column><Text style={{ margin: 0, fontSize: '13px', color: theme.secondary }}>{fuente.fuente}</Text></Column>
                    <Column align="right"><Text style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: theme.primary }}>{fuente.count}</Text></Column>
                  </Row>
                ))}
              </div>
            </Section>
          )}

          {/* Oportunidades Prioritarias */}
          {metricas.leadsCalientes && metricas.leadsCalientes.length > 0 && (
            <Section style={{ padding: '0 32px 32px' }}>
              <Hr style={{ borderColor: theme.border, margin: '0 0 32px' }} />
              <Text style={{ fontSize: '14px', fontWeight: '600', color: theme.primary, margin: '0 0 16px' }}>
                Oportunidades de Alta Prioridad
              </Text>
              {metricas.leadsCalientes.map((lead: any, i: number) => (
                <div key={i} style={{ backgroundColor: theme.warningBg, border: `1px solid #FDE68A`, borderRadius: '6px', padding: '16px', marginBottom: '8px' }}>
                  <Row>
                    <Column>
                      <Text style={{ fontSize: '14px', fontWeight: '600', color: theme.primary, margin: '0 0 4px' }}>{lead.nombre}</Text>
                      <Text style={{ fontSize: '13px', color: theme.warning, margin: '0', fontWeight: '500' }}>
                        Acción sugerida: {lead.score_accion}
                      </Text>
                    </Column>
                    <Column align="right" style={{ minWidth: '80px', verticalAlign: 'top' }}>
                      <Text style={{ fontSize: '18px', fontWeight: '700', color: theme.warning, margin: '0', textAlign: 'right' }}>{lead.score_ia}</Text>
                      <Text style={{ fontSize: '10px', color: theme.warning, margin: '0', fontWeight: '600', textAlign: 'right', textTransform: 'uppercase' }}>Score</Text>
                    </Column>
                  </Row>
                </div>
              ))}
            </Section>
          )}

          {/* Acciones y CRM */}
          <Section style={{ padding: '0 32px 32px' }}>
            {metricas.recordatoriosPendientes > 0 && (
              <Text style={{ fontSize: '13px', color: theme.secondary, margin: '0 0 20px', fontWeight: '500' }}>
                Requiere atención: Tiene {metricas.recordatoriosPendientes} tareas programadas para esta semana.
              </Text>
            )}
            <Button href="https://app.inmublia.com/admin" style={{ backgroundColor: theme.brandBlue, color: theme.surface, padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '500', textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%' }}>
              Acceder al Dashboard Inmublia
            </Button>
          </Section>

          {/* Footer Legal */}
          <Section style={{ backgroundColor: theme.bg, padding: '24px 32px', textAlign: 'center', borderTop: `1px solid ${theme.border}` }}>
            <Text style={{ fontSize: '12px', color: theme.secondary, margin: '0 0 8px', fontWeight: '500' }}>
              Inmublia Software de Gestión Inmobiliaria
            </Text>
            <Text style={{ fontSize: '11px', color: theme.secondary, margin: '0' }}>
              Este es un reporte automatizado generado para {broker.nombre_comercial}.{' '}
              <Link href={`https://app.inmublia.com/unsubscribe?token=${broker.email_unsubscribe_token}`} style={{ color: theme.brandBlue, textDecoration: 'none' }}>
                Preferencias de notificación
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
  const calientes = (metricas.leadsCalientes || []).map((l: any) => `- ${l.nombre} (Score IA: ${l.score_ia})`).join('\n')
  
  return `
INMUBLIA - REPORTE EJECUTIVO
Semana del: ${formatearSemana(semanaInicio)}
-------------------------------------
Nuevos Leads: ${metricas.leadsNuevos}
Cierres: ${metricas.cerradosEstaSemana}
Propiedades Activas: ${metricas.totalPropiedades}

OPORTUNIDADES DE ALTA PRIORIDAD:
${calientes.length > 0 ? calientes : 'Sin leads críticos reportados.'}

Tareas Pendientes: ${metricas.recordatoriosPendientes}

Acceder al sistema: 
https://app.inmublia.com/admin
  `.trim()
}
