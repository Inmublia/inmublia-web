import { error } from '@sveltejs/kit';

export async function load({ url, locals }) {
  const query = url.searchParams.get('q') || '';

  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  // 🚀 FIX: Apuntamos a la tabla 'brokers' real y usamos status_suscripcion
  let dbQuery = locals.supabase
    .from('brokers')
    .select('id, nombre, agencia, email, plan, status_suscripcion, created_at, creditos_ia');

  if (query) {
    dbQuery = dbQuery.or(`nombre.ilike.%${query}%,email.ilike.%${query}%,agencia.ilike.%${query}%`);
  }

  const { data: agencias, error: dbError } = await dbQuery
    .order('created_at', { ascending: false })
    .limit(50);

  if (dbError) {
    console.error('[Directorio Operaciones Error]', dbError.message);
    throw error(500, 'Error al consultar el directorio de agencias');
  }

  const agenciasFormateadas = agencias.map(a => ({
    ...a,
    estado: a.status_suscripcion || 'Activo', // Mapeo para que la UI no se rompa
    registro_fmt: new Date(a.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }));

  return { 
    agencias: agenciasFormateadas, 
    query 
  };
}
