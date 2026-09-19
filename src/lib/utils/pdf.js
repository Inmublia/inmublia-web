/**
 * src/lib/utils/pdf.js
 * INMUBLIA — Generador de Ficha PDF v3.1 (Enterprise + Cache Buster)
 */
 
const PAGE_W      = 210;
const PAGE_H      = 297;
const MARGIN      = 20;
const CONTENT_W   = PAGE_W - MARGIN * 2;
const FOOTER_H    = 35;                        
const FOOTER_Y    = PAGE_H - FOOTER_H - 5;     
const SAFE_BOTTOM = FOOTER_Y - 8;              
 
export async function generarFichaPDF(propiedad, broker) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
 
  const newPage = () => {
    pdf.addPage();
    drawFooter(pdf, broker);
    return MARGIN;
  };
 
  const checkSpace = (currentY, neededHeight) => {
    if (currentY + neededHeight > SAFE_BOTTOM) return newPage();
    return currentY;
  };
 
  // ── CABECERA ──
  drawHeader(pdf, propiedad);
  drawFooter(pdf, broker);
 
  let y = 58;
 
  // ── FOTO PRINCIPAL ──
  if (propiedad.imagen_url) {
    const imgObj = await toBase64(propiedad.imagen_url);
    if (imgObj) {
      const h = 85;
      y = checkSpace(y, h);
      pdf.addImage(imgObj.data, imgObj.format, MARGIN, y, CONTENT_W, h, '', 'FAST');
      y += h + 8;
    }
  }
 
  // ── TÍTULO ──
  y = checkSpace(y, 16);
  pdf.setFontSize(17);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  const titleLines = pdf.splitTextToSize(propiedad.titulo || 'Sin título', CONTENT_W);
  pdf.text(titleLines, MARGIN, y);
  y += titleLines.length * 7 + 4;
 
  // ── DIRECCIÓN (Sin Emojis) ──
  y = checkSpace(y, 10);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  const direccionLabel = 'Direccion: ';
  const direccionText  = `${propiedad.ubicacion || 'No especificada'}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(propiedad.ubicacion || '')}`;
 
  pdf.setTextColor(15, 23, 42);
  pdf.text(direccionLabel, MARGIN, y);
 
  const labelWidth = pdf.getTextWidth(direccionLabel);
  pdf.setTextColor(37, 99, 235);
  pdf.textWithLink(
    pdf.splitTextToSize(direccionText, CONTENT_W - labelWidth)[0],
    MARGIN + labelWidth,
    y,
    { url: mapUrl }
  );
 
  const allDirLines = pdf.splitTextToSize(direccionText, CONTENT_W - labelWidth);
  if (allDirLines.length > 1) {
    y += 5;
    pdf.text(allDirLines.slice(1).join(' '), MARGIN, y);
  }
  y += 12;
 
  // ── CARACTERÍSTICAS ──
  y = drawFeaturesGrid(pdf, propiedad, y);
  y += 8;
 
  // ── DESCRIPCIÓN MULTIPÁGINA ──
  if (propiedad.descripcion) {
    y = checkSpace(y, 14);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('DESCRIPCION DEL INMUEBLE', MARGIN, y);
    y += 7;
 
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
 
    const descLines = pdf.splitTextToSize(propiedad.descripcion, CONTENT_W);
    const lineHeight = 5;
 
    for (const line of descLines) {
      if (y + lineHeight > SAFE_BOTTOM) {
        y = newPage();
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
      }
      pdf.text(line, MARGIN, y);
      y += lineHeight;
    }
  }
 
  // ── GALERÍA (Secuencial para evitar OOM) ──
  const galeriaUrls = Array.isArray(propiedad.galeria_urls) ? propiedad.galeria_urls : [];
 
  if (galeriaUrls.length > 0) {
    let yG = newPage();
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Galeria de la Propiedad', MARGIN, yG);
    yG += 8;
 
    const colW   = (CONTENT_W - 6) / 2;
    const imgH   = 58;
    const gap    = 5;
 
    const validImages = [];
    for (const url of galeriaUrls) {
      const imgObj = await toBase64(url);
      if (imgObj) validImages.push(imgObj);
    }
 
    for (let i = 0; i < validImages.length; i++) {
      const imgObj = validImages[i];
      const col  = i % 2;
      const posX = MARGIN + col * (colW + 6);
 
      if (col === 0) {
        yG = checkSpace(yG, imgH + gap);
        if (yG === MARGIN) {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
          pdf.text('Galeria (continuacion)', MARGIN, yG);
          yG += 7;
        }
      }
 
      pdf.addImage(imgObj.data, imgObj.format, posX, yG, colW, imgH, '', 'FAST');
 
      if (col === 1 || i === validImages.length - 1) {
        yG += imgH + gap;
      }
    }
 
    yG = checkSpace(yG, 85);
    await drawMap(pdf, propiedad, yG);
  }
 
  const slug = (propiedad.titulo || 'propiedad')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') 
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
 
  pdf.save(`Ficha-${slug}.pdf`);
}
 
// ─── HELPERS ───
 
function drawHeader(pdf, propiedad) {
  const formatPrecio = (v) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v || 0);
 
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
 
function drawFooter(pdf, broker) {
  const fy = FOOTER_Y;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, fy - 2, PAGE_W, FOOTER_H + 2, 'F');
  pdf.setDrawColor(226, 232, 240);
  pdf.line(MARGIN, fy - 2, PAGE_W - MARGIN, fy - 2);
 
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(broker?.nombre_comercial || 'Asesor Independiente', MARGIN, fy + 7);
 
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Tel / WhatsApp: ${broker?.whatsapp || 'No disponible'}`, MARGIN, fy + 14);
  pdf.text(`Catalogo: https://${broker?.subdominio || 'www'}.inmublia.com`, MARGIN, fy + 20);
 
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Generado por Inmublia', PAGE_W - MARGIN, fy + 20, { align: 'right' });
}
 
function drawFeaturesGrid(pdf, propiedad, startY) {
  const features = [
    { label: 'Recamaras',   value: propiedad.recamaras?.toString()      || '-' },
    { label: 'Banos',       value: propiedad.banos?.toString()          || '-' },
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
 
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(feat.value, x + colW / 2, fy + 4, { align: 'center' });
 
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(feat.label, x + colW / 2, fy - 1, { align: 'center' });
  });
 
  return startY + Math.ceil(features.length / 3) * rowH;
}
 
async function drawMap(pdf, propiedad, startY) {
  const GOOGLE_MAPS_API_KEY = ''; 
 
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Ubicacion Geografica', MARGIN, startY);
  const mapY = startY + 7;
 
  if (GOOGLE_MAPS_API_KEY) {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(propiedad.ubicacion)}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(propiedad.ubicacion)}&key=${GOOGLE_MAPS_API_KEY}`;
    const mapImg = await toBase64(mapUrl);
    if (mapImg) {
      pdf.addImage(mapImg.data, mapImg.format, MARGIN, mapY, CONTENT_W, 70, '', 'FAST');
      return;
    }
  }
 
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(MARGIN, mapY, CONTENT_W, 38, 3, 3, 'FD');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text('Mapa disponible en el Smart Brochure digital', MARGIN + CONTENT_W / 2, mapY + 17, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(propiedad.ubicacion || '', MARGIN + CONTENT_W / 2, mapY + 24, { align: 'center' });
}
 
/** 🔴 CACHE BUSTER Y CORS FIX */
async function toBase64(url) {
  try {
    const secureUrl = url.replace(/^http:\/\//i, 'https://');
    const separator = secureUrl.includes('?') ? '&' : '?';
    const cacheBusterUrl = `${secureUrl}${separator}cb=${Date.now()}`;
    
    const res = await fetch(cacheBusterUrl, { 
      mode: 'cors', 
      credentials: 'omit',
      cache: 'no-store' 
    });
    
    if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
    
    const blob = await res.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        const formatMatch = result.match(/data:image\/(.*);base64/);
        let format = 'JPEG';
        
        if (formatMatch && formatMatch[1]) {
          format = formatMatch[1].toUpperCase();
          if (format === 'JPG') format = 'JPEG';
          if (format !== 'PNG' && format !== 'JPEG') {
            format = 'JPEG';
          }
        }
        resolve({ data: result, format: format });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`[PDF CDN] Fallo al cargar foto: ${url} - Error: ${err.message}`);
    return null;
  }
}
