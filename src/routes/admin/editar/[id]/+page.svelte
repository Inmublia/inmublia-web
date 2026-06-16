<script>
  import { enhance } from '$app/forms';
  import imageCompression from 'browser-image-compression';
  import { 
    ArrowLeft, 
    UploadCloud, 
    Images, 
    Sparkles, 
    Loader2, 
    Check, 
    Copy, 
    EyeOff, 
    Building2, 
    MapPin, 
    MessageCircle, 
    Video,
    BadgeDollarSign,
    RefreshCw
  } from 'lucide-svelte';

  let { form, data } = $props();
  let propiedad = $derived(data.propiedad || {}); 
  let creditosIA = $state(data.creditos_ia ?? 0);
  
  let loading = $state(false);
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(propiedad.estatus === 'Pre-Mercado');

  // --- ESTADOS DE LA IA ---
  let generandoIA = $state(false);
  let iaEjecutada = $state(false);
  let tonoIA = $state('lujo');
  
  let textoGeneradoFicha = $state({ titulo: '', descripcion: '' });
  let textoGeneradoWhatsapp = $state('');
  let textoGeneradoTiktok = $state('');

  // Referencias DOM
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

  async function typeWriterEffect(targetObject, key, text, speed = 8) {
    targetObject[key] = '';
    for (let i = 0; i < text.length; i++) {
      targetObject[key] += text.charAt(i);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  async function generarCampañaIA() {
    if (!inputUbicacion.value || !inputPrecio.value || !selectTipo.value) {
      alert("Faltan datos clave (Ubicación, Precio o Tipo) para generar la campaña.");
      return;
    }

    if (creditosIA <= 0) {
      alert("No tienes créditos de IA disponibles.");
      return;
    }

    generandoIA = true;
    iaEjecutada = true;
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
        generandoIA = false;
        
        Promise.all([
          typeWriterEffect(textoGeneradoFicha, 'titulo', result.data.titulo, 15),
          typeWriterEffect(textoGeneradoFicha, 'descripcion', result.data.descripcion, 3),
          typeWriterEffect({ wrapper: this }, 'whatsapp', result.data.whatsapp, 5).then(() => textoGeneradoWhatsapp = result.data.whatsapp), 
          typeWriterEffect({ wrapper: this }, 'tiktok', result.data.tiktok, 5).then(() => textoGeneradoTiktok = result.data.tiktok)
        ]);
      } else {
        generandoIA = false;
        alert(result.data?.error || "Error al conectar con la IA.");
      }
    } catch (e) {
      console.error(e);
      generandoIA = false;
      alert("Error de red al invocar a la IA.");
    }
  }

  function aplicarAlFormulario() {
    if (inputTitulo && textoGeneradoFicha.titulo) inputTitulo.value = textoGeneradoFicha.titulo;
    if (inputDescripcion && textoGeneradoFicha.descripcion) inputDescripcion.value = textoGeneradoFicha.descripcion;
    document.getElementById('seccion-oficial').scrollIntoView({ behavior: 'smooth' });
  }

  function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto);
    alert("Copiado al portapapeles");
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-3">
      <a href="/admin" class="text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100" aria-label="Volver">
        <ArrowLeft class="w-5 h-5" />
      </a>
      <h1 class="text-lg font-bold text-slate-900 tracking-tight">Editando: <span class="text-slate-400 font-medium ml-1">{propiedad.titulo}</span></h1>
    </div>
  </header>

  <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 w-full">
    {#if propiedad.id}
      <div class="w-full max-w-[900px] mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10">
        
        {#if form?.error}
          <div class="mb-8 bg-red-50 text-red-600 font-semibold p-4 rounded-xl text-sm border border-red-100 animate-[fadeIn_0.3s_ease-out]">{form.error}</div>
        {/if}

        <form method="POST" action="?/actualizar" enctype="multipart/form-data" use:enhance={async ({ formData }) => { 
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
          
          <section class="space-y-6">
            <div class="border-b border-slate-100 pb-3">
              <h2 class="text-xl font-bold text-slate-900 tracking-tight">1. Estructura y Multimedia</h2>
            </div>

            <div class="p-5 bg-slate-50/50 rounded-xl border border-slate-200 flex items-start gap-4">
              <div class="flex items-center h-5 mt-0.5">
                <input type="checkbox" id="is_oculta" name="is_oculta" bind:checked={isOculta} class="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer">
              </div>
              <div class="flex-1">
                <label for="is_oculta" class="text-sm font-semibold text-slate-900 cursor-pointer flex items-center gap-1.5">
                  <EyeOff class="w-4 h-4 text-slate-500" />
                  Mantener en Pre-Mercado (Oculta)
                </label>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                  La propiedad no será visible en el catálogo público. Solo accesible vía enlace directo.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div>
                <label for="operacion" class="block text-xs font-semibold text-slate-500 mb-1.5">Operación</label>
                <div class="relative w-full">
                  <select bind:this={selectOperacion} id="operacion" name="operacion" value={propiedad.operacion} class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                    <option value="Venta">Venta</option>
                    <option value="Renta">Renta</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="tipo" class="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de Inmueble</label>
                <div class="relative w-full">
                  <select bind:this={selectTipo} id="tipo" name="tipo" value={propiedad.tipo} class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                    <option value="Casa">Casa</option>
                    <option value="Departamento">Departamento</option>
                    <option value="Terreno">Terreno</option>
                  </select>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label for="precio" class="block text-xs font-semibold text-slate-500 mb-1.5">Precio de Mercado (MXN)</label>
                <div class="relative">
                  <BadgeDollarSign class="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input bind:this={inputPrecio} id="precio" type="number" name="precio" value={propiedad.precio || ''} required class="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-sm" placeholder="Ej. 5500000">
                </div>
              </div>

              <div class="sm:col-span-2">
                <label for="comision" class="block text-xs font-semibold text-slate-500 mb-1.5">Comisión Pactada (%) <span class="font-normal text-[10px] text-slate-400">(Opcional)</span></label>
                <div class="relative">
                  <input id="comision" type="number" step="0.1" max="100" min="0" name="comision" value={propiedad.comision || ''} class="w-full bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-sm" placeholder="Ej. 6.5">
                  <span class="absolute right-4 top-2.5 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label for="ubicacion" class="block text-xs font-semibold text-slate-500 mb-1.5">Ubicación Estratégica (Colonia, Ciudad)</label>
                <div class="relative">
                  <MapPin class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" value={propiedad.ubicacion || ''} placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm">
                </div>
              </div>

              <div class="col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-4">
                <div><label for="recamaras" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" value={propiedad.recamaras || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="banos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Baños</label><input id="banos" type="number" name="banos" value={propiedad.banos || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="medio_bano" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" value={propiedad.medio_bano || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="estacionamientos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" value={propiedad.estacionamientos || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="m2_terreno" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" value={propiedad.m2_terreno || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="m2_construccion" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" value={propiedad.m2_construccion || ''} class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              </div>

              <div class="sm:col-span-2 pt-2">
                <label for="imagen_principal" class="block text-xs font-semibold text-slate-500 mb-1.5">Fotografía Principal Actual</label>
                <div class="flex justify-center border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-500 transition-colors relative overflow-hidden group h-48 bg-slate-50 cursor-pointer">
                  <img src={imagePreview || propiedad.imagen_url} alt="Portada de la propiedad" class="absolute inset-0 w-full h-full object-cover z-10" />
                  <div class="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <RefreshCw class="w-6 h-6 text-white mb-2" />
                    <span class="text-white font-bold text-sm tracking-widest uppercase cursor-pointer">Cambiar Portada</span>
                  </div>
                  <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleImageChange}>
                </div>
              </div>

              <div class="sm:col-span-2">
                <label for="galeria_input" class="block text-xs font-semibold text-slate-500 mb-1.5">Galería Secundaria Actual</label>
                <div class="flex flex-col items-center justify-center border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-500 transition-colors relative h-48 bg-slate-50 overflow-hidden group cursor-pointer">
                  
                  {#if galeriaPreviews.length > 0}
                    <div class="absolute inset-0 grid grid-cols-2 sm:grid-cols-4 gap-1 z-10 p-1">
                      {#each galeriaPreviews.slice(0, 8) as preview, index}
                        <img src={preview} alt="Vista previa {index + 1}" class="w-full h-full object-cover rounded-md"/>
                      {/each}
                    </div>
                  {:else if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
                    <div class="absolute inset-0 grid grid-cols-2 sm:grid-cols-4 gap-1 z-10 p-1">
                      {#each propiedad.galeria_urls.slice(0, 8) as url, index}
                        <img src={url} alt="Foto {index + 1}" class="w-full h-full object-cover rounded-md"/>
                      {/each}
                    </div>
                  {:else}
                    <div class="text-center z-10 relative flex flex-col items-center">
                      <Images class="h-8 w-8 text-slate-400 mb-2" />
                      <span class="text-sm font-medium text-slate-500">Sin fotos secundarias</span>
                    </div>
                  {/if}

                  <div class="absolute inset-0 bg-black/60 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-sm">
                    <RefreshCw class="w-6 h-6 text-white mb-2" />
                    <span class="text-white font-bold text-sm tracking-widest uppercase cursor-pointer">Reemplazar Galería</span>
                    <span class="text-white/70 text-[10px] mt-1">Sube hasta 15 fotos nuevas</span>
                  </div>
                  <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleGaleriaChange}>
                </div>
              </div>

              <div class="sm:col-span-2 pt-2">
                <label for="video_url" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Video Recorrido (YouTube / Vimeo)</label>
                <input id="video_url" type="url" name="video_url" value={propiedad.video_url || ''} placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm placeholder:text-slate-300">
              </div>

              <div class="sm:col-span-2">
                <label for="recorrido_3d_url" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recorrido 3D (Matterport)</label>
                <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" value={propiedad.recorrido_3d_url || ''} placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm placeholder:text-slate-300">
              </div>
            </div>
          </section>

          <section class="relative mt-16">
            <div class="bg-slate-800 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-xl border border-slate-700 animate-[fadeIn_0.3s_ease-out]">
              
              <div class="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none z-0"></div>

              <div class="relative z-10 flex flex-col items-center gap-10">
                
                <div class="text-center flex flex-col items-center">
                  <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5 justify-center">
                    Estudio Creativo IA
                    <span class="flex h-2.5 w-2.5 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </h2>
                  <p class="text-sm text-slate-400 mt-2.5 leading-relaxed max-w-xl mx-auto font-medium">
                    Actualiza o mejora la campaña de esta propiedad basándote en los datos actuales.
                  </p>
                </div>

                <div class="bg-slate-700 border border-slate-600/50 backdrop-blur-md rounded-2xl p-2.5 flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto shadow-inner ring-1 ring-slate-600">
                  
                  <div class="flex items-center gap-2.5 pl-3 w-full sm:w-auto justify-between sm:justify-start">
                    <label for="tono-ia" class="text-xs font-bold text-slate-300 uppercase tracking-wide">Tono:</label>
                    <select id="tono-ia" bind:value={tonoIA} class="bg-transparent text-white text-sm font-bold outline-none cursor-pointer pr-8 py-1 focus:ring-0 appearance-none relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2216%22%20height%3D%2216%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M4%206l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1em_1em]">
                      <option value="lujo" class="bg-slate-700">Premium / Elegante</option>
                      <option value="familiar" class="bg-slate-700">Familiar / Cálido</option>
                      <option value="inversionista" class="bg-slate-700">Analítico / ROI</option>
                    </select>
                  </div>

                  <div class="w-full h-px sm:w-px sm:h-6 bg-slate-600 hidden sm:block"></div>

                  <div class="flex items-center gap-2 px-4 py-1.5 bg-slate-800 border border-slate-600/50 rounded-full text-xs font-extrabold text-slate-100 w-full sm:w-auto justify-center shadow-inner">
                    <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                    {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                  </div>

                  <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="w-full sm:w-auto bg-white text-slate-900 font-extrabold px-6 py-2.5 rounded-lg transition-colors hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm transform active:scale-95">
                    {#if generandoIA}
                      <Loader2 class="animate-spin w-4 h-4 text-slate-900" />
                      Procesando...
                    {:else}
                      <Sparkles class="w-4 h-4 text-slate-900" />
                      Generar Textos
                    {/if}
                  </button>
                </div>
              </div>

              {#if iaEjecutada}
                <div class="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5 animate-[fadeIn_0.5s_ease-out] z-10 relative">
                  
                  <div class="lg:col-span-2 bg-slate-700 border border-slate-600 rounded-2xl p-6 flex flex-col shadow-inner">
                    <div class="flex items-center justify-between mb-5">
                      <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Building2 class="w-4 h-4 text-indigo-400" />
                        Ficha Editorial Nueva
                      </h4>
                      {#if !generandoIA && textoGeneradoFicha.titulo}
                        <button type="button" onclick={aplicarAlFormulario} class="text-[10px] font-bold uppercase tracking-wider bg-slate-800 border border-slate-600/50 text-slate-300 hover:bg-slate-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                          <Check class="w-3.5 h-3.5" /> Reemplazar Textos
                        </button>
                      {/if}
                    </div>
                    
                    <div class="flex-1 space-y-5">
                      <div>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Título</p>
                        {#if generandoIA && !textoGeneradoFicha.titulo}
                          <div class="h-6 bg-slate-600/50 rounded-lg animate-pulse w-3/4"></div>
                        {:else}
                          <p class="text-lg font-bold text-white leading-tight">{textoGeneradoFicha.titulo}</p>
                        {/if}
                      </div>
                      <div>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Descripción</p>
                        {#if generandoIA && !textoGeneradoFicha.descripcion}
                          <div class="space-y-2">
                            <div class="h-3.5 bg-slate-600/50 rounded w-full animate-pulse"></div>
                            <div class="h-3.5 bg-slate-600/50 rounded w-full animate-pulse"></div>
                            <div class="h-3.5 bg-slate-600/50 rounded w-4/5 animate-pulse"></div>
                          </div>
                        {:else}
                          <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium">{textoGeneradoFicha.descripcion}</p>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-5">
                    <div class="bg-slate-700 border border-slate-600 rounded-2xl p-6 flex-1 flex flex-col shadow-inner">
                      <div class="flex items-center justify-between mb-4">
                        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                          <MessageCircle class="w-4 h-4 text-emerald-400" />
                          WhatsApp
                        </h4>
                        {#if !generandoIA && textoGeneradoWhatsapp}
                          <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-slate-400 hover:text-white transition-colors" title="Copiar">
                            <Copy class="w-4 h-4" />
                          </button>
                        {/if}
                      </div>
                      <div class="text-[13px] text-slate-300 whitespace-pre-line leading-relaxed flex-1 font-medium">
                        {#if generandoIA && !textoGeneradoWhatsapp}
                           <div class="space-y-2 mt-1"><div class="h-3 bg-slate-600/50 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-600/50 rounded w-3/4 animate-pulse"></div></div>
                        {:else}
                          {textoGeneradoWhatsapp}
                        {/if}
                      </div>
                    </div>

                    <div class="bg-slate-700 border border-slate-600 rounded-2xl p-6 flex-1 flex flex-col shadow-inner">
                      <div class="flex items-center justify-between mb-4">
                        <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Video class="w-4 h-4 text-rose-400" />
                          Video
                        </h4>
                        {#if !generandoIA && textoGeneradoTiktok}
                          <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="text-slate-400 hover:text-white transition-colors" title="Copiar">
                            <Copy class="w-4 h-4" />
                          </button>
                        {/if}
                      </div>
                      <div class="text-[13px] text-slate-300 whitespace-pre-line leading-relaxed flex-1 font-medium">
                        {#if generandoIA && !textoGeneradoTiktok}
                           <div class="space-y-2 mt-1"><div class="h-3 bg-slate-600/50 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-600/50 rounded w-3/4 animate-pulse"></div></div>
                        {:else}
                          {textoGeneradoTiktok}
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </section>

          <section id="seccion-oficial" class="space-y-6 pt-10 border-t border-slate-100">
            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 class="text-xl font-bold text-slate-900 tracking-tight">3. Publicación Oficial</h2>
            </div>

            <div>
              <label for="titulo" class="block text-xs font-semibold text-slate-500 mb-1.5">Título de la Publicación (Obligatorio)</label>
              <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" value={propiedad.titulo} required class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 text-sm font-bold shadow-sm outline-none text-slate-900">
            </div>

            <div>
              <label for="descripcion" class="block text-xs font-semibold text-slate-500 mb-1.5">Descripción Editorial (Obligatorio)</label>
              <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="6" class="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed resize-y">{propiedad.descripcion}</textarea>
            </div>

            <div class="flex items-start mt-4 p-5 bg-slate-50/50 rounded-xl border border-slate-200 shadow-inner">
              <div class="flex items-center h-5 mt-0.5">
                <input type="checkbox" id="destacada" name="destacada" checked={propiedad.destacada} class="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900 rounded cursor-pointer">
              </div>
              <div class="ml-3 flex-1">
                <label for="destacada" class="text-sm font-semibold text-slate-900 cursor-pointer">VIP / Signature (Propiedad Destacada)</label>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Resalta este inmueble en tu catálogo público como una exclusiva.</p>
              </div>
            </div>
          </section>

          <div class="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
            <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm text-center">Cancelar Cambios</a>
            <button type="submit" disabled={loading} class="bg-slate-900 text-white font-extrabold py-2.5 px-8 rounded-lg disabled:opacity-50 shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-95">
              {#if loading}
                <Loader2 class="animate-spin w-4 h-4 text-white" />
                 Guardando...
              {:else}
                 <Check class="w-4 h-4" />
                 {isOculta ? 'Actualizar Pre-Mercado' : 'Actualizar Publicación'}
              {/if}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
