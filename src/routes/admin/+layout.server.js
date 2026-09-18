// src/routes/admin/+layout.server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function load({ locals, setHeaders, url, depends }) {
  depends('supabase:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });

  const { session, user } = await locals.safeGetSession();

  if (!user) {
    if (url.pathname.startsWith('/login')) return {};
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    let db = locals.supabase;
    if (locals.isImpersonating) {
      db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    }

    let query = db.from('brokers').select('*');
    if (locals.isImpersonating && locals.tenantId) {
      query = query.eq('id', locals.tenantId);
    } else {
      query = query.eq('auth_user_id', user.id);
    }
    
    const { data: broker, error: brokerError } = await query.single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    const status = (broker.status_suscripcion || '').toLowerCase().trim();
    const estatusBloqueados = ['cancelada', 'canceled', 'inactiva', 'past_due', 'unpaid'];
    const isPerfilPage = url.pathname.startsWith('/admin/perfil');

    if (estatusBloqueados.includes(status) && !isPerfilPage && !locals.isImpersonating) {
      throw redirect(303, '/admin/perfil?alerta=pago_requerido');
    }

    // 🚀 LÓGICA DE PAYWALLS (Medición de Consumo)
    // Inicializamos contadores por defecto
    let countPropiedades = 0;
    let countOpenHouses = 0;
    
    // Solo contamos las propiedades Activas y Pre-Mercado (no las Vendidas/Bajas)
    const { count: propsCount } = await db
      .from('propiedades')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', broker.id)
      .in('estatus', ['Activa', 'Pre-Mercado']);
    
    if (propsCount) countPropiedades = propsCount;

    // Solo contamos Open Houses agendados en el futuro o en curso
    const today = new Date().toISOString().split('T')[0];
    const { count: ohCount } = await db
      .from('open_houses')
      .select('id', { count: 'exact', head: true })
      .eq('broker_id', broker.id)
      .gte('fecha', today);

    if (ohCount) countOpenHouses = ohCount;

    // 🚀 CÁLCULO DE LÍMITES SEGÚN PLAN
    const esTrial = status === 'trial';
    const plan = (broker.plan_suscripcion || 'basico').toLowerCase();
    
    // Limites de Inventario
    const limitesInventario = {
      basico: 15,
      trial: 5,
      pro: 999999, // Ilimitado
      elite: 999999
    };
    
    // Limites de Open House Activos
    const limitesOpenHouse = {
      basico: 0,
      trial: 1,
      pro: 999999,
      elite: 999999
    };

    const limiteActualProps = esTrial ? limitesInventario['trial'] : (limitesInventario[plan] || 15);
    const limiteActualOH = esTrial ? limitesOpenHouse['trial'] : (limitesOpenHouse[plan] || 0);

    const hitPaywallPropiedades = countPropiedades >= limiteActualProps;
    const hitPaywallOpenHouse = countOpenHouses >= limiteActualOH;
    const hitPaywallIA = (broker.creditos_ia || 0) <= 0;

    // Cálculo de Días Restantes de Trial
    let trialRestante = null;
    if (esTrial && broker.trial_ends_at) {
      const endsAt = new Date(broker.trial_ends_at);
      const diffMs = endsAt - new Date();
      trialRestante = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (trialRestante < 0) trialRestante = 0; // Si es negativo, el Hook Server ya lo debió haber bloqueado, pero por seguridad
    }

    // Código original de notificaciones...
    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayISO = endOfToday.toISOString();
    
    const { data: recordatorios } = await db
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', endOfTodayISO);

    const { data: notificaciones } = await db
      .from('notificaciones_agente')
      .select('id, titulo, mensaje, creado_en, leida, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('leida', false);

    const { data: leadsActivos } = await db
      .from('leads')
      .select('id, nombre, estado, ultima_actividad')
      .eq('broker_id', broker.id)
      .in('estado', ['nuevo', 'contactado', 'visita', 'negociacion']);

    const formatter = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const formatSafe = (dateString) => {
      if (!dateString) return '';
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return formatter.format(d);
    };

    const extraerLead = (leadData) => {
      if (!leadData) return null;
      return Array.isArray(leadData) ? leadData[0] : leadData;
    };

    const alertasAbandono = (leadsActivos || []).filter(lead => {
       if (!lead.ultima_actividad) return false;
       const act = new Date(lead.ultima_actividad);
       const diffHours = (now - act) / (1000 * 60 * 60);
       if (lead.estado === 'nuevo' && diffHours >= 24) return true;
       if (['contactado', 'visita', 'negociacion'].includes(lead.estado) && diffHours >= 72) return true;
       return false;
    }).map(lead => {
       const act = new Date(lead.ultima_actividad);
       const diffHours = (now - act) / (1000 * 60 * 60);
       const diasPasados = Math.floor(diffHours / 24);
       const textoDias = diasPasados === 1 ? 'día' : 'días';

       return {
           id: `abandono-${lead.id}`, 
           tipo_alerta: 'sistema',
           titulo: lead.estado === 'nuevo' ? '¡Atención Crítica!' : 'Riesgo de Enfriamiento',
           mensaje: lead.estado === 'nuevo' 
                    ? `Prospecto nuevo abandonado hace ${diasPasados} ${textoDias}.` 
                    : `Han pasado ${diasPasados} ${textoDias} sin actividad.`,
           fecha: lead.ultima_actividad, 
           fecha_formateada: formatSafe(lead.ultima_actividad),
           lead: lead
       };
    });

    const alertasUnificadas = [
      ...(recordatorios || []).map(r => ({
        id: r.id,
        tipo_alerta: 'recordatorio',
        titulo: 'Seguimiento Pendiente',
        mensaje: r.contenido,
        fecha: r.fecha_recordatorio,
        fecha_formateada: formatSafe(r.fecha_recordatorio),
        lead: extraerLead(r.leads)
      })),
      ...(notificaciones || []).map(n => ({
        id: n.id,
        tipo_alerta: 'sistema',
        titulo: n.titulo,
        mensaje: n.mensaje,
        fecha: n.creado_en,
        fecha_formateada: formatSafe(n.creado_en),
        lead: extraerLead(n.leads)
      })),
      ...alertasAbandono
    ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0))
     .slice(0, 20); 

    return {
      session,
      user,
      broker,
      alertasGlobales: alertasUnificadas,
      isImpersonating: locals.isImpersonating || false,
      rolInterno: locals.rol_interno || 'broker',
      
      // 🚀 EXPORTACIÓN DEL PAYWALL AL FRONTEND
      limits: {
        isTrial: esTrial,
        trialDaysLeft: trialRestante,
        plan: plan,
        hitPropsPaywall: hitPaywallPropiedades,
        hitOHPaywall: hitPaywallOpenHouse,
        hitIAPaywall: hitPaywallIA,
        currentProps: countPropiedades,
        maxProps: limiteActualProps
      }
    };

  } catch (err) {
    console.error("Error en layout global:", err);
    return { session, user, broker: null, alertasGlobales: [], isImpersonating: false, rolInterno: locals.rol_interno || 'broker' }; 
  }
}
