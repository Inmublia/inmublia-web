// src/routes/api/cron/weekly-report/+server.js
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// 🚀 PROTECCIÓN DEL ENDPOINT
// Solo el sistema automatizado con este token podrá ejecutar el envío masivo
const CRON_SECRET_KEY = env.CRON_SECRET || 'inmublia-super-secret-cron-key-2026';

export const GET = async ({ request, fetch }) => {
  // 1. VALIDACIÓN DE SEGURIDAD
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET_KEY}`) {
    return json({ error: 'Acceso Denegado. Token de Cron inválido.' }, { status: 401 });
  }

  // 2. INICIALIZAR SUPABASE EN MODO DIOS (Bypass RLS)
  const supabase = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 3. OBTENER FECHAS DE REFERENCIA (Desde el lunes pasado hasta hoy)
    const hoy = new Date();
    const lunesPasado = new Date();
    lunesPasado.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 7);
    lunesPasado.setHours(0, 0, 0, 0);

    // 4. TRAER A TODOS LOS BROKERS ACTIVOS CON SU EMAIL
    // Asegúrate de hacer un join con auth.users si el email no está en la tabla brokers
    const { data: brokers, error: brokersError } = await supabase
      .from('brokers')
      .select('id, nombre_comercial, auth_user_id');

    if (brokersError) throw new Error(brokersError.message);

    let correosEnviados = 0;
    const reportesLog = [];

    // 5. ITERAR POR CADA BROKER Y CALCULAR SUS MÉTRICAS
    for (const broker of brokers) {
      // Traer los leads del broker
      const { data: leads } = await supabase
        .from('leads')
        .select('id, estado, creado_en, ultima_actividad, lead_notas(id, completado, fecha_recordatorio)')
        .eq('broker_id', broker.id);

      if (!leads || leads.length === 0) continue;

      // Calcular métricas de la semana
      const leadsNuevosSemana = leads.filter(l => new Date(l.creado_en) >= lunesPasado).length;
      
      const cierresSemana = leads.filter(l => 
        l.estado === 'cerrado' && new Date(l.ultima_actividad) >= lunesPasado
      ).length;

      // Calcular recordatorios pendientes o vencidos
      let recordatoriosPendientes = 0;
      leads.forEach(l => {
        if (l.lead_notas) {
          const pendientes = l.lead_notas.filter(n => !n.completado && n.fecha_recordatorio && new Date(n.fecha_recordatorio) <= hoy).length;
          recordatoriosPendientes += pendientes;
        }
      });

      // Si no hubo actividad ni pendientes, no hacemos spam
      if (leadsNuevosSemana === 0 && cierresSemana === 0 && recordatoriosPendientes === 0) {
        continue;
      }

      // Necesitamos el email del broker (Si usas Supabase Auth, hay que extraerlo por Admin API o si lo tienes en la tabla brokers)
      const { data: userData } = await supabase.auth.admin.getUserById(broker.auth_user_id);
      const brokerEmail = userData?.user?.email;

      if (!brokerEmail) continue;

      // 6. CREAR EL HTML DEL CORREO (Diseño Premium)
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            
            <div style="background-color: #09090b; padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">INMUBLIA</h1>
              <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Tu Pipeline Semanal</p>
            </div>

            <div style="padding: 40px;">
              <p style="font-size: 16px; color: #334155; margin-top: 0;">Hola <strong>${broker.nombre_comercial}</strong>,</p>
              <p style="font-size: 16px; color: #475569; line-height: 1.5; margin-bottom: 30px;">
                Aquí tienes el resumen ejecutivo de tu rendimiento de la última semana y tus tareas prioritarias para iniciar el lunes con fuerza.
              </p>

              <!-- MÉTRICAS -->
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px;">
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; text-align: center;">
                  <p style="margin: 0; font-size: 32px; font-weight: 900; color: #4f46e5;">${leadsNuevosSemana}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Leads Nuevos</p>
                </div>
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 16px; border: 1px solid #d1fae5; text-align: center;">
                  <p style="margin: 0; font-size: 32px; font-weight: 900; color: #10b981;">${cierresSemana}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 1px;">Cierres Logrados</p>
                </div>
              </div>

              <!-- ALERTA DE SEGUIMIENTO -->
              ${recordatoriosPendientes > 0 ? `
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 12px; margin-bottom: 30px;">
                <h3 style="margin: 0 0 8px 0; color: #b45309; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Atención Requerida</h3>
                <p style="margin: 0; color: #92400e; font-size: 14px;">Tienes <strong>${recordatoriosPendientes} recordatorios pendientes</strong> que requieren tu acción hoy.</p>
              </div>
              ` : ''}

              <div style="text-align: center;">
                <a href="${publicEnv.PUBLIC_APP_URL || 'https://app.inmublia.com'}/admin/leads" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 14px; transition: background-color 0.2s;">
                  Abrir CRM y Operar
                </a>
              </div>
            </div>
            
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Recibes este correo porque eres un broker activo en Inmublia.<br>
                © 2026 Inmublia. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      `;

      // 7. DESPACHAR EL CORREO A TRAVÉS DE LA API
      // Nota: Aquí asumo Resend, reemplaza la URL y la lógica si usas SendGrid/AWS
      try {
        const resEnvio = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Inmublia Insights <hola@inmublia.com>',
            to: brokerEmail,
            subject: '📈 Tu Pipeline Semanal está listo',
            html: htmlBody
          })
        });

        if (resEnvio.ok) {
          correosEnviados++;
          reportesLog.push({ broker: broker.nombre_comercial, status: 'enviado' });
        } else {
          const errorResponse = await resEnvio.json();
          reportesLog.push({ broker: broker.nombre_comercial, status: 'fallo', detail: errorResponse });
        }
      } catch (err) {
        reportesLog.push({ broker: broker.nombre_comercial, status: 'error_red', detail: err.message });
      }
    }

    // 8. DEVOLVER REPORTE DE EJECUCIÓN
    return json({
      success: true,
      message: 'Batch de reportes semanales finalizado.',
      enviados: correosEnviados,
      log: reportesLog
    });

  } catch (err) {
    console.error('[Cron Error]', err);
    return json({ error: err.message }, { status: 500 });
  }
};
