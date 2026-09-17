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

  // 🚀 FIX DEFINITIVO: Sin ORDER BY en SQL. Traemos la tabla tal cual para evitar colapsos.
  const { data: agencias, error: dbError } = await supabaseAdmin
    .from('brokers')
    .select('*')
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
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.correo && a.correo.toLowerCase().includes(q))
    );
  }

  // 🚀 Mapeo en Javascript. Si la columna no existe en tu tabla, no pasa nada, pone un valor por defecto.
  const agenciasFormateadas = filtradas.map(a => {
    // Buscamos cualquier variante posible de fecha que puedas tener
    const rawDate = a.created_at || a.fecha_registro || a.inserted_at || a.creado_en;
    
    return {
      id: a.id,
      nombre: a.nombre_comercial || a.subdominio || 'Agencia sin nombre',
      agencia: a.nombre_comercial || 'Independiente',
      email: a.email || a.correo || 'N/A', 
      plan: a.plan || a.tipo_plan || 'Básico',
      estado: a.status_suscripcion || 'Activo',
      creditos_ia: a.creditos_ia || 0,
      registro_fmt: rawDate ? new Date(rawDate).toLocaleDateString('es-MX') : 'Desconocida'
    };
  });

  return { 
    agencias: agenciasFormateadas, 
    query 
  };
}
