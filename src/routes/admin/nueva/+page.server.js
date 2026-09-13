generarCampañaIA: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    if (!platform?.env?.AI) {
      return fail(500, { error: 'Falla de Servidor: El Binding "AI" no está conectado en Cloudflare.' });
    }

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id, ia_creditos_disponibles')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker || broker.ia_creditos_disponibles <= 0) {
      return fail(403, { error: 'Has agotado tus créditos de IA.' });
    }

    const formData = await request.formData();
    const ubicacion = formData.get('ubicacion');
    const precio = formData.get('precio');
    const tipo = formData.get('tipo');
    const operacion = formData.get('operacion');
    const tono = formData.get('tono');
    const recamaras = formData.get('recamaras') || '0';
    const banos = formData.get('banos') || '0';
    const medio_bano = formData.get('medio_bano') || '0';
    const estacionamientos = formData.get('estacionamientos') || '0';
    const antiguedad = formData.get('antiguedad') || 'No especificada';

    if (!ubicacion || !precio) return fail(400, { error: 'Se requiere precio y ubicación.' });

    const systemPrompt = `Eres un copywriter inmobiliario corporativo de élite.
    REGLA 1: Devuelve SOLO un objeto JSON puro, en una línea.
    REGLA 2: No uses markdown (\`\`\`json).
    REGLA 3: Usa comillas simples dentro de tus textos. NUNCA uses comillas dobles en los valores internos.
    REGLA 4: CEÑIRSE ESTRICTAMENTE A LOS DATOS. PROHIBIDO alucinar.`;

    const userPrompt = `
      Genera contenido. Tono: ${tono}. Operación: ${operacion} de ${tipo} en ${ubicacion}. Precio: $${precio}.
      Características exactas (no inventes más): ${recamaras} Recámaras, ${banos} Baños Completos, ${medio_bano} Medios Baños, ${estacionamientos} Autos, Antigüedad: ${antiguedad}.
      
      Devuelve ESTRICTAMENTE este JSON:
      {
        "titulo": "(Máximo 10 palabras. Gancho profesional)",
        "descripcion": "(Mínimo 150 palabras. Escribe exactamente 3 párrafos usando el texto literal '\\n\\n' para separarlos. Párrafo 1: Estilo de vida general. Párrafo 2: Arquitectura basada SOLO en los datos numéricos dados. Párrafo 3: Ubicación y cierre.)",
        "whatsapp": "(Mensaje profesional y elegante. Usa un máximo de 3 emojis. Separa las líneas con '\\n\\n'. Incluye llamado a la acción)"
      }
    `;

    // STRINGS EXACTOS DE PRODUCCIÓN CLOUDFLARE
    const modelosActivos = [
      '@cf/meta/llama-3.1-8b-instruct',        // Prioridad 1: Premium
      '@cf/mistral/mistral-7b-instruct-v0.1',  // Prioridad 2: Volumen/Respaldo (v0.1 oficial)
      '@cf/meta/llama-3-8b-instruct'           // Prioridad 3: Tanque hiper-estable
    ];

    let rawResponse = null;
    let modeloExitoso = '';
    let erroresLog = [];

    for (const modelo of modelosActivos) {
      try {
        const response = await platform.env.AI.run(modelo, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1024 // FIX: Límite seguro aceptado por todos los motores
        });
        
        rawResponse = response.response;
        
        if (rawResponse) {
          modeloExitoso = modelo;
          break; // Rompemos el ciclo si hubo éxito
        }
      } catch (e) {
        // Guardamos el error real de Cloudflare para debug si vuelve a fallar
        erroresLog.push(`[${modelo}]: ${e.message}`);
      }
    }

    if (!rawResponse) {
      // Ahora si falla, te dirá EXACTAMENTE por qué falló Cloudflare
      return fail(500, { error: `Todos los motores caídos. Detalles: ${erroresLog.join(' | ')}` });
    }

    let parsedContent = {};

    if (typeof rawResponse === 'object' && rawResponse !== null) {
      parsedContent = rawResponse;
    } else {
      let cleanText = String(rawResponse);
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1) {
        return fail(500, { error: `El motor ${modeloExitoso} falló al generar JSON.` });
      }

      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      cleanText = cleanText.replace(/\n/g, '\\n').replace(/\r/g, '');
      cleanText = cleanText.replace(/[\u0000-\u0009\u000B-\u001F]+/g, ' ');

      try {
        parsedContent = JSON.parse(cleanText);
      } catch (err) {
        return fail(500, { error: `Error JSON (${modeloExitoso}): ${err.message}` });
      }
    }

    await locals.supabase
      .from('brokers')
      .update({ ia_creditos_disponibles: broker.ia_creditos_disponibles - 1 })
      .eq('id', broker.id);

    return {
      titulo: parsedContent.titulo || parsedContent.Titulo || 'Propiedad Exclusiva',
      descripcion: parsedContent.descripcion || parsedContent.Descripcion || 'Contacta al broker.',
      whatsapp: parsedContent.whatsapp || parsedContent.WhatsApp || parsedContent.Whatsapp || '¡Hola! Te comparto esta propiedad...'
    };
  },
