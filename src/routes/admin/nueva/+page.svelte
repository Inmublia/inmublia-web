<script>
  import { enhance } from '$app/forms';
  import imageCompression from 'browser-image-compression';

  let { form, data } = $props();
  // El backend nos inyecta los créditos restantes
  let creditosIA = $state(data.creditos_ia ?? 0);
  
  let loading = $state(false);
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(false);

  // --- ESTADOS DE LA INTELIGENCIA ARTIFICIAL ---
  let generandoIA = $state(false);
  let tonoIA = $state('lujo');
  let tabActiva = $state('ficha'); // 'ficha' | 'whatsapp' | 'tiktok'
  
  // Textos generados (se muestran en la UI y luego el usuario decide si los aplica)
  let textoGeneradoFicha = $state({ titulo: '', descripcion: '' });
  let textoGeneradoWhatsapp = $state('');
  let textoGeneradoTiktok = $state('');

  // Referencias a los inputs reales del formulario
  let inputTitulo = $state(null);
  let inputDescripcion = $state(null);
  let inputPrecio = $state(null);
  let inputUbicacion = $state(null);
  let selectTipo = $state(null);
  let selectOperacion = $state(null);
  let inputRecamaras = $state(null);

  // --- MANEJO DE IMÁGENES ---
  function handleImageChange(event) {
    const file = event.target.files[0];
    imagePreview = file ? URL.createObjectURL(file) : null;
  }

  function handleGaleriaChange(event) {
    const files = event.target.files;
    galeriaPreviews = Array.from(files).map(file => URL.createObjectURL(file));
  }

  // --- FUNCIÓN MAGICA: EFECTO MÁQUINA DE ESCRIBIR ---
  async function typeWriterEffect(targetObject, key, text, speed = 10) {
    targetObject[key] = '';
    for (let i = 0; i < text.length; i++) {
      targetObject[key] += text.charAt(i);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  // --- EL LLAMADO A LA IA ---
  async function generarCampañaIA() {
    if (!inputUbicacion.value || !inputPrecio.value || !selectTipo.value) {
      alert("Por favor, llena al menos: Tipo, Precio y Ubicación para que la IA tenga contexto.");
      return;
    }

    if (creditosIA <= 0) {
      alert("No tienes créditos de IA disponibles. Sube al plan Pro para obtener 100 créditos mensuales.");
      return;
    }

    generandoIA = true;
    
    // Limpiamos los textos anteriores
    textoGeneradoFicha = { titulo: '', descripcion: '' };
    textoGeneradoWhatsapp = '';
    textoGeneradoTiktok = '';

    try {
      const formData = new FormData();
      formData.append('ubicacion', inputUbicacion.value);
      formData.append('precio', inputPrecio.value);
      formData.append('tipo', selectTipo.value);
      formData.append('operacion', selectOperacion.value);
      formData.append('recamaras', inputRecamaras?.value || 'No especificado');
      formData.append('tono', tonoIA);

      const res = await fetch('?/generarCampañaIA', {
        method: 'POST',
        body: formData,
        headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' }
      });

      const result = await res.json();
      
      if (result.type === 'success' && result.data) {
        // Restamos el crédito en la UI instantáneamente para buen UX
        creditosIA--;

        // Animamos los textos simultáneamente
        Promise.all([
          typeWriterEffect(textoGeneradoFicha, 'titulo', result.data.titulo, 15),
          typeWriterEffect(textoGeneradoFicha, 'descripcion', result.data.descripcion, 5),
          (async () => { textoGeneradoWhatsapp = result.data.whatsapp; })(), // Sin animación para no marear
          (async () => { textoGeneradoTiktok = result.data.tiktok; })()
        ]);
        
      } else {
        alert(result.data?.error || "Error al conectar con la IA.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red al invocar a la IA.");
    } finally {
      generandoIA = false;
    }
  }

  function aplicarAlFormulario() {
    if (inputTitulo && textoGeneradoFicha.titulo) inputTitulo.value = textoGeneradoFicha.titulo;
    if (inputDescripcion && textoGeneradoFicha.descripcion) inputDescripcion.value = textoGeneradoFicha.descripcion;
    // Ocultamos la IA o damos feedback de éxito
    alert("¡Textos aplicados! Puedes seguir editando o guardar la propiedad.");
  }

  function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto);
    alert("¡Copiado al portapapeles!");
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-blue-600 transition-colors mr-4 bg-slate-100 hover:bg-blue-50 p-2 rounded-lg" aria-label="Volver al inicio">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900">Crear Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100">{form.error}</div>
      {/if}

      <form method="POST" action="?/crear" enctype="multipart/form-data" use:enhance={async ({ formData }) => { 
        loading = true; 
        try {
          const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.8 };
          const imagenPrincipal = formData.get('imagen');
          if (imagenPrincipal && imagenPrincipal.size > 0) {
            const compressedMain = await imageCompression(imagenPrincipal, options);
            formData.set('imagen', compressedMain, compressedMain.name);
          }
          const galeriaArchivos = formData.getAll('galeria');
          if (galeriaArchivos.length > 0 && galeriaArchivos[0].size > 0) {
            formData.delete('galeria');
            for (let i = 0; i < galeriaArchivos.length; i++) {
              if (galeriaArchivos[i].size > 0) {
                const compressedGal = await imageCompression(galeriaArchivos[i], options);
                formData.append('galeria', compressedGal, compressedGal.name);
              }
            }
          }
        } catch (error) {
          console.error("Error comprimiendo", error);
        }
        return async ({ update }) => { loading = false; update(); }; 
      }} class="space-y-10">
        
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-black text-indigo-900 mb-1 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Visibilidad en el Catálogo
            </h3>
            <p class="text-[11px] text-indigo-700 font-medium">Si la ocultas, quedará en "Pre-Mercado".</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0" for="is_oculta">
            <input type="checkbox" id="is_oculta" name="is_oculta" class="sr-only peer" bind:checked={isOculta}>
            <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            <span class="ml-3 text-xs font-bold {isOculta ? 'text-indigo-600' : 'text-slate-500 uppercase tracking-widest'}">
              {isOculta ? 'Pre-Mercado' : 'Pública'}
            </span>
          </label>
        </div>

        <div class="space-y-6">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">1. Carga los Datos Base</h3>
          
          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div>
              <label for="operacion" class="block text-sm font-bold text-slate-700 mb-2">Operación</label>
              <select bind:this={selectOperacion} id="operacion" name="operacion" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label for="tipo" class="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
              <select bind:this={selectTipo} id="tipo" name="tipo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-sm font-bold text-slate-700 mb-2">Precio (MXN)</label>
              <input bind:this={inputPrecio} id="precio" type="number" name="precio" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-lg font-black">
            </div>

            <div class="sm:col-span-2">
              <label for="ubicacion" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación (Colonia, Ciudad)</label>
              <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3">
            </div>
            <div><label for="recamaras" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="banos" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Baños Completos</label><input id="banos" type="number" name="banos" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-slate-100">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 class="text-lg font-black text-slate-900">2. Textos y Marketing</h3>
          </div>

          <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div class="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/30 rounded-full blur-3xl"></div>
            <div class="relative z-10 text-white">
              <h4 class="text-xl font-black tracking-tight mb-1 flex items-center gap-2">
                Asistente IA de Campañas
              </h4>
              <p class="text-indigo-200 text-sm font-medium">Genera título, descripción, WhatsApp y guion para TikTok en un clic.</p>
            </div>
            
            <div class="relative z-10 flex flex-col items-end gap-3 w-full md:w-auto">
              <div class="flex gap-2 w-full">
                <select bind:value={tonoIA} class="bg-white/10 text-white border border-white/20 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="lujo" class="text-slate-900">Tono Premium / Lujo</option>
                  <option value="familiar" class="text-slate-900">Tono Familiar / Cálido</option>
                  <option value="inversionista" class="text-slate-900">Tono Inversionista / ROI</option>
                </select>
                <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-900 font-black px-6 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                  {#if generandoIA}
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Escribiendo...
                  {:else}
                    ✨ Generar
                  {/if}
                </button>
              </div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Créditos IA: {creditosIA}</p>
            </div>
          </div>

          {#if textoGeneradoFicha.titulo || textoGeneradoWhatsapp || generandoIA}
            <div class="border border-indigo-100 rounded-2xl bg-white shadow-sm overflow-hidden animate-[fadeIn_0.5s_ease-out]">
              <div class="flex border-b border-indigo-50 bg-indigo-50/30 px-2 pt-2 gap-2">
                <button type="button" onclick={() => tabActiva = 'ficha'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors {tabActiva === 'ficha' ? 'bg-white text-indigo-700 border-t border-x border-indigo-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}">
                  📝 Ficha Técnica
                </button>
                <button type="button" onclick={() => tabActiva = 'whatsapp'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors {tabActiva === 'whatsapp' ? 'bg-white text-[#25D366] border-t border-x border-[#25D366]/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}">
                  💬 WhatsApp
                </button>
                <button type="button" onclick={() => tabActiva = 'tiktok'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors {tabActiva === 'tiktok' ? 'bg-white text-rose-500 border-t border-x border-rose-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}">
                  📱 Guion TikTok
                </button>
              </div>

              <div class="p-6">
                <div class="{tabActiva === 'ficha' ? 'block' : 'hidden'}">
                  <div class="mb-4">
                    <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Título Generado</label>
                    <p class="text-xl font-black text-slate-900">{textoGeneradoFicha.titulo || 'Escribiendo...'}</p>
                  </div>
                  <div class="mb-6">
                    <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Descripción Generada</label>
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed min-h-[100px]">
                      {textoGeneradoFicha.descripcion || 'Escribiendo...'}
                    </div>
                  </div>
                  <button type="button" onclick={aplicarAlFormulario} class="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 text-sm">
                    ✔️ Aplicar Título y Descripción a la Propiedad
                  </button>
                </div>

                <div class="{tabActiva === 'whatsapp' ? 'block' : 'hidden'}">
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-bold text-[#25D366] text-lg">Texto de Difusión</h4>
                      <p class="text-xs text-slate-500">Listo para enviar a grupos o listas.</p>
                    </div>
                    <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="bg-[#25D366]/10 text-[#25D366] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#25D366]/20 transition-colors">
                      📋 Copiar Mensaje
                    </button>
                  </div>
                  <div class="p-5 bg-[#E1F7E7] border border-[#25D366]/30 rounded-xl text-sm text-slate-800 whitespace-pre-line shadow-inner max-w-sm">
                    {textoGeneradoWhatsapp || 'Escribiendo...'}
                  </div>
                </div>

                <div class="{tabActiva === 'tiktok' ? 'block' : 'hidden'}">
                  <div class="flex justify-between items-start mb-4">
                    <div>
                      <h4 class="font-bold text-rose-500 text-lg">Guion de Video Vertical</h4>
                      <p class="text-xs text-slate-500">Teleprompter estructurado para retener la atención.</p>
                    </div>
                    <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors">
                      📋 Copiar Guion
                    </button>
                  </div>
                  <div class="p-6 bg-slate-900 rounded-xl text-sm text-slate-300 whitespace-pre-line border-l-4 border-rose-500 shadow-inner">
                    {textoGeneradoTiktok || 'Escribiendo...'}
                  </div>
                </div>
              </div>
            </div>
          {/if}
          
          <div class="pt-4 mt-6 border-t border-slate-100">
            <div class="sm:col-span-2 mb-4">
              <label for="titulo" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Publicación (Oficial)</label>
              <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" required class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-sm font-bold shadow-sm">
            </div>
            <div class="col-span-2 sm:col-span-4 mb-4">
              <label for="descripcion" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción (Oficial)</label>
              <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="4" class="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm shadow-sm"></textarea>
            </div>
            <div class="sm:col-span-2 flex items-center mt-2">
              <input type="checkbox" id="destacada" name="destacada" class="w-5 h-5 text-amber-600 rounded cursor-pointer border border-amber-300 bg-amber-50">
              <label for="destacada" class="ml-3 text-sm font-bold text-amber-900 cursor-pointer">Marcar como Signature / VIP</label>
            </div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-slate-100">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">3. Multimedia y Detalles</h3>
          
          <div>
            <label for="imagen_principal" class="block text-sm font-bold text-slate-700 mb-2">Fotografía Principal (Hero)</label>
            <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group h-48 bg-white">
              {#if imagePreview}
                <img src={imagePreview} alt="Vista previa de portada" class="absolute inset-0 w-full h-full object-cover z-10" />
              {/if}
              <div class="relative z-20 bg-white/90 backdrop-blur-sm p-4 rounded-lg text-center shadow-sm">
                <span class="text-blue-600 font-bold cursor-pointer">Subir portada (1 foto)</span>
                <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onchange={handleImageChange}>
              </div>
            </div>
          </div>

          <div>
            <label for="galeria_input" class="block text-sm font-bold text-slate-700 mb-2">Galería Secundaria (Mosaico)</label>
            <div class="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative bg-white">
              <div class="text-center z-10 relative bg-white/90 p-3 rounded-lg shadow-sm">
                <span class="text-blue-600 font-bold cursor-pointer">Seleccionar 3 a 5 fotos adicionales</span>
                <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleGaleriaChange}>
              </div>
              {#if galeriaPreviews.length > 0}
                <div class="mt-4 grid grid-cols-4 gap-2 w-full">
                  {#each galeriaPreviews as preview, index}
                    <div class="aspect-square rounded-lg overflow-hidden bg-slate-100"><img src={preview} alt="Miniatura de la galería {index + 1}" class="w-full h-full object-cover"/></div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4">
            <div class="col-span-2"><label for="m2_terreno" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div class="col-span-2"><label for="m2_construccion" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="medio_bano" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="estacionamientos" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
          </div>
        </div>

        <div class="pt-8 flex justify-end gap-4 border-t border-slate-100">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-xl disabled:bg-slate-400 shadow-xl shadow-slate-900/10 hover:bg-indigo-600 transition-all flex items-center gap-2">
            {#if loading}
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Publicando...
            {:else}
               {isOculta ? 'Guardar en Pre-Mercado' : 'Publicar Propiedad'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
