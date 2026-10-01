import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
// Si aún no tienes $lib/scoring.js, puedes omitir la importación y usar el fallback interno.
// import { calcularScore } from '$lib/scoring.js'; 

// Motor de Matchmaking en Servidor
function calcularMatches(cliente, propiedadesActivas) {
  if (!cliente.perfil || !propiedadesActivas.length) return [];
  
  const { operacionDominante, tipoDominante, recamarasPromedio } = cliente.perfil;
  const { presupuestoInferido } = cliente;
  
  return propiedadesActivas
    .filter(p => !cliente.interesesIds.includes(p.id))
    .filter(p => p.operacion === operacionDominante)
    .map(p => {
      const diffPrecio = Math.abs(p.precio - presupuestoInferido) / (presupuestoInferido || 1);
      if (diffPrecio > 0.30) return null;
      
      let score = diffPrecio <= 0.15 ? 50 : 25;
      if (p.tipo === tipoDominante) score += 25;
      
      const pRec = Number(p.recamaras) || 0;
      score += pRec >= recamarasPromedio ? 25 : (pRec === recamarasPromedio - 1 ? 10 : 0);
      
      return score >= 60 ? { 
        id: p.id, titulo: p.titulo, precio: p.precio,
        imagen_url: p.imagen_url, slug: p.slug, matchScore: score 
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5); // Enviamos máximo 5 matches al cliente para aligerar el payload
}

// Procesador y Deduplicador
function procesarDirectorio(leads, propiedades) {
  const mapa = {};
  
  leads.forEach(l => {
    if (!l.correo && !l.telefono) return;
    const key = l.correo 
      ? `email:${l.correo.toLowerCase().trim()}` 
      : `tel:${String(l.telefono).replace(/\D/g, '')}`;
    
    let fechaActividad = new Date(l.ultima_actividad || l.creado_en);
    if (l.lead_notas?.length > 0) {
      const maxNota = new Date(Math.max(...l.lead_notas.map(n => new Date(n.creado_en))));
      if (maxNota > fechaActividad) fechaActividad = maxNota;
    }
    
    // Fallback de Score básico si no tienes la librería de IA conectada aún
    const diasSinContacto = Math.floor((new Date() - fechaActividad) / 86400000);
    const scoreBase = Math.max(0, 100 - (diasSinContacto * 2) + (l.estado === 'negociacion' ? 20 : 0));

    if (!mapa[key]) {
      mapa[key] = {
        nombre: l.nombre, correo: l.correo, telefono: l.telefono,
        estado: (l.estado || 'nuevo').toLowerCase(),
        fuente: l.fuente || l.origen || 'Directo',
        fecha_contacto: fechaActividad.toISOString(),
        score: l.scoreObj?.score ?? scoreBase,
        interesesHistorial: [],
        interesesIds: [],
        presupuestoInferido: 0,
        perfil: null,
        matches: []
      };
    } else if (fechaActividad > new Date(mapa[key].fecha_contacto)) {
      mapa[key].fecha_contacto = fechaActividad.toISOString();
      mapa[key].estado = (l.estado || 'nuevo').toLowerCase();
      mapa[key].score = Math.max(mapa[key].score, l.scoreObj?.score ?? scoreBase);
    }
    
    if (l.propiedades && !mapa[key].interesesIds.includes(l.propiedades.id)) {
      mapa[key].interesesHistorial.push(
        propiedades.find(p => p.id === l.propiedades.id) || l.propiedades
      );
      mapa[key].interesesIds.push(l.propiedades.id);
    }
  });

  return Object.values(mapa).map(cliente => {
    if (cliente.interesesHistorial.length > 0) {
      const conteoOp = {}; const conteoTipo = {}; let sumaRec = 0;
      
      cliente.interesesHistorial.forEach(p => {
        sumaRec += Number(p.recamaras) || 0;
        conteoOp[p.operacion || 'Venta'] = (conteoOp[p.operacion || 'Venta'] || 0) + 1;
        conteoTipo[p.tipo || 'Casa'] = (conteoTipo[p.tipo || 'Casa'] || 0) + 1;
      });

      const precios = cliente.interesesHistorial.map(p => Number(p.precio) || 0).sort((a,b)=>a-b);
      const mid = Math.floor(precios.length / 2);
      cliente.presupuestoInferido = precios.length === 0 ? 0 
        : precios.length % 2 === 0 ? (precios[mid-1]+precios[mid])/2 : precios[mid];

      cliente.perfil = { 
        operacionDominante: Object.keys(conteoOp).reduce((a,b)=>conteoOp[a]>conteoOp[b]?a:b), 
        tipoDominante: Object.keys(conteoTipo).reduce((a,b)=>conteoTipo[a]>conteoTipo[b]?a:b), 
        recamarasPromedio: Math.round(sumaRec / cliente.interesesHistorial.length) 
      };
      
      cliente.altaIntencion = cliente.interesesHistorial.length >= 2;
      cliente.matches = calcularMatches(cliente, propiedades);
    }
    
    delete cliente.interesesIds; // Limpiamos para no engordar el payload
    return cliente;
  });
}

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login');

  let db = locals.supabase;
  if (locals.isImpersonating) {
    db = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  let query = db.from('brokers').select('id, nombre_comercial, avatar_url, comision_default, ia_creditos_disponibles, plan_suscripcion');
  query = (locals.isImpersonating && locals.tenantId) ? query.eq('id', locals.tenantId) : query.eq('auth_user_id', locals.user.id);

  const { data: broker, error: brokerError } = await query.single();
  if (brokerError || !broker) throw redirect(303, '/login');

  const { data: leads } = await db
    .from('leads')
    .select(`*, propiedades (id, titulo, precio, operacion, estatus, tipo, recamaras)`)
    .eq('broker_id', broker.id);

  const { data: propiedades } = await db
    .from('propiedades')
    .select('id, titulo, precio, operacion, estatus, tipo, recamaras, ubicacion, slug, imagen_url')
    .eq('broker_id', broker.id)
    .eq('estatus', 'Activa');

  // Procesamos todo en el backend y ordenamos por Score + Fecha
  let directorioListo = procesarDirectorio(leads || [], propiedades || []);
  directorioListo.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.fecha_contacto) - new Date(a.fecha_contacto);
  });

  return {
    broker,
    directorio: directorioListo,
    totalLeads: leads?.length || 0,
    propiedadesActivas: propiedades?.length || 0
  };
};
