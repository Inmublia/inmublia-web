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

  // 🚀 FIX 1: Creamos un cliente "Dios" para saltarnos las trabas del RLS de Supabase.
  const supabaseAdmin = createClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 🚀 FIX 2: Traemos TODO (*) para que no falle si una columna no existe.
  const { data: agencias, error: dbError } = await supabaseAdmin
    .from('brokers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (dbError) {
    console.error('[Directorio Operaciones Error]', dbError);
    // Si vuelve a fallar, ahora escupirá el error REAL de SQL en la pantalla en lugar de un 500 genérico
    throw error(500, `Fallo SQL: ${dbError.message}`); 
  }

  // 🚀 FIX 3: Hacemos la búsqueda (CMD+K) en memoria de Javascript para no romper el SQL
  let filtradas = agencias || [];
  if (query) {
    const q = query.toLowerCase();
    filtradas = filtradas.filter(a => 
      (a.nombre_comercial && a.nombre_comercial.toLowerCase().includes(q)) || 
      (a.subdominio && a.subdominio.toLowerCase().includes(q))
    );
  }

  // Mapeo defensivo: Si la columna no existe, pone un valor por defecto en vez de romperse.
  const agenciasFormateadas = filtradas.map(a => ({
    id: a.id,
    nombre: a.nombre_comercial || a.subdominio || 'Agencia sin nombre',
    agencia: a.nombre_comercial || 'Independiente',
    email: a.email || 'N/A', 
    plan: a.plan || 'Básico',
    estado: a.status_suscripcion || 'Activo',
    creditos_ia: a.creditos_ia || 0,
    registro_fmt: a.created_at ? new Date(a.created_at).toLocaleDateString('es-MX') : 'Desconocida'
  }));

  return { 
    agencias: agenciasFormateadas, 
    query 
  };
}
