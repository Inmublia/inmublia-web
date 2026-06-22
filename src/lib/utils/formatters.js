export const formatearPrecio = (valor, moneda = "MXN") => {
  return new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: moneda, 
    maximumFractionDigits: 0 
  }).format(valor);
};

export const obtenerIdYouTube = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return match ? match[1] : null;
};

export const obtenerIdMatterport = (url) => {
  if (!url) return null;
  const match = url?.trim().match(/(?:\/show\/\?m=|\/space\/|m=)([a-zA-Z0-9]{11})/);
  return match ? match[1] : null;
};

export function descargarVCardAgente(broker, ubicacion) {
  const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${broker.nombre_comercial}\nORG:Inmublia Certified Broker\nTITLE:Asesor Inmobiliario\nTEL;TYPE=CELL:${broker.whatsapp}\nNOTE:Especialista en ${ubicacion}\nURL:https://${broker.subdominio}.inmublia.com\nEND:VCARD`;
  const blob = new Blob([vcard], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${broker.nombre_comercial.replace(/\s+/g, '_')}_Contacto.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}
