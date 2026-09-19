// src/routes/admin/operaciones/+page.server.js
import { error } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function load({ url, locals }) {
  const query = url.searchParams.get('q') || '';

  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  const supabaseAdmin = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🚀 FASE 2: Traemos a TODOS los brokers sin límite para calcular finanzas reales
  const { data: todosLosBrokers, error: dbError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .order('creado_en', { ascending: false });

  if (dbError) {
    console.error('[Directorio Operaciones Error]', dbError);
    throw error(500, `Fallo SQL: ${dbError.message}`); 
  }

  const agencias = todosLosBrokers || [];

  // 🚀 FASE 2: MOTOR DE MÉTRICAS (KPIs)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let mrr = 0;
  let basicoCount = 0;
  let proCount = 0;
  let eliteCount = 0;
  let churnCount = 0;
  let nuevosMes = 0;
  let activasCount = 0;

  agencias.forEach(a => {
    const status = (a.status_suscripcion || 'inactiva').toLowerCase().trim();
    const plan = (a.plan_suscripcion || 'basico').toLowerCase().trim();
    
    // Identificar cuentas caídas (Churn) vs Activas
    const isChurn = ['cancelada', 'canceled', 'past_due', 'inactiva'].includes(status);
    const isActive = ['activa', 'activo', 'active'].includes(status);

    if (isChurn) churnCount++;
    if (isActive) activasCount++;

    // Sumar MRR (Monthly Recurring Revenue) y contar por plan
    if (isActive) {
      if (plan === 'elite') { eliteCount++; mrr += 1499; }
      else if (plan === 'pro') { proCount++; mrr += 899; }
      else { basicoCount++; mrr += 499; } // Asumimos básico por defecto
    }

    // Contar adquisición del mes actual
    if (a.creado_en) {
      const createdAt = new Date(a.creado_en);
      if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
        nuevosMes++;
      }
    }
  });

  const totalHistorico = agencias.length;
  const churnRate = totalHistorico > 0 ? ((churnCount / totalHistorico) * 100).toFixed(1) : 0;

  const metrics = {
    mrr, activasCount, basicoCount, proCount, eliteCount, nuevosMes, churnRate, churnCount
  };

  // ─── BÚSQUEDA Y FORMATO PARA LA TABLA ───
  let filtradas = agencias;
  if (query) {
    const q = query.toLowerCase();
    filtradas = filtradas.filter(a => 
      (a.nombre_comercial && a.nombre_comercial.toLowerCase().includes(q)) || 
      (a.subdominio && a.subdominio.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  }

  // Mapeo preciso y límite de 100 para que la tabla en el navegador cargue rápido
  const agenciasFormateadas = filtradas.slice(0, 100).map(a => {
    return {
      id: a.id,
      nombre: a.nombre_comercial || a.subdominio || 'Agencia sin nombre',
      agencia: a.nombre_comercial || 'Independiente',
      email: a.email || 'N/A', 
      plan: a.plan_suscripcion || 'Básico',
      estado: a.status_suscripcion || 'Activo',
      creditos_ia: a.ia_creditos_disponibles || 0,
      registro_fmt: a.creado_en ? new Date(a.creado_en).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Desconocida'
    };
  });

  return { 
    agencias: agenciasFormateadas, 
    query,
    metrics // Pasamos las matemáticas puras al frontend
  };
}
