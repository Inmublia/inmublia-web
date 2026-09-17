import { json } from '@sveltejs/kit';

export async function POST({ locals, platform }) {
  if (!platform?.env?.AI) return json({ error: 'AI no conectada' }, { status: 500 });

  // 🧠 MEGA GLOSARIO INMUBLIA (15+ Tópicos de Soporte)
  const nuevosConocimientos = [
    // --- CUENTA Y FACTURACIÓN ---
    { categoria: 'Suscripción Upgrade/Downgrade', contenido: 'Puedes cambiar tu plan (Básico, Pro, Elite) desde la sección "Configuración". Si haces un Upgrade, el cambio y el cobro prorrateado son inmediatos. Si haces Downgrade, los beneficios de tu plan superior se mantienen hasta el final de tu ciclo de facturación actual.' },
    { categoria: 'Facturación y Recibos', contenido: 'Para descargar tus facturas o recibos de suscripción, ve a "Configuración > Historial de Pagos". Los documentos fiscales se emiten automáticamente en las primeras 24 horas tras el cobro exitoso mensual o anual.' },
    { categoria: 'Recarga de Créditos IA', contenido: 'Si te quedas sin Créditos IA antes de tu corte mensual, puedes adquirir paquetes adicionales (Top-Ups) desde la sección de Configuración. Estos créditos comprados no tienen fecha de caducidad y se suman a tu balance global.' },
    { categoria: 'Restablecer Contraseña', contenido: 'Si olvidaste tu contraseña, haz clic en "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión (inmublia.com/login). Ingresa tu correo y te enviaremos un enlace seguro válido por 15 minutos para crear una nueva.' },
    
    // --- GESTIÓN DE PROPIEDADES ---
    { categoria: 'Estados de Propiedad', contenido: 'Una propiedad puede tener 3 estados principales: "Pública" (visible en tu catálogo), "Pre-Mercado" (oculta, solo accesible vía enlace directo secreto) y "Vendida/Rentada" (desactivada como inventario pero guardada en tu historial para estadísticas).' },
    { categoria: 'Edición en Vivo', contenido: 'Puedes editar cualquier dato de una propiedad, incluyendo su precio y galería, desde el "Inventario Maestro" haciendo clic en el icono del lápiz. Los cambios se reflejarán en vivo en tu Smart Brochure inmediatamente.' },
    { categoria: 'Eliminar Propiedad', contenido: 'Si eliminas una propiedad usando el ícono del bote de basura rojo, esta acción es irreversible. Se borrarán sus fotos, su Smart Brochure y su registro. Te recomendamos cambiar su estatus a "Vendida" o "Archivada" si deseas conservar su historial.' },
    { categoria: 'Subdominios del Broker', contenido: 'Al crear tu cuenta en Inmublia, se te asigna un subdominio gratuito (ejemplo: agencia.inmublia.com). Este enlace funciona como tu portal inmobiliario público donde tus clientes podrán ver todas tus propiedades activas (Públicas).' },
    { categoria: 'Smart Brochure', contenido: 'El Smart Brochure es un folleto virtual que Inmublia genera automáticamente por cada propiedad. Es un mini-sitio web altamente persuasivo, sin distracciones, optimizado para móviles y diseñado para enviarse rápidamente por WhatsApp.' },

    // --- OPEN HOUSE ---
    { categoria: 'Check-in Visitantes', contenido: 'Durante un Open House, tus visitantes pueden registrarse sin fricción escaneando el código QR impreso en la propiedad o acercando su teléfono inteligente a la etiqueta NFC oficial de myrIDertag. El sistema capturará sus datos y los enviará a tu CRM.' },
    { categoria: 'Reagendar Open House', contenido: 'No es posible modificar la fecha o la hora de un evento de Open House si este ya ha comenzado. Si necesitas reprogramarlo antes de su inicio, edita la propiedad desde el módulo Open House; esto actualizará automáticamente los enlaces de invitación enviados.' },
    { categoria: 'Beneficios y Ofertas', contenido: 'Al configurar un Open House, puedes usar el campo "Incentivo de Asistencia" para agregar ganchos comerciales (ej. avalúo gratis, asesoría de crédito). Este incentivo será resaltado por la IA al redactar las invitaciones de WhatsApp.' },

    // --- CRM Y PROSPECTOS ---
    { categoria: 'Exportar Base de Datos', contenido: 'Puedes exportar toda tu base de prospectos y visitantes (Leads) en formato CSV para usar en otras herramientas. Dirígete a la sección "Prospectos (CRM)", aplica los filtros deseados y haz clic en el botón superior "Exportar".' },
    { categoria: 'Etapas del Embudo (Kanban)', contenido: 'El CRM integrado organiza a tus prospectos en un tablero visual arrastrable. Las etapas son: Nuevo (recién llegado), Contactado (en seguimiento), Negociación (oferta en mesa), y Cierre (trato exitoso). Puedes arrastrar las tarjetas libremente.' },
    { categoria: 'Cierre de Trato', contenido: 'Al mover un prospecto a la columna de "Cierre" en el CRM, el sistema te pedirá que captures el Monto Final de la operación y el porcentaje de comisión real cobrado. Esto alimentará el módulo de Inteligencia Financiera de tu dashboard.' },

    // --- ESCALAMIENTO TÉCNICO ---
    { categoria: 'Soporte Nivel 2', contenido: 'Si experimentas una falla técnica grave en la plataforma, un error de despliegue o la IA no puede resolver tu duda, puedes solicitar escalar tu caso al Nivel 2 enviando un correo electrónico directamente a soporte@inmublia.com detallando tu problema.' }
  ];

  try {
    const insertData = [];

    for (const item of nuevosConocimientos) {
      // Usamos el motor multilingüe BGE-M3 para vectorizar
      const { data } = await platform.env.AI.run('@cf/baai/bge-m3', {
        text: [item.contenido]
      });

      insertData.push({
        categoria: item.categoria,
        contenido: item.contenido,
        embedding: data[0]
      });
    }

    const { error } = await locals.supabase.from('soporte_glosario').insert(insertData);
    if (error) throw error;

    return json({ success: true, message: '16 Nuevas píldoras de conocimiento inyectadas con éxito en el cerebro IA.' });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
}
