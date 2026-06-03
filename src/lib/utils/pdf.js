/**
 * src/lib/utils/pdf.js
 * Genera un PDF estructurado vectorial a costo cero.
 */
export async function generarFichaPDF(propiedad, broker) {
  // Importación dinámica para proteger el tiempo de carga inicial
  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- HEADER: Estilo Inmublia ---
  pdf.setFillColor(15, 23, 42); // slate-900
  pdf.rect(0, 0, pageWidth, 50, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INMUBLIA', margin, 24);

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184); // slate-400
  pdf.text('Exclusivas Inmobiliarias', margin, 32);

  // Precio destacado
  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(formatearPrecio(propiedad.precio), pageWidth - margin, 24, { align: 'right' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(56, 189, 248); // blue-400
  pdf.text(propiedad.operacion.toUpperCase(), pageWidth - margin, 32, { align: 'right' });

  y = 65;

  // --- TITULO Y UBICACION ---
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  
  // Soporte para títulos largos (multilínea)
  const titleLines = pdf.splitTextToSize(propiedad.titulo, contentWidth);
  pdf.text(titleLines, margin, y);
  y += (titleLines.length * 8) + 4;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(propiedad.ubicacion, margin, y);
  y += 15;

  // --- CUADRÍCULA DE CARACTERÍSTICAS ---
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
    const fy = y + row * 16;

    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.setDrawColor(226, 232, 240); // border-slate-200
    pdf.roundedRect(x, fy - 6, colWidth - 4, 14, 2, 2, 'FD');

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(feat.value, x + ((colWidth - 4) / 2), fy + 1, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(feat.label, x + ((colWidth - 4) / 2), fy - 3, { align: 'center' });
  });

  y += Math.ceil(features.length / 3) * 16 + 10;

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

  // --- FOOTER FIJO (Agencia) ---
  const footerY = 275;
  pdf.setFillColor(248, 250, 252);
  pdf.rect(0, footerY - 10, pageWidth, 35, 'F');
  
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, footerY - 10, pageWidth - margin, footerY - 10);

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(broker.nombre_comercial, margin, footerY);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(`Teléfono / WhatsApp: ${broker.whatsapp}`, margin, footerY + 6);
  pdf.text(`Catálogo Digital: https://${broker.subdominio}.inmublia.com`, margin, footerY + 11);

  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Ficha técnica generada por Inmublia', pageWidth - margin, footerY + 11, { align: 'right' });

  // Guardar archivo
  const nombreArchivo = propiedad.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  pdf.save(`Ficha-${nombreArchivo}.pdf`);
}
