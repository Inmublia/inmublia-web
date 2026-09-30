// src/lib/server/portales-sync.js
import { decryptToken, generarHashSha256 } from '$lib/server/crypto';
import { asegurarTokenMercadoLibreVigente } from '$lib/server/ml-auth';

// -------------------------------------------------------------------------
// UTILIDADES ENTERPRISE (Timeouts y Extracción)
// -------------------------------------------------------------------------

const fetchConTimeout = (url, opts, ms = 10000) =>
  Promise.race([
    fetch(url, opts),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout llamando a ${url}`)), ms))
  ]);

function extraerCodigoPostal(ubicacion) {
  const match = (ubicacion || '').match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

// -------------------------------------------------------------------------
// ADAPTADOR: MERCADO LIBRE MÉXICO (MLM)
// -------------------------------------------------------------------------

const ML_CATEGORIES_MX = {
  'Casa':           { venta: 'MLM1459', renta: 'MLM1472' },
  'Departamento':   { venta: 'MLM1460', renta: 'MLM1473' },
  'Terreno':        { venta: 'MLM1462', renta: null },
  'Local':          { venta: 'MLM1468', renta: 'MLM1476' },
  'Oficina':        { venta: 'MLM1469', renta: 'MLM1477' },
  'Bodega':         { venta: 'MLM1470', renta: 'MLM1478' },
  'default':        { venta: 'MLM1459', renta: 'MLM1472' } 
};

async function llamarApiMercadoLibre(payloadNormalizado, credenciales, accion, portal_item_id = null, tipo_propiedad = 'Casa') {
  const accessToken = await decryptToken(credenciales.access_token_encrypted); 

  if (accion === 'pausar') {
    const res = await fetchConTimeout(`https://api.mercadolibre.com/items/${portal_item_id}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' })
    });
    if (!res.ok) throw new Error(`Error pausando en ML: ${(await res.json()).message}`);
    return { id: portal_item_id, url: null };
  }

  const operacion = payloadNormalizado.operation_type === 'sale' ? 'venta' : 'renta';
  const categoryId = ML_CATEGORIES_MX[tipo_propiedad]?.[operacion] ?? ML_CATEGORIES_MX['default'][operacion];
  
  if (!categoryId) throw new Error(`El tipo de propiedad '${tipo_propiedad}' no soporta la operación '${operacion}' en MercadoLibre.`);

  const mlPayload = {
    title: payloadNormalizado.title,
    category_id: categoryId,
    price: payloadNormalizado.price,
    currency_id: 'MXN',
    available_quantity: 1,
    listing_type_id: 'gold_special',
    condition: 'not_specified',
    description: { plain_text: payloadNormalizado.description },
    pictures: payloadNormalizado.pictures.map(url => ({ source: url })),
    attributes: [
      { id: 'BEDROOMS', value_name: String(payloadNormalizado.bedrooms) },
      { id: 'BATHROOMS', value_name: String(payloadNormalizado.bathrooms) },
      { id: 'TOTAL_AREA', value_name: String(payloadNormalizado.lot_size) },
      { id: 'COVERED_AREA', value_name: String(payloadNormalizado.construction_size) },
      { id: 'PARKING_LOTS', value_name: String(payloadNormalizado.parking_spaces) }
    ],
    location: {
      address_line: payloadNormalizado.location,
      zip_code: extraerCodigoPostal(payloadNormalizado.location) || null 
    }
  };

  const endpoint = accion === 'publicar' ? 'https://api.mercadolibre.com/items' : `https://api.mercadolibre.com/items/${portal_item_id}`;
  const res = await fetchConTimeout(endpoint, {
    method: accion === 'publicar' ? 'POST' : 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mlPayload)
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token de MercadoLibre expirado. Requiere reconexión.');
    throw new Error(data.message || 'Error en API MercadoLibre');
  }

  return { id: data.id, url: data.permalink };
}

// -------------------------------------------------------------------------
// ADAPTADOR: EASYBROKER (V1)
// -------------------------------------------------------------------------

const EB_PROPERTY_TYPES = {
  'Casa':        'Casa',
  'Departamento':'Departamento',
  'Terreno':     'Terreno',
  'Local':       'Local comercial',
  'Oficina':     'Oficina',
  'Bodega':      'Bodega',
  'default':     'Casa'
};

async function llamarApiEasyBroker(payloadNormalizado, credenciales, accion, portal_item_id = null, tipo_propiedad = 'Casa') {
  const apiKey = await decryptToken(credenciales.api_key_encrypted);

  if (accion === 'pausar') {
    await fetchConTimeout(`https://api.easybroker.com/v1/properties/${portal_item_id}/archive`, {
      method: 'POST',
      headers: { 'X-Authorization': apiKey }
    });
    return { id: portal_item_id, url: null };
  }

  const ebPayload = {
    property_details: {
      title: payloadNormalizado.title,
      description: payloadNormalizado.description,
      property_type: EB_PROPERTY_TYPES[tipo_propiedad] ?? EB_PROPERTY_TYPES['default'],
      bedrooms: payloadNormalizado.bedrooms,
      bathrooms: payloadNormalizado.bathrooms,
      parking_spaces: payloadNormalizado.parking_spaces,
      construction_size: payloadNormalizado.construction_size,
      lot_size: payloadNormalizado.lot_size
    },
    operations: [{
      type: payloadNormalizado.operation_type,
      currency: 'MXN',
      amount: payloadNormalizado.price,
      active: true
    }],
    location: {
      street: payloadNormalizado.location,
      country: 'MX'
    },
    images: payloadNormalizado.pictures.map(url => ({ url })),
    publicly_listed: true
  };

  const endpoint = accion === 'publicar' ? 'https://api.easybroker.com/v1/properties' : `https://api.easybroker.com/v1/properties/${portal_item_id}`;
  
  const res = await fetchConTimeout(endpoint, {
    method: accion === 'publicar' ? 'POST' : 'PATCH',
    headers: { 'X-Authorization': apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(ebPayload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.errors ? data.errors.join(', ') : 'Error en API EasyBroker');

  return { id: data.public_id, url: data.public_url };
}

// -------------------------------------------------------------------------
// EL ORQUESTADOR CENTRAL DE DIFUSIÓN
// -------------------------------------------------------------------------

export async function procesarDifusion(supabase, job) {
  // Marca el trabajo como procesando localmente
  await supabase.from('portal_sync_queue').update({ estatus: 'procesando' }).eq('id', job.id);

  try {
    const { data: prop } = await supabase.from('propiedades')
      .select('id, broker_id, titulo, precio, operacion, tipo, ubicacion, m2_terreno, m2_construccion, recamaras, banos, estacionamientos, descripcion, galeria_urls, imagen_url')
      .eq('id', job.propiedad_id).single();

    const { data: creds } = await supabase.from('portal_credenciales')
      .select('portal_publisher_id, access_token_encrypted, refresh_token_encrypted, api_key_encrypted, token_expires_at, estatus')
      .eq('broker_id', prop.broker_id)
      .eq('portal', job.portal)
      .single();

    if (!creds || creds.estatus !== 'activo') throw new Error(`Credenciales no activas para ${job.portal}`);

    let credencialesActivas = creds;

    // 🚀 LA INYECCIÓN DEL SEMÁFORO DISTRIBUIDO PARA MERCADOLIBRE
    if (job.portal === 'mercadolibre') {
      credencialesActivas = await asegurarTokenMercadoLibreVigente(supabase, prop.broker_id, credencialesActivas);
    }

    const payloadNormalizado = {
      title: prop.titulo,
      price: prop.precio,
      operation_type: prop.operacion === 'Venta' ? 'sale' : 'rental',
      bedrooms: prop.recamaras || 0,
      bathrooms: prop.banos || 0,
      parking_spaces: prop.estacionamientos || 0,
      lot_size: prop.m2_terreno || 0,
      construction_size: prop.m2_construccion || 0,
      description: prop.descripcion || '',
      pictures: [prop.imagen_url, ...(prop.galeria_urls || [])].filter(Boolean),
      location: prop.ubicacion || ''
    };

    // Validación de Idempotencia: ¿La propiedad realmente cambió?
    const hash = await generarHashSha256(payloadNormalizado);

    const { data: pubExistente } = await supabase.from('portal_publicaciones')
      .select('hash_contenido, portal_item_id')
      .eq('propiedad_id', prop.id).eq('portal', job.portal).single();

    if (job.accion !== 'despublicar' && pubExistente?.hash_contenido === hash && pubExistente?.portal_item_id) {
       await supabase.from('portal_sync_queue').update({ estatus: 'completado' }).eq('id', job.id);
       await supabase.from('portal_publicaciones').update({ estatus: 'publicado' }).eq('propiedad_id', prop.id).eq('portal', job.portal);
       return;
    }

    let resultado = null;
    const isDespublicar = job.accion === 'despublicar';

    // Ruteo al Adaptador correspondiente
    if (job.portal === 'mercadolibre') {
      resultado = await llamarApiMercadoLibre(payloadNormalizado, credencialesActivas, isDespublicar ? 'pausar' : (pubExistente?.portal_item_id ? 'actualizar' : 'publicar'), pubExistente?.portal_item_id, prop.tipo);
    } else if (job.portal === 'easybroker') {
      resultado = await llamarApiEasyBroker(payloadNormalizado, credencialesActivas, isDespublicar ? 'pausar' : (pubExistente?.portal_item_id ? 'actualizar' : 'publicar'), pubExistente?.portal_item_id, prop.tipo);
    } else {
       throw new Error(`Portal ${job.portal} no implementado`);
    }

    // Actualización de estado final exitoso en Inmublia
    await supabase.from('portal_publicaciones').upsert({
      propiedad_id: prop.id, 
      broker_id: prop.broker_id, 
      portal: job.portal,
      portal_item_id: resultado?.id || pubExistente?.portal_item_id,
      portal_url: resultado?.url || pubExistente?.portal_url,
      estatus: isDespublicar ? 'inactivo' : 'publicado',
      ultimo_error: null, 
      hash_contenido: isDespublicar ? null : hash,
      sincronizado_en: new Date().toISOString()
    }, { onConflict: 'propiedad_id, portal' });

    await supabase.from('portal_sync_queue').update({ estatus: 'completado' }).eq('id', job.id);

  } catch (err) {
    // Manejo de Errores con Backoff Exponencial
    const backoffMinutos = [5, 15, 45][job.intentos] || 60; 
    const ejecutarEn = new Date(Date.now() + backoffMinutos * 60000);

    await supabase.from('portal_publicaciones').upsert({
      propiedad_id: job.propiedad_id, 
      broker_id: job.broker_id, 
      portal: job.portal,
      estatus: 'error', 
      ultimo_error: err.message, 
      sincronizado_en: new Date().toISOString()
    }, { onConflict: 'propiedad_id, portal' });

    await supabase.from('portal_sync_queue').update({ 
      estatus: 'fallido', 
      intentos: job.intentos + 1, 
      ejecutar_en: ejecutarEn.toISOString() 
    }).eq('id', job.id);
    
    throw err; 
  }
}
