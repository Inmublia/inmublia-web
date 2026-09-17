// src/routes/admin/operaciones/+page.server.js
import { error } from '@sveltejs/kit';

export async function load({ url, locals }) {
  // 1. Capturamos la intención de búsqueda desde la URL (?q=término)
  const query = url.searchParams.get('q') || '';

  // 2. Validación de sesión base
  const { data: { session } } = await locals.supabase.auth.getSession();
  if (!session) {
    throw error(401, 'Acceso denegado a la consola de operaciones');
  }

  // 3. Construcción dinámica del Query (Búsqueda Global)
  let dbQuery = locals.supabase
    .from('perfiles')
    .select('id, nombre, agencia, email, plan, estado, created_at, creditos_ia');

  if (query) {
    // Escaneamos múltiples columnas usando ILIKE (case-insensitive)
    dbQuery = dbQuery.or(`nombre.ilike.%${query}%,email.ilike.%${query}%,agencia.ilike.%${query}%`);
  }

  // 4. Ejecución con límite de seguridad
  const { data: agencias, error: dbError } = await dbQuery
    .order('created_at', { ascending: false })
    .limit(50);

  if (dbError) {
    console.error('[Directorio Operaciones Error]', dbError.message);
    throw error(500, 'Error al consultar el directorio de agencias');
  }

  // 5. Formateo de fechas para la UI
  const agenciasFormateadas = agencias.map(a => ({
    ...a,
    registro_fmt: new Date(a.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }));

  return { 
    agencias: agenciasFormateadas, 
    query 
  };
}
