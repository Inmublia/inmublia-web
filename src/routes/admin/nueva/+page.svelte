<script>
  import { enhance } from '$app/forms';
  import imageCompression from 'browser-image-compression';

  let { form, data } = $props();
  // El backend inyecta los créditos restantes
  let creditosIA = $state(data.creditos_ia ?? 0);
  
  let loading = $state(false);
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(false);

  // ESTADOS DE LA INTELIGENCIA ARTIFICIAL
  let generandoIA = $state(false);
  let tonoIA = $state('lujo');
  let tabActiva = $state('ficha'); // 'ficha' | 'whatsapp' | 'tiktok'
  
  let textoGeneradoFicha = $state({ titulo: '', descripcion: '' });
  let textoGeneradoWhatsapp = $state('');
  let textoGeneradoTiktok = $state('');

  let inputTitulo = $state(null);
  let inputDescripcion = $state(null);
  let inputPrecio = $state(null);
  let inputUbicacion = $state(null);
  let selectTipo = $state(null);
  let selectOperacion = $state(null);
  let inputRecamaras = $state(null);

  function handleImageChange(event) {
    const file = event.target.files[0];
    imagePreview = file ? URL.createObjectURL(file) : null;
  }

  function handleGaleriaChange(event) {
    const files = event.target.files;
    galeriaPreviews = Array.from(files).map(file => URL.createObjectURL(file));
  }

  async function typeWriterEffect(targetObject, key, text, speed = 10) {
    targetObject[key] = '';
    for (let i = 0; i < text.length; i++) {
      targetObject[key] += text.charAt(i);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  async function generarCampañaIA() {
    if (!inputUbicacion.value || !inputPrecio.value || !selectTipo.value) {
      alert("Por favor, llena al menos: Tipo, Precio y Ubicación en la Sección 1 para que la IA tenga contexto.");
      return;
    }

    if (creditosIA <= 0) {
      alert("No tienes créditos de IA disponibles. Sube al plan Pro para obtener 100 créditos mensuales.");
      return;
    }

    generandoIA = true;
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
        creditosIA--;
        Promise.all([
          typeWriterEffect(textoGeneradoFicha, 'titulo', result.data.titulo, 15),
          typeWriterEffect(textoGeneradoFicha, 'descripcion', result.data.descripcion, 5),
          (async () => { textoGeneradoWhatsapp = result.data.whatsapp; })(), 
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
    alert("¡Textos aplicados exitosamente a la propiedad!");
  }

  function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto);
    alert("¡Copiado al portapapeles!");
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-slate-900 transition-colors mr-4 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg" aria-label="Volver al inicio">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900">Crear Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-8 flex justify-center">
    <div class="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
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
      }} class="space-y-12">
        
        <section class="space-y-8">
          <div class="border-b border-slate-200 pb-4">
            <h2 class="text-xl font-black text-slate-900">1. Datos Generales y Multimedia</h2>
            <p class="text-sm text-slate-500 mt-1">Proporciona la información base y el material visual del inmueble.</p>
          </div>

          <div class="flex items-start gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="is_oculta" name="is_oculta" bind:checked={isOculta} class="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer">
            </div>
            <div class="flex-1">
              <label for="is_oculta" class="text-sm font-bold text-slate-900 cursor-pointer">Mantener propiedad oculta (Modo Pre-Mercado)</label>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Al activar esta casilla, la propiedad no se mostrará en tu catálogo web principal. Solo será accesible si compartes el enlace directo. Esto es ideal para campañas de expectativa, ventas privadas o eventos de Open House antes de su lanzamiento oficial.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div>
              <label for="operacion" class="block text-sm font-bold text-slate-700 mb-2">Operación</label>
              <select bind:this={selectOperacion} id="operacion" name="operacion" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label for="tipo" class="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
              <select bind:this={selectTipo} id="tipo" name="tipo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-sm font-bold text-slate-700 mb-2">Precio de Mercado (MXN)</label>
              <input bind:this={inputPrecio} id="precio" type="number" name="precio" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-900 outline-none font-black text-slate-900 text-lg">
            </div>

            <div class="sm:col-span-2">
              <label for="ubicacion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación Estratégica (Colonia, Ciudad)</label>
              <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none">
            </div>

            <div class="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div><label for="recamaras" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
              <div><label for="banos" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Baños</label><input id="banos" type="number" name="banos" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
              <div><label for="m2_terreno" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
              <div><label for="m2_construccion" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
              <div><label for="medio_bano" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
              <div><label for="estacionamientos" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none"></div>
            </div>

            <div class="sm:col-span-2 pt-4">
              <label for="imagen_principal" class="block text-sm font-bold text-slate-700 mb-2">Fotografía Principal (Hero)</label>
              <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-colors relative overflow-hidden group h-48 bg-white cursor-pointer">
                {#if imagePreview}
                  <img src={imagePreview} alt="Vista previa de portada" class="absolute inset-0 w-full h-full object-cover z-10" />
                {/if}
                <div class="relative z-20 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-xl text-center shadow-sm border border-slate-200">
                  <span class="text-slate-900 font-bold">Subir portada (1 foto)</span>
                  <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onchange={handleImageChange}>
                </div>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="galeria_input" class="block text-sm font-bold text-slate-700 mb-2">Galería Secundaria (Mosaico)</label>
              <div class="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-colors relative bg-white cursor-pointer">
                <div class="text-center z-10 relative bg-white/90 px-6 py-3 rounded-xl shadow-sm border border-slate-200">
                  <span class="text-slate-900 font-bold">Seleccionar de 1 a 15 fotos adicionales</span>
                  <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleGaleriaChange}>
                </div>
                {#if galeriaPreviews.length > 0}
                  <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 w-full">
                    {#each galeriaPreviews as preview, index}
                      <div class="aspect-square rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200"><img src={preview} alt="Miniatura de la galería {index + 1}" class="w-full h-full object-cover"/></div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="video_url" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace de Video Recorrido (YouTube / Vimeo)</label>
              <input id="video_url" type="url" name="video_url" placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900">
            </div>

            <div class="sm:col-span-2">
              <label for="recorrido_3d_url" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace Recorrido 3D (Matterport)</label>
              <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-slate-900 outline-none text-slate-900">
            </div>
          </div>
        </section>

        <section class="space-y-8 pt-8 border-t border-slate-200">
          <div class="border-b border-slate-200 pb-4">
            <h2 class="text-xl font-black text-slate-900">2. Textos y Campaña de Marketing</h2>
            <p class="text-sm text-slate-500 mt-1">Genera el material persuasivo con IA o redacta manualmente la ficha de la propiedad.</p>
          </div>

          <div class="bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <h4 class="text-lg font-black text-slate-900 flex items-center gap-2">
                  <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Asistente de Redacción Inteligente
                </h4>
                <p class="text-slate-500 text-sm mt-1">Optimiza tu tiempo delegando la redacción editorial y la estructura para redes sociales.</p>
              </div>
              
              <div class="flex flex-col items-end gap-2 w-full md:w-auto">
                <div class="flex gap-2 w-full">
                  <select bind:value={tonoIA} class="bg-white border border-slate-300 text-slate-800 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900 shadow-sm cursor-pointer">
                    <option value="lujo">Tono Premium / Lujo</option>
                    <option value="familiar">Tono Familiar / Cálido</option>
                    <option value="inversionista">Tono Inversionista / ROI</option>
                  </select>
                  <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                    {#if generandoIA}
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generando...
                    {:else}
                      Generar Textos
                    {/if}
                  </button>
                </div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Créditos disponibles: {creditosIA}</p>
              </div>
            </div>

            {#if textoGeneradoFicha.titulo || textoGeneradoWhatsapp || generandoIA}
              <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-[fadeIn_0.3s_ease-out]">
                <div class="flex border-b border-slate-200 bg-slate-50 px-2 pt-2 gap-2 overflow-x-auto">
                  <button type="button" onclick={() => tabActiva = 'ficha'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap {tabActiva === 'ficha' ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}">
                    Ficha Editorial
                  </button>
                  <button type="button" onclick={() => tabActiva = 'whatsapp'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap {tabActiva === 'whatsapp' ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}">
                    Campaña WhatsApp
                  </button>
                  <button type="button" onclick={() => tabActiva = 'tiktok'} class="px-5 py-3 text-sm font-bold rounded-t-xl transition-colors whitespace-nowrap {tabActiva === 'tiktok' ? 'bg-white text-slate-900 border-t border-x border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative top-[1px]' : 'text-slate-500 hover:text-slate-700 hover:bg-white'}">
                    Guion TikTok / Reels
                  </button>
                </div>

                <div class="p-6">
                  <div class="{tabActiva === 'ficha' ? 'block' : 'hidden'}">
                    <div class="mb-4">
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Título Propuesto</label>
                      <p class="text-lg font-black text-slate-900">{textoGeneradoFicha.titulo || 'Redactando...'}</p>
                    </div>
                    <div class="mb-6">
                      <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción Propuesta</label>
                      <div class="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed min-h-[100px]">
                        {textoGeneradoFicha.descripcion || 'Redactando...'}
                      </div>
                    </div>
                    <button type="button" onclick={aplicarAlFormulario} class="w-full bg-slate-100 text-slate-800 font-bold py-3 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200 text-sm">
                      Usar estos textos en la publicación oficial
                    </button>
                  </div>

                  <div class="{tabActiva === 'whatsapp' ? 'block' : 'hidden'}">
                    <div class="flex justify-between items-center mb-4">
                      <div>
                        <h4 class="font-bold text-slate-900">Mensaje de Difusión</h4>
                        <p class="text-xs text-slate-500">Formato optimizado para envíos rápidos a prospectos.</p>
                      </div>
                      <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        Copiar Mensaje
                      </button>
                    </div>
                    <div class="p-5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-800 whitespace-pre-line">
                      {textoGeneradoWhatsapp || 'Redactando...'}
                    </div>
                  </div>

                  <div class="{tabActiva === 'tiktok' ? 'block' : 'hidden'}">
                    <div class="flex justify-between items-center mb-4">
                      <div>
                        <h4 class="font-bold text-slate-900">Estructura para Video</h4>
                        <p class="text-xs text-slate-500">Guion segmentado por ganchos visuales y narrativos.</p>
                      </div>
                      <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        Copiar Guion
                      </button>
                    </div>
                    <div class="p-6 bg-slate-900 rounded-lg text-sm text-slate-300 whitespace-pre-line border border-slate-800">
                      {textoGeneradoTiktok || 'Redactando...'}
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div class="pt-4 mt-6">
            <div class="mb-5">
              <label for="titulo" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Publicación (Obligatorio)</label>
              <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" required class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-slate-900 text-sm font-bold shadow-sm outline-none text-slate-900">
            </div>
            <div class="mb-5">
              <label for="descripcion" class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción (Obligatorio)</label>
              <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="6" class="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed"></textarea>
            </div>
            <div class="flex items-center mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input type="checkbox" id="destacada" name="destacada" class="w-5 h-5 text-slate-900 rounded cursor-pointer border border-slate-300 bg-white focus:ring-slate-900">
              <div class="ml-3">
                <label for="destacada" class="text-sm font-bold text-slate-900 cursor-pointer">Marcar como Propiedad Signature (VIP)</label>
                <p class="text-xs text-slate-500 mt-0.5">Destaca visualmente este inmueble en tu catálogo público como una exclusiva.</p>
              </div>
            </div>
          </div>
        </section>

        <div class="pt-8 flex justify-end gap-4 border-t border-slate-200">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3.5 px-8 rounded-xl transition-colors shadow-sm">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-3.5 px-10 rounded-xl disabled:bg-slate-400 shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-2">
            {#if loading}
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Publicando...
            {:else}
               {isOculta ? 'Guardar Propiedad Oculta' : 'Publicar Propiedad'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
