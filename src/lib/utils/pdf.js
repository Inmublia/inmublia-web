/**
 * src/lib/utils/pdf.js
 * Generador Flawless: Multidocumento, Galería, Mapa y Spacing corregido.
 */
export async function generarFichaPDF(propiedad, broker) {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- CONFIGURACIÓN DE MAPA ESTÁTICO ---
  // Para imprimir el mapa real, pega tu API KEY de Google Cloud aquí.
  // Si está vacía, se generará un bloque elegante de reemplazo.
  const GOOGLE_MAPS_API_KEY = ''; 

  // ==========================================
  // PÁGINA 1: PORTADA Y DATOS TÉCNICOS
  // ==========================================

  // --- HEADER ---
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 50, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INMUBLIA', margin, 24);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text('Exclusivas Inmobiliarias', margin, 32);

  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(formatearPrecio(propiedad.precio), pageWidth - margin, 24, { align: 'right' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(56, 189, 248); // blue-400
  pdf.text(propiedad.operacion.toUpperCase(), pageWidth - margin, 32, { align: 'right' });

  y = 60; 

  // --- FOTOGRAFÍA PRINCIPAL ---
  if (propiedad.imagen_url) {
    const imgData = await fetchImageAsBase64(propiedad.imagen_url);
    if (imgData) {
      const imgHeight = 90; 
      pdf.addImage(imgData, 'JPEG', margin, y, contentWidth, imgHeight);
      y += imgHeight + 10;
    }
  }

  // --- TITULO Y UBICACION ---
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(propiedad.titulo, contentWidth);
  pdf.text(titleLines, margin, y);
  y += (titleLines.length * 8) + 4;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(37, 99, 235); // Link azul
  pdf.textWithLink(`📍 ${propiedad.ubicacion} (Ver en Google Maps)`, margin, y, {
    url: `https://maps.google.com/maps?q=${encodeURIComponent(propiedad.ubicacion)}`
  });
  y += 15;

  // --- CUADRÍCULA DE CARACTERÍSTICAS (Spacing optimizado) ---
  const features = [
    { label: 'Recámaras', value: propiedad.recamaras?.toString() || '-' },
    { label: 'Baños', value: propiedad.banos?.toString() || '-' },
    { label: 'Autos', value: propiedad.estacionamientos?.toString() || '-' },
    { label: 'M² Const.', value: propiedad.m2_construccion ? `${propiedad.m2_construccion} m²` : '-' },
    { label: 'M² Terreno', value: propiedad.m2_terreno ? `${propiedad.m2_terreno} m²` : '-' },
    { label: 'Tipo', value: propiedad.tipo || '-' },
  ];

  const colWidth = contentWidth / 3;
  features.forEach((feat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * colWidth;
    const fy = y + row * 18; 

    // Cajas más amplias para que respiren los números
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(x, fy - 6, colWidth - 5, 15, 2, 2, 'FD'); 

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(feat.value, x + ((colWidth - 5) / 2), fy + 3, { align: 'center' }); // Número centrado hacia abajo

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(feat.label, x + ((colWidth - 5) / 2), fy - 2, { align: 'center' }); // Título elevado
  });

  y += Math.ceil(features.length / 3) * 18 + 10;

  // --- DESCRIPCION ---
  if (propiedad.descripcion) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('DESCRIPCIÓN DEL INMUEBLE', margin, y);
    y += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const descLines = pdf.splitTextToSize(propiedad.descripcion, contentWidth);
    pdf.text(descLines, margin, y);
  }

  // ==========================================
  // PÁGINA 2: GALERÍA SECUNDARIA Y MAPA
  // ==========================================
  pdf.addPage();
  let y2 = margin;

  // --- GALERÍA FOTOGRÁFICA ---
  const galeriaUrls = Array.isArray(propiedad.galeria_urls) ? propiedad.galeria_urls.slice(0, 4) : [];
  
  if (galeriaUrls.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Galería de la Propiedad', margin, y2);
    y2 += 8;

    const imgWidth = (contentWidth - 6) / 2; // 2 columnas con 6mm de separación
    const imgHeight = 60;
    
    // Descargamos las imágenes en paralelo para mayor velocidad
    const b64Images = await Promise.all(galeriaUrls.map(url => fetchImageAsBase64(url)));
    
    b64Images.forEach((img, i) => {
      if(!img) return;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const posX = margin + (col * (imgWidth + 6));
      const posY = y2 + (row * (imgHeight + 6));
      pdf.addImage(img, 'JPEG', posX, posY, imgWidth, imgHeight);
    });
    
    y2 += Math.ceil(b64Images.length / 2) * (imgHeight + 6) + 12;
  }

  // --- UBICACIÓN IMPRESA (MAPA ESTÁTICO) ---
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text('Ubicación Geográfica', margin, y2);
  y2 += 8;

  if (GOOGLE_MAPS_API_KEY) {
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(propiedad.ubicacion)}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(propiedad.ubicacion)}&key=${GOOGLE_MAPS_API_KEY}`;
    const mapImg = await fetchImageAsBase64(mapUrl);
    if (mapImg) {
      pdf.addImage(mapImg, 'PNG', margin, y2, contentWidth, 75);
    }
  } else {
    // Fallback Elegante si no hay API Key
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(margin, y2, contentWidth, 40, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text("Mapa interactivo disponible en el Smart Brochure digital", margin + (contentWidth/2), y2 + 20, { align: 'center' });
  }

  // --- FOOTER FIJO (Igual en P1 y P2) ---
  const drawFooter = (paginaPdf) => {
    const footerY = 275;
    paginaPdf.setFillColor(248, 250, 252);
    paginaPdf.rect(0, footerY - 10, pageWidth, 35, 'F');
    paginaPdf.setDrawColor(226, 232, 240);
    paginaPdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
    paginaPdf.setTextColor(15, 23, 42);
    paginaPdf.setFontSize(12);
    paginaPdf.setFont('helvetica', 'bold');
    paginaPdf.text(broker.nombre_comercial, margin, footerY);
    paginaPdf.setFontSize(9);
    paginaPdf.setFont('helvetica', 'normal');
    paginaPdf.setTextColor(100, 116, 139);
    paginaPdf.text(`Teléfono / WhatsApp: ${broker.whatsapp}`, margin, footerY + 6);
    paginaPdf.text(`Catálogo Digital: https://${broker.subdominio}.inmublia.com`, margin, footerY + 11);
    paginaPdf.setFontSize(8);
    paginaPdf.setTextColor(148, 163, 184);
    paginaPdf.text('Generado por Inmublia SaaS', pageWidth - margin, footerY + 11, { align: 'right' });
  };

  // Imprimir footer en página 1
  pdf.setPage(1);
  drawFooter(pdf);
  // Imprimir footer en página 2
  pdf.setPage(2);
  drawFooter(pdf);

  // Guardar archivo
  const nombreArchivo = propiedad.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  pdf.save(`Ficha-${nombreArchivo}.pdf`);
}

// Convertidor Universal de Imágenes a Base64 para evitar bloqueos CORS
async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Imagen omitida por CORS o error de red:", url);
    return null; // Si falla, regresa null y el PDF continúa sin romperse
  }
}
