import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// Motor de Matchmaking en Servidor
function calcularMatches(cliente, propiedadesActivas) {
  if (!cliente.perfil || !propiedadesActivas.length) return [];
  
  const { operacionDominante, tipoDominante, recamarasPromedio } = cliente.perfil;
  const { presupuestoInferido } = cliente;
  
  return propiedadesActivas
    .filter(p => !cliente.interesesIds.includes(p.id))
    .filter(p => (p.operacion || 'Venta') === operacionDominante)
    .map(p => {
      const diffPrecio = Math.abs(p.precio - presupuestoInferido) / (presupuestoInferido || 1);
      if (diffPrecio > 0.30) return null;
      
      let score = diffPrecio <= 0.15 ? 50 : 25;
      if (p.tipo && p.tipo === tipoDominante) score += 25;
      
      const pRec = Number(p.recamaras) || 0;
      score += pRec >= recamarasPromedio ? 25 : (pRec === recamarasPromedio - 1 ? 10 : 0);
      
      return score >= 60 ? { 
        id: p.id, titulo: p.titulo, precio: p.precio,
        imagen_url: p.imagen_url, slug: p.slug, matchScore: score 
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}

// Procesador y Deduplicador Blindado
function procesarDirectorio(leads, propiedades) {
  const mapa = {};
  
  leads.forEach(l => {
    // 🛡️ FIX CRÍTICO: Nunca descartar un lead. Si no tiene correo ni teléfono, usamos su ID.
    const key = (l.correo || '').trim() 
      ? `email:${l.correo.trim().toLowerCase()}` 
      : (l.telefono || '').toString().trim() 
        ? `tel:${l.telefono.toString().replace(/\D/g, '')}` 
        : `id:${l.id}`;
    
    // 🛡️ FIX CRÍTICO: Proteger fechas contra nulos (Evita crasheo NaN)
    let fechaActividad = new Date(l.ultima_actividad || l.creado_en || l.created_at || new Date());
    if (isNaN(fechaActividad.getTime())) fechaActividad = new Date();

    if (l.lead_notas?.length > 0) {
      const maxNota = new Date(Math.max(...l.lead_notas.map(n => new Date(n.creado_en || n.created_at || new Date()))));
      if (!isNaN(maxNota.getTime()) && maxNota > fechaActividad) fechaActividad = maxNota;
    }
    
    const diasSinContacto = Math.floor((new Date() - fechaActividad) / 86400000);
    const diasSanos = isNaN(diasSinContacto) ? 0 : diasSinContacto;
    const estadoLimpio = (l.estado || 'nuevo').toLowerCase();
    const scoreBase = Math.max(0, 100 - (diasSanos * 2) + (estadoLimpio === 'negociacion' ? 20 : 0));

    if (!mapa[key]) {
      mapa[key] = {
        nombre: l.nombre || 'Lead sin nombre', 
        correo: l.correo, 
        telefono: l.telefono,
        estado: estadoLimpio,
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
      mapa[key].estado = estadoLimpio;
      mapa[key].score = Math.max(mapa[key].score, l.scoreObj?.score ?? scoreBase);
    }
    
    // Proteger el mapeo de propiedades en caso de que vengan nulas
    if (l.propiedades && !Array.isArray(l.propiedades) && !mapa[key].interesesIds.includes(l.propiedades.id)) {
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
        const op = p.operacion || 'Venta';
        const tp = p.tipo || 'Casa';
        conteoOp[op] = (conteoOp[op] || 0) + 1;
        conteoTipo[tp] = (conteoTipo[tp] || 0) + 1;
      });

      const precios = cliente.interesesHistorial.map(p => Number(p.precio) || 0).filter(p => p > 0).sort((a,b)=>a-b);
      const mid = Math.floor(precios.length / 2);
      cliente.presupuestoInferido = precios.length === 0 ? 0 
        : precios.length % 2 === 0 ? (precios[mid-1]+precios[mid])/2 : precios[mid];

      cliente.perfil = { 
        operacionDominante: Object.keys(conteoOp).reduce((a,b)=>conteoOp[a]>conteoOp[b]?a:b, 'Venta'), 
        tipoDominante: Object.keys(conteoTipo).reduce((a,b)=>conteoTipo[a]>conteoTipo[b]?a:b, 'Casa'), 
        recamarasPromedio: Math.round(sumaRec / cliente.interesesHistorial.length) 
      };
      
      cliente.altaIntencion = cliente.interesesHistorial.length >= 2;
      cliente.matches = calcularMatches(cliente, propiedades);
    }
    
    delete cliente.interesesIds; 
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

  // 🛡️ FIX CRÍTICO: Usamos select('*') en propiedades para evitar que Supabase colapse si falta la columna "tipo" o "recamaras"
  const { data: leads, error: leadsError } = await db
    .from('leads')
    .select(`*, propiedades (*)`)
    .eq('broker_id', broker.id);

  const { data: propiedades, error: propError } = await db
    .from('propiedades')
    .select('*')
    .eq('broker_id', broker.id)
    .eq('estatus', 'Activa');

  if (leadsError || propError) {
    console.error("Error en Supabase:", leadsError || propError);
  }

  // Si hay error o no hay leads, pasamos arreglos vacíos de forma segura
  let directorioListo = procesarDirectorio(leads || [], propiedades || []);
  
  // Ordenamiento seguro (protegido contra NaNs)
  directorioListo.sort((a, b) => {
    const scoreA = isNaN(a.score) ? 0 : a.score;
    const scoreB = isNaN(b.score) ? 0 : b.score;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.fecha_contacto).getTime() - new Date(a.fecha_contacto).getTime();
  });

  return {
    broker,
    directorio: directorioListo,
    totalLeads: leads?.length || 0,
    propiedadesActivas: propiedades?.length || 0
  };
};
