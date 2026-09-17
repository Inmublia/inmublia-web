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

  // Consulta exacta ordenando por tu columna 'creado_en'
  const { data: agencias, error: dbError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(100);

  if (dbError) {
    console.error('[Directorio Operaciones Error]', dbError);
    throw error(500, `Fallo SQL: ${dbError.message}`); 
  }

  let filtradas = agencias || [];
  if (query) {
    const q = query.toLowerCase();
    filtradas = filtradas.filter(a => 
      (a.nombre_comercial && a.nombre_comercial.toLowerCase().includes(q)) || 
      (a.subdominio && a.subdominio.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  }

  // Mapeo preciso a las columnas reales de Inmublia
  const agenciasFormateadas = filtradas.map(a => {
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
    query 
  };
}
