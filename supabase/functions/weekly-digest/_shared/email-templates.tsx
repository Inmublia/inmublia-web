import React from 'npm:react'
import { Html, Head, Body, Container, Section, Row, Column, Text, Link, Button, Hr, Preview } from 'npm:@react-email/components'
import { render } from 'npm:@react-email/render'

interface WeeklyDigestProps {
  broker: any; 
  metricas: any; 
  briefing: string | null; 
  semanaInicio: string;
}

function formatearSemana(semanaInicio: string) {
  // Ajuste UTC para garantizar que el render visual coincida con la fecha exacta del SQL
  const fecha = new Date(`${semanaInicio}T12:00:00Z`);
  return fecha.toLocaleDateString('es-MX', { month: 'long', day: 'numeric' });
}

// CORRECCIÓN CRÍTICA: Función declarada como async y usando await en el render 
// para garantizar que devuelva un String y Resend no vuelva a fallar.
export async function renderWeeklyDigest(props: WeeklyDigestProps) {
  const html = await render(<WeeklyDigestEmail {...props} />)
  const text = generarTextoPlano(props)
  return { html, text }
}

function WeeklyDigestEmail({ broker, metricas, briefing, semanaInicio }: WeeklyDigestProps) {
  const semanaLabel = formatearSemana(semanaInicio)
  const nombre = broker.nombre_comercial?.split(' ')[0] ?? 'Asesor'
  
  // Paleta de colores Premium Inmublia (Tailwind based)
  const c = {
    navy: '#0F2444', blue: '#2563EB', green: '#10B981', amber: '#F59E0B', red: '#EF4444',
    orange: '#F97316', slate50: '#F8FAFC', slate100: '#F1F5F9', slate200: '#E2E8F0',
    slate500: '#64748B', slate700: '#334155', slate800: '#1E293B', slate900: '#0F172A', white: '#FFFFFF',
    aiBackground: '#F0F9FF', aiBorder: '#BAE6FD', aiText: '#0369A1'
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
          : `Tu resumen semanal de Inmublia: ${metricas.leadsNuevos} leads nuevos`}
      </Preview>
      <Body style={{ margin: '0', padding: '0', backgroundColor: c.slate50, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '20px auto', backgroundColor: c.white, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${c.slate200}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          
          {/* Header Premium */}
          <Section style={{ backgroundColor: c.navy, padding: '32px 32px 24px' }}>
            <Row>
              <Column>
                <Text style={{ color: c.white, fontSize: '20px', fontWeight: '800', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                  🏠 Inmublia
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: '13px', margin: '0', fontWeight: '500' }}>
                  Inteligencia de Negocio · Semana del {semanaLabel}
                </Text>
              </Column>
              <Column align="right">
                <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '20px', display: 'inline-block' }}>
                  <Text style={{ color: c.white, fontSize: '11px', margin: '0', fontWeight: '600', letterSpacing: '0.5px' }}>
                    {broker.plan_suscripcion?.toUpperCase() ?? 'PRO'}
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>
          
          {/* Saludo y Briefing IA Destacado */}
          <Section style={{ backgroundColor: c.white, padding: '32px 32px 16px' }}>
            <Text style={{ fontSize: '24px', fontWeight: '800', color: c.slate900, margin: '0 0 20px', letterSpacing: '-0.5px' }}>
              Buenos días, {nombre}.
            </Text>
            
            {briefing && (
              <div style={{ backgroundColor: c.aiBackground, border: `1px solid ${c.aiBorder}`, borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
                <Text style={{ fontSize: '12px', fontWeight: '700', color: c.aiText, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ✨ Análisis de Inteligencia Artificial
                </Text>
                <Text style={{ fontSize: '15px', lineHeight: '1.6', color: c.slate800, margin: '0' }}>
                  {briefing}
                </Text>
              </div>
            )}
          </Section>

          {/* KPIs Principales */}
          <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
            <Row>
              <Column style={{ width: '33%', paddingRight: '8px' }}>
                <div style={{ backgroundColor: c.slate50, borderRadius: '12px', padding: '20px 16px', textAlign: 'center', border: `1px solid ${c.slate200}` }}>
                  <Text style={{ fontSize: '32px', fontWeight: '800', color: c.blue, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.leadsNuevos}</Text>
                  <Text style={{ fontSize: '12px', color: c.slate500, margin: '0', fontWeight: '600' }}>Nuevos Leads</Text>
                  <Text style={{ fontSize: '11px', color: metricas.deltaPositivo ? c.green : c.slate500, margin: '6px 0 0', fontWeight: '700' }}>
                    {metricas.deltaPositivo && metricas.delta > 0 ? `+${metricas.delta}%` : metricas.delta < 0 ? `${metricas.delta}%` : 'Sin cambios'} vs ant.
                  </Text>
                </div>
              </Column>
              <Column style={{ width: '33%', paddingRight: '8px', paddingLeft: '8px' }}>
                <div style={{ backgroundColor: metricas.cerradosEstaSemana > 0 ? '#F0FDF4' : c.slate50, borderRadius: '12px', padding: '20px 16px', textAlign: 'center', border: `1px solid ${metricas.cerradosEstaSemana > 0 ? '#BBF7D0' : c.slate200}` }}>
                  <Text style={{ fontSize: '32px', fontWeight: '800', color: metricas.cerradosEstaSemana > 0 ? c.green : c.slate500, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.cerradosEstaSemana}</Text>
                  <Text style={{ fontSize: '12px', color: c.slate500, margin: '0', fontWeight: '600' }}>{metricas.cerradosEstaSemana === 1 ? 'Cierre' : 'Cierres'}</Text>
                  <Text style={{ fontSize: '11px', color: metricas.cerradosEstaSemana > 0 ? c.green : c.slate500, margin: '6px 0 0', fontWeight: '700' }}>
                    {metricas.cerradosEstaSemana > 0 ? '¡Gran trabajo!' : 'Esta semana'}
                  </Text>
                </div>
              </Column>
              <Column style={{ width: '33%', paddingLeft: '8px' }}>
                <div style={{ backgroundColor: c.slate50, borderRadius: '12px', padding: '20px 16px', textAlign: 'center', border: `1px solid ${c.slate200}` }}>
                  <Text style={{ fontSize: '32px', fontWeight: '800', color: c.slate700, margin: '0 0 4px', letterSpacing: '-1px' }}>{metricas.totalPropiedades}</Text>
                  <Text style={{ fontSize: '12px', color: c.slate500, margin: '0', fontWeight: '600' }}>En Cartera</Text>
                  <Text style={{ fontSize: '11px', color: c.slate500, margin: '6px 0 0', fontWeight: '700' }}>
                    Activas
                  </Text>
                </div>
              </Column>
            </Row>
          </Section>

          {/* VALOR AGREGADO: Top Fuentes de Leads (Le da inteligencia comercial al broker) */}
          {metricas.topFuentes && metricas.topFuentes.length > 0 && (
            <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
              <Hr style={{ borderColor: c.slate100, margin: '0 0 24px' }} />
              <Text style={{ fontSize: '13px', fontWeight: '700', color: c.slate900, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📊 Origen de tus clientes esta semana
              </Text>
              <div style={{ border: `1px solid ${c.slate200}`, borderRadius: '10px', padding: '0 16px' }}>
                {metricas.topFuentes.slice(0, 3).map((fuente: any, i: number) => (
                  <Row key={i} style={{ borderBottom: i === metricas.topFuentes.slice(0, 3).length - 1 ? 'none' : `1px solid ${c.slate100}`, padding: '12px 0' }}>
                    <Column><Text style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: c.slate700 }}>{fuente.fuente}</Text></Column>
                    <Column align="right"><Text style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: c.slate900 }}>{fuente.count}</Text></Column>
                  </Row>
                ))}
              </div>
            </Section>
          )}

          {/* Leads Calientes */}
          {metricas.leadsCalientes.length > 0 && (
            <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
              <Hr style={{ borderColor: c.slate100, margin: '0 0 24px' }} />
              <Text style={{ fontSize: '13px', fontWeight: '700', color: c.slate900, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🔥 Oportunidades Listas para Cierre
              </Text>
              {metricas.leadsCalientes.map((lead: any, i: number) => (
                <div key={i} style={{ backgroundColor: '#FFF7ED', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid #FED7AA' }}>
                  <Row>
                    <Column>
                      <Text style={{ fontSize: '16px', fontWeight: '700', color: c.slate900, margin: '0 0 4px' }}>{lead.nombre}</Text>
                      <Text style={{ fontSize: '13px', color: '#92400E', margin: '0', lineHeight: '1.4', fontWeight: '500' }}>
                        Acción sugerida: {lead.score_accion}
                      </Text>
                    </Column>
                    <Column align="right" style={{ minWidth: '70px', verticalAlign: 'top' }}>
                      <div style={{ backgroundColor: c.orange, borderRadius: '6px', padding: '4px 8px', textAlign: 'center' }}>
                        <Text style={{ fontSize: '16px', fontWeight: '800', color: c.white, margin: '0' }}>{lead.score_ia}</Text>
                        <Text style={{ fontSize: '9px', color: 'rgba(255,255,255,0.9)', margin: '0', fontWeight: '700' }}>SCORE</Text>
                      </div>
                    </Column>
                  </Row>
                </div>
              ))}
            </Section>
          )}

          {/* Recordatorios CTA */}
          {metricas.recordatoriosPendientes > 0 && (
            <Section style={{ backgroundColor: c.white, padding: '0 32px 24px' }}>
              <Hr style={{ borderColor: c.slate100, margin: '0 0 24px' }} />
              <div style={{ backgroundColor: c.slate50, borderRadius: '10px', border: `1px solid ${c.slate200}`, padding: '16px' }}>
                <Row>
                  <Column>
                    <Text style={{ fontSize: '14px', fontWeight: '700', color: c.slate900, margin: '0' }}>
                      📋 Tienes {metricas.recordatoriosPendientes} tareas pendientes
                    </Text>
                  </Column>
                  <Column align="right">
                    <Link href="https://app.inmublia.com/admin/leads" style={{ fontSize: '13px', color: c.blue, fontWeight: '700', textDecoration: 'none' }}>Ver tareas →</Link>
                  </Column>
                </Row>
              </div>
            </Section>
          )}

          {/* Footer Call to Action */}
          <Section style={{ backgroundColor: c.slate900, padding: '32px', textAlign: 'center' }}>
            <Text style={{ fontSize: '18px', fontWeight: '700', color: c.white, margin: '0 0 16px' }}>
              {metricas.recordatoriosPendientes > 0 ? 'Un seguimiento rápido asegura la comisión.' : 'Tu pipeline está operando al 100% 🚀'}
            </Text>
            <Button href="https://app.inmublia.com/admin" style={{ backgroundColor: c.blue, color: c.white, padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', textDecoration: 'none', display: 'inline-block' }}>
              Ingresar al CRM
            </Button>
          </Section>

          {/* Unsubscribe Legal */}
          <Section style={{ padding: '24px 32px', textAlign: 'center', backgroundColor: c.slate50 }}>
            <Text style={{ fontSize: '12px', color: c.slate500, margin: '0 0 8px', fontWeight: '600' }}>
              Inmublia — El CRM para Asesores de Alto Rendimiento
            </Text>
            <Text style={{ fontSize: '11px', color: c.slate500, margin: '0' }}>
              <Link href={`https://app.inmublia.com/unsubscribe?token=${broker.email_unsubscribe_token}`} style={{ color: c.slate500, textDecoration: 'underline' }}>
                Configurar notificaciones o cancelar suscripción
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
  const calientes = metricas.leadsCalientes.map((l: any) => `- ${l.nombre} (Score IA: ${l.score_ia})`).join('\n')
  
  return `
🏠 INMUBLIA - Resumen Semanal
Semana del: ${formatearSemana(semanaInicio)}
-------------------------------------
Nuevos Leads: ${metricas.leadsNuevos}
Cierres: ${metricas.cerradosEstaSemana}
Propiedades Activas: ${metricas.totalPropiedades}

🔥 LEADS CALIENTES:
${calientes.length > 0 ? calientes : 'Sin leads críticos para hoy.'}

📋 Tareas Pendientes: ${metricas.recordatoriosPendientes}

Ingresa a tu CRM para dar seguimiento: 
https://app.inmublia.com/admin
  `.trim()
}
