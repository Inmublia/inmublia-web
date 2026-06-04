/**
 * src/lib/utils/pdf.js
 * INMUBLIA — Generador de Ficha PDF v2.1
 *
 * FIXES aplicados:
 *  1. Dirección sin emoji (jsPDF Helvetica no soporta Unicode emoji)
 *  2. Descripción completa con salto de página automático
 *  3. Galería ilimitada con paginación dinámica (2 columnas, N páginas)
 *  4. Footer siempre en su lugar correcto en cada página
 */
 
// ─── CONSTANTES DE LAYOUT ────────────────────────────────────────────────────
const PAGE_W      = 210;
const PAGE_H      = 297;
const MARGIN      = 20;
const CONTENT_W   = PAGE_W - MARGIN * 2;
const FOOTER_H    = 35;                        // Alto del bloque de footer
const FOOTER_Y    = PAGE_H - FOOTER_H - 5;    // Y donde comienza el footer (257)
const SAFE_BOTTOM = FOOTER_Y - 8;             // Límite seguro de contenido (249)
 
// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
export async function generarFichaPDF(propiedad, broker) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
 
  // Utilidad: agrega nueva página y reinicia Y
  const newPage = () => {
    pdf.addPage();
    drawFooter(pdf, broker);
    return MARGIN;
  };
 
  // Utilidad: verifica si queda espacio, si no, agrega página
  const checkSpace = (currentY, neededHeight) => {
    if (currentY + neededHeight > SAFE_BOTTOM) return newPage();
    return currentY;
  };
 
  // ── PÁGINA 1: CABECERA + DATOS TÉCNICOS + DESCRIPCIÓN COMPLETA ─────────────
  drawHeader(pdf, propiedad);
  drawFooter(pdf, broker);
 
  let y = 58;
 
  // Fotografía principal
  if (propiedad.imagen_url) {
    const img = await toBase64(propiedad.imagen_url);
    if (img) {
      const h = 85;
      y = checkSpace(y, h);
      pdf.addImage(img, 'JPEG', MARGIN, y, CONTENT_W, h, '', 'FAST');
      y += h + 8;
    }
  }
 
  // Título
  y = checkSpace(y, 16);
  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(propiedad.titulo, CONTENT_W);
  pdf.text(titleLines, MARGIN, y);
  y += titleLines.length * 7 + 4;
 
  // FIX #1: Dirección SIN emoji — jsPDF Helvetica no renderiza Unicode emoji
  // Usamos un prefijo de texto plano en lugar de 📍
  y = checkSpace(y, 10);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(37, 99, 235);
 
  // Construimos el texto de dirección limpio
  const direccionLabel = 'Direccion: ';
  const direccionText  = `${propiedad.ubicacion}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(propiedad.ubicacion)}`;
 
  // Texto "Direccion:" en negro
  pdf.setTextColor(15, 23, 42);
  pdf.text(direccionLabel, MARGIN, y);
 
  // Texto de la dirección en azul con link — medimos el ancho del label
  const labelWidth = pdf.getTextWidth(direccionLabel);
  pdf.setTextColor(37, 99, 235);
  pdf.textWithLink(
    pdf.splitTextToSize(direccionText, CONTENT_W - labelWidth)[0], // Primera línea
    MARGIN + labelWidth,
    y,
    { url: mapUrl }
  );
 
  // Si la dirección es muy larga, segunda línea sin link pero en azul
  const allDirLines = pdf.splitTextToSize(direccionText, CONTENT_W - labelWidth);
  if (allDirLines.length > 1) {
    y += 5;
    pdf.text(allDirLines.slice(1).join(' '), MARGIN, y);
  }
  y += 12;
 
  // Características en grid
  y = drawFeaturesGrid(pdf, propiedad, y);
  y += 8;
 
  // FIX #2: Descripción con flujo automático multi-página
  if (propiedad.descripcion) {
    y = checkSpace(y, 14);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('DESCRIPCION DEL INMUEBLE', MARGIN, y);  // Sin tilde — Helvetica seguro
    y += 7;
 
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
 
    // Dividimos la descripción en líneas del ancho del contenido
    const descLines = pdf.splitTextToSize(propiedad.descripcion, CONTENT_W);
    const lineHeight = 5;
 
    for (const line of descLines) {
      // Si la siguiente línea no cabe antes del footer → nueva página
      if (y + lineHeight > SAFE_BOTTOM) {
        y = newPage();
        // Restaurar estilos de texto después del salto
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
      }
      pdf.text(line, MARGIN, y);
      y += lineHeight;
    }
  }
 
  // ── PÁGINAS DE GALERÍA: ilimitadas, 2 columnas ────────────────────────────
  // FIX #3: sin slice(0,4) — procesa todas las fotos de galeria_urls
  const galeriaUrls = Array.isArray(propiedad.galeria_urls) ? propiedad.galeria_urls : [];
 
  if (galeriaUrls.length > 0) {
    // Nueva página dedicada a galería
    let yG = newPage();
 
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Galeria de la Propiedad', MARGIN, yG);
    yG += 8;
 
    const colW   = (CONTENT_W - 6) / 2;
    const imgH   = 58;
    const gap    = 5;
 
    // Descarga todas las imágenes en paralelo
    const b64Images = await Promise.all(galeriaUrls.map(url => toBase64(url)));
 
    for (let i = 0; i < b64Images.length; i++) {
      const img = b64Images[i];
      if (!img) continue;
 
      const col  = i % 2;
      const posX = MARGIN + col * (colW + 6);
 
      // Al inicio de cada par (col === 0), verificar si caben las dos imágenes
      if (col === 0) {
        yG = checkSpace(yG, imgH + gap);
        // Si newPage fue llamado, re-dibujar el título de sección
        if (yG === MARGIN) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text('Galeria (continuacion)', MARGIN, yG);
          yG += 7;
        }
      }
 
      pdf.addImage(img, 'JPEG', posX, yG, colW, imgH, '', 'FAST');
 
      // Avanzar Y solo al terminar la fila derecha (col 1) o última imagen
      if (col === 1 || i === b64Images.length - 1) {
        yG += imgH + gap;
      }
    }
 
    // Mapa de ubicación debajo de la galería
    yG = checkSpace(yG, 85);
    drawMap(pdf, propiedad, yG);
  }
 
  // Nombre de archivo limpio
  const slug = propiedad.titulo
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
 
  pdf.save(`Ficha-${slug}.pdf`);
}
 
// ─── HELPERS ─────────────────────────────────────────────────────────────────
 
/** Dibuja el header azul marino en la página actual */
function drawHeader(pdf, propiedad) {
  const formatPrecio = (v) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v);
 
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, PAGE_W, 50, 'F');
 
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INMUBLIA', MARGIN, 22);
 
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text('Exclusivas Inmobiliarias', MARGIN, 31);
 
  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(formatPrecio(propiedad.precio), PAGE_W - MARGIN, 22, { align: 'right' });
 
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(56, 189, 248);
  pdf.text((propiedad.operacion || '').toUpperCase(), PAGE_W - MARGIN, 31, { align: 'right' });
}
 
/** Dibuja el footer en la página actual — se llama al crear cada página */
function drawFooter(pdf, broker) {
  const fy = FOOTER_Y;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, fy - 2, PAGE_W, FOOTER_H + 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(MARGIN, fy - 2, PAGE_W - MARGIN, fy - 2);
 
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(broker.nombre_comercial, MARGIN, fy + 7);
 
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Tel / WhatsApp: ${broker.whatsapp}`, MARGIN, fy + 14);
  pdf.text(`Catalogo: https://${broker.subdominio}.inmublia.com`, MARGIN, fy + 20);
 
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Generado por Inmublia SaaS', PAGE_W - MARGIN, fy + 20, { align: 'right' });
}
 
/** Dibuja la cuadrícula de características y retorna la nueva Y */
function drawFeaturesGrid(pdf, propiedad, startY) {
  const features = [
    { label: 'Recamaras',   value: propiedad.recamaras?.toString()      || '-' },
    { label: 'Banos',       value: propiedad.banos?.toString()           || '-' },
    { label: 'Autos',       value: propiedad.estacionamientos?.toString()|| '-' },
    { label: 'M2 Const.',   value: propiedad.m2_construccion ? `${propiedad.m2_construccion} m2` : '-' },
    { label: 'M2 Terreno',  value: propiedad.m2_terreno ? `${propiedad.m2_terreno} m2` : '-' },
    { label: 'Tipo',        value: propiedad.tipo || '-' },
  ];
 
  const colW    = CONTENT_W / 3;
  const rowH    = 18;
  const boxPad  = 3;
 
  features.forEach((feat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x   = MARGIN + col * colW;
    const fy  = startY + row * rowH;
 
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x + boxPad, fy - 5, colW - boxPad * 2, 14, 2, 2, 'FD');
 
    // Valor (número grande)
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(feat.value, x + colW / 2, fy + 4, { align: 'center' });
 
    // Etiqueta pequeña arriba
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(feat.label, x + colW / 2, fy - 1, { align: 'center' });
  });
 
  return startY + Math.ceil(features.length / 3) * rowH;
}
 
/** Dibuja el mapa estático o el fallback */
async function drawMap(pdf, propiedad, startY) {
  const GOOGLE_MAPS_API_KEY = ''; // Pega tu API Key aquí para mapa real
 
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Ubicacion Geografica', MARGIN, startY);
  const mapY = startY + 7;
 
  if (GOOGLE_MAPS_API_KEY) {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(propiedad.ubicacion)}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(propiedad.ubicacion)}&key=${GOOGLE_MAPS_API_KEY}`;
    const mapImg = await toBase64(mapUrl);
    if (mapImg) {
      pdf.addImage(mapImg, 'PNG', MARGIN, mapY, CONTENT_W, 70, '', 'FAST');
      return;
    }
  }
 
  // Fallback sin API key
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(MARGIN, mapY, CONTENT_W, 38, 3, 3, 'FD');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Mapa disponible en el Smart Brochure digital', MARGIN + CONTENT_W / 2, mapY + 17, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(propiedad.ubicacion, MARGIN + CONTENT_W / 2, mapY + 24, { align: 'center' });
}
 
/** Convierte una URL de imagen a base64, tolerante a CORS */
async function toBase64(url) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn('Imagen omitida (CORS o red):', url);
    return null;
  }
}
