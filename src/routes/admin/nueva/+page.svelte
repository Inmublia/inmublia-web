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
    LayoutTemplate
  } from 'lucide-svelte';

  let { form, data } = $props();
  let creditosIA = $state(data.creditos_ia ?? 0);
  let planSuscripcion = $derived(data.plan_suscripcion); // Plan del broker
  
  let loading = $state(false);
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(false);
  let selectedTemplate = $state('classic'); // Estado de la plantilla

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

  const catalogoTemplates = [
    { id: 'classic', nombre: 'Classic', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', minPlan: 'pro' },
    { id: 'conversion', nombre: 'Conversion Focus', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', minPlan: 'elite' },
    { id: 'prestige', nombre: 'Prestige Dark', minPlan: 'elite' },
    { id: 'panoramic', nombre: 'Panoramic 3D', minPlan: 'elite' }
  ];

  function puedeUsarTemplate(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }

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
      alert("Por favor, llena al menos: Tipo, Precio y Ubicación en la Sección 1.");
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
          typeWriterEffect(textoGeneradoFicha, 'titulo', result.data.titulo, 20),
          typeWriterEffect(textoGeneradoFicha, 'descripcion', result.data.descripcion, 5),
          typeWriterEffect({ wrapper: this }, 'whatsapp', result.data.whatsapp, 10).then(() => textoGeneradoWhatsapp = result.data.whatsapp), 
          typeWriterEffect({ wrapper: this }, 'tiktok', result.data.tiktok, 8).then(() => textoGeneradoTiktok = result.data.tiktok)
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
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
    <div class="flex items-center gap-3">
      <a href="/admin" class="text-slate-500 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100" aria-label="Volver al inicio">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-lg font-bold text-slate-900 tracking-tight">Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 w-full">
    <div class="w-full max-w-[900px] mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-semibold p-4 rounded-xl text-sm border border-red-100 animate-[fadeIn_0.3s_ease-out]">{form.error}</div>
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
        
        <section class="space-y-6">
          <div class="border-b border-slate-100 pb-3">
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">1. Estructura y Multimedia</h2>
          </div>

          <div class="p-5 bg-slate-50/50 rounded-xl border border-slate-200 flex items-start gap-4">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="is_oculta" name="is_oculta" bind:checked={isOculta} class="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer">
            </div>
            <div class="flex-1">
              <label for="is_oculta" class="text-sm font-semibold text-slate-900 cursor-pointer">Mantener en Pre-Mercado (Oculta)</label>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">
                La propiedad no será visible en el catálogo público. Solo accesible vía enlace directo.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div>
              <label for="operacion" class="block text-xs font-semibold text-slate-500 mb-1.5">Operación</label>
              <div class="relative w-full">
                <select bind:this={selectOperacion} id="operacion" name="operacion" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                  <option value="Venta">Venta</option>
                  <option value="Renta">Renta</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div>
              <label for="tipo" class="block text-xs font-semibold text-slate-500 mb-1.5">Tipo de Inmueble</label>
              <div class="relative w-full">
                <select bind:this={selectTipo} id="tipo" name="tipo" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-xs font-semibold text-slate-500 mb-1.5">Precio de Mercado (MXN)</label>
              <div class="relative">
                <BadgeDollarSign class="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input bind:this={inputPrecio} id="precio" type="number" name="precio" required class="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-sm" placeholder="Ej. 5500000">
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="ubicacion" class="block text-xs font-semibold text-slate-500 mb-1.5">Ubicación Estratégica (Colonia, Ciudad)</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm">
              </div>
            </div>

            <div class="col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-4">
              <div><label for="recamaras" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              <div><label for="banos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Baños</label><input id="banos" type="number" name="banos" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              <div><label for="medio_bano" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              <div><label for="estacionamientos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              <div><label for="m2_terreno" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
              <div><label for="m2_construccion" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="imagen_principal" class="block text-xs font-semibold text-slate-500 mb-1.5">Fotografía Principal (Hero)</label>
              <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-slate-400 bg-slate-50 transition-colors relative overflow-hidden group h-48 cursor-pointer shadow-inner">
                {#if imagePreview}
                  <img src={imagePreview} alt="Vista previa" class="absolute inset-0 w-full h-full object-cover z-10" />
                  <div class="absolute inset-0 bg-black/10 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {/if}
                <div class="relative z-20 flex flex-col items-center justify-center {imagePreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity">
                  <div class="bg-white p-3 rounded-full shadow-sm border border-slate-200 mb-2 text-slate-600">
                    <UploadCloud class="w-5 h-5" />
                  </div>
                  <span class="text-slate-700 font-semibold bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs shadow-sm border border-slate-200">Subir Portada</span>
                </div>
                <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" required onchange={handleImageChange}>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="galeria_input" class="block text-xs font-semibold text-slate-500 mb-1.5">Galería Secundaria (1 a 15 fotos)</label>
              <div class="flex flex-col items-center justify-center p-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-slate-400 bg-slate-50 transition-colors relative cursor-pointer min-h-[120px] shadow-inner">
                <div class="text-center z-10 relative flex flex-col items-center">
                  <Images class="w-5 h-5 text-slate-400 mb-2" />
                  <span class="text-slate-700 font-semibold bg-white px-4 py-2 rounded-md shadow-sm border border-slate-200 text-xs hover:bg-slate-50 transition-colors">Seleccionar Fotos Adicionales</span>
                </div>
                <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleGaleriaChange}>
                
                {#if galeriaPreviews.length > 0}
                  <div class="mt-6 grid grid-cols-4 sm:grid-cols-6 gap-2 w-full relative z-20 pointer-events-none">
                    {#each galeriaPreviews as preview, index}
                      <div class="aspect-square rounded-md overflow-hidden bg-slate-200 shadow-sm"><img src={preview} alt="Miniatura {index + 1}" class="w-full h-full object-cover"/></div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="video_url" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Video Recorrido (YouTube / Vimeo)</label>
              <input id="video_url" type="url" name="video_url" placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm">
            </div>

            <div class="sm:col-span-2">
              <label for="recorrido_3d_url" class="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Recorrido 3D (Matterport)</label>
              <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm">
            </div>
          </div>
        </section>

        <section class="relative">
          <div class="bg-slate-800 rounded-[2rem] p-6 sm:p-10 relative overflow-hidden shadow-lg border border-slate-700">
            
            <div class="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div class="relative z-10">
              
              <div class="flex flex-col items-center w-full mb-8">
                <h2 class="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2.5">
                  Estudio Creativo IA Inmublia
                  <span class="flex h-2.5 w-2.5 relative mt-0.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </h2>
                <p class="text-sm text-slate-400 mt-4 leading-relaxed max-w-2xl text-justify font-medium">
                  Autogenera la descripción comercial, mensajes estructurados para WhatsApp y guiones para redes sociales basándote en los datos de la Sección 1.
                </p>
              </div>

              <div class="flex flex-col sm:flex-row items-end justify-center gap-4 sm:gap-6 w-full max-w-3xl mx-auto bg-slate-700/40 border border-slate-600/50 backdrop-blur-md rounded-2xl p-4 shadow-inner">
                
                <div class="flex flex-col items-center gap-2 w-full sm:w-1/3">
                  <label for="tono-ia" class="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center w-full">Tono de Redacción</label>
                  <div class="relative w-full">
                    <select id="tono-ia" bind:value={tonoIA} class="w-full bg-slate-800 text-white border border-slate-600 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer appearance-none pr-10">
                      <option value="lujo">Premium / Elegante</option>
                      <option value="familiar">Familiar / Cálido</option>
                      <option value="inversionista">Analítico / ROI</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-center w-full sm:w-1/3 pb-1">
                  <div class="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-600/80 rounded-full text-xs font-bold text-slate-200 shadow-inner">
                    <Sparkles class="w-4 h-4 text-amber-400" />
                    {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                  </div>
                </div>

                <div class="w-full sm:w-1/3 flex flex-col items-center">
                  <div class="h-[18px] mb-2 hidden sm:block"></div> 
                  <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="w-full relative overflow-hidden group bg-white text-slate-900 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95">
                    {#if generandoIA}
                      <Loader2 class="animate-spin w-4 h-4 text-slate-900" />
                      Procesando...
                    {:else}
                      <Sparkles class="w-4 h-4 text-slate-900" />
                      Generar Contenido
                    {/if}
                  </button>
                </div>
              </div>

            </div>

            {#if iaEjecutada}
              <div class="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5 animate-[fadeIn_0.4s_ease-out] relative z-10">
                
                <div class="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex flex-col">
                  <div class="flex items-center justify-between mb-5">
                    <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-2">
                      <Building2 class="w-4 h-4 text-indigo-400" />
                      Ficha Editorial
                    </h4>
                    {#if !generandoIA && textoGeneradoFicha.titulo}
                      <button type="button" onclick={aplicarAlFormulario} class="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600/50">
                        <Check class="w-3.5 h-3.5" />
                        Usar en Publicación
                      </button>
                    {/if}
                  </div>
                  
                  <div class="flex-1 space-y-5">
                    <div>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Título</p>
                      {#if generandoIA && !textoGeneradoFicha.titulo}
                        <div class="h-6 bg-slate-700/50 rounded animate-pulse w-3/4"></div>
                      {:else}
                        <p class="text-base font-bold text-white leading-tight">{textoGeneradoFicha.titulo}</p>
                      {/if}
                    </div>
                    <div>
                      <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">Descripción</p>
                      {#if generandoIA && !textoGeneradoFicha.descripcion}
                        <div class="space-y-2">
                          <div class="h-3.5 bg-slate-700/50 rounded w-full animate-pulse"></div>
                          <div class="h-3.5 bg-slate-700/50 rounded w-full animate-pulse"></div>
                          <div class="h-3.5 bg-slate-700/50 rounded w-4/5 animate-pulse"></div>
                        </div>
                      {:else}
                        <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{textoGeneradoFicha.descripcion}</p>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-5">
                  <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex-1 flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle class="w-4 h-4 text-emerald-400" />
                        WhatsApp
                      </h4>
                      {#if !generandoIA && textoGeneradoWhatsapp}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-slate-400 hover:text-white transition-colors" title="Copiar">
                          <Copy class="w-4 h-4" />
                        </button>
                      {/if}
                    </div>
                    <div class="text-sm text-slate-300 whitespace-pre-line leading-relaxed flex-1">
                      {#if generandoIA && !textoGeneradoWhatsapp}
                         <div class="space-y-1.5 mt-1"><div class="h-3 bg-slate-700/50 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700/50 rounded w-3/4 animate-pulse"></div></div>
                      {:else}
                        {textoGeneradoWhatsapp}
                      {/if}
                    </div>
                  </div>

                  <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex-1 flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Video class="w-4 h-4 text-rose-400" />
                        Guion Video
                      </h4>
                      {#if !generandoIA && textoGeneradoTiktok}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="text-slate-400 hover:text-white transition-colors" title="Copiar">
                          <Copy class="w-4 h-4" />
                        </button>
                      {/if}
                    </div>
                    <div class="text-sm text-slate-300 whitespace-pre-line leading-relaxed flex-1">
                      {#if generandoIA && !textoGeneradoTiktok}
                         <div class="space-y-1.5 mt-1"><div class="h-3 bg-slate-700/50 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700/50 rounded w-3/4 animate-pulse"></div></div>
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
            <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" required class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 text-sm font-bold shadow-sm outline-none text-slate-900 placeholder:text-slate-300" placeholder="Ej. Residencia Minimalista en Puerta de Hierro">
          </div>

          <div>
            <label for="descripcion" class="block text-xs font-semibold text-slate-500 mb-1.5">Descripción Editorial (Obligatorio)</label>
            <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="6" class="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed resize-y placeholder:text-slate-300" placeholder="Escribe aquí los detalles de la propiedad o usa el Estudio Creativo IA para redactar..."></textarea>
          </div>

          <div class="flex items-start mt-4 p-5 bg-slate-50/50 rounded-xl border border-slate-200 shadow-inner">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="destacada" name="destacada" class="w-4 h-4 text-slate-900 rounded cursor-pointer border border-slate-300 focus:ring-slate-900">
            </div>
            <div class="ml-3 flex-1">
              <label for="destacada" class="text-sm font-semibold text-slate-900 cursor-pointer">VIP / Signature (Propiedad Destacada)</label>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Resalta este inmueble en tu catálogo público como una exclusiva de alto valor.</p>
            </div>
          </div>
        </section>

        <section class="space-y-6 pt-10 border-t border-slate-100">
          <div class="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <LayoutTemplate class="w-5 h-5 text-indigo-500" /> 4. Diseño del Smart Brochure
              </h2>
              <p class="text-xs text-slate-500 mt-1">Elige cómo verá tu cliente esta propiedad específica.</p>
            </div>
            <div class="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
              <p class="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">Plan Actual: {planSuscripcion}</p>
            </div>
          </div>

          <input type="hidden" name="template_id" value={selectedTemplate}>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            {#each catalogoTemplates as template}
              {@const autorizado = puedeUsarTemplate(template.minPlan)}
              {@const activo = selectedTemplate === template.id}
              <label class="relative border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 {activo ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-md bg-indigo-50/10' : 'border-slate-200 hover:border-slate-300 bg-white'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
                <input type="radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
                <div class="p-4 flex flex-col justify-between h-full min-h-[100px]">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-sm {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                    {#if !autorizado}
                      <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-amber-100 text-amber-800">
                        🔒 {template.minPlan}
                      </span>
                    {:else if activo}
                      <CheckCircle2 class="w-4 h-4 text-indigo-600" />
                    {/if}
                  </div>
                </div>
              </label>
            {/each}
          </div>
        </section>

        <div class="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm text-center">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-2.5 px-8 rounded-lg disabled:opacity-50 shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-95">
            {#if loading}
              <Loader2 class="animate-spin w-4 h-4 text-white" />
               Procesando...
            {:else}
               <UploadCloud class="w-4 h-4" />
               {isOculta ? 'Guardar Pre-Mercado' : 'Publicar Propiedad'}
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
