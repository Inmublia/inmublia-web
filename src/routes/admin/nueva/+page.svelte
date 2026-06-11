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
    Video 
  } from 'lucide-svelte';

  let { form, data } = $props();
  let creditosIA = $state(data.creditos_ia ?? 0);
  
  let loading = $state(false);
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(false);

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

<div class="min-h-screen bg-muted/30 flex flex-col font-sans text-foreground">
  <header class="h-16 bg-background border-b border-border flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
    <div class="flex items-center gap-4">
      <a href="/admin" class="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted" aria-label="Volver al inicio">
        <ArrowLeft class="w-5 h-5" />
      </a>
      <h1 class="text-lg font-semibold tracking-tight">Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 w-full">
    <div class="w-full max-w-[900px] mx-auto bg-background rounded-xl shadow-sm border border-border p-6 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-destructive/10 text-destructive font-medium p-4 rounded-lg text-sm border border-destructive/20 animate-in fade-in slide-in-from-top-2">{form.error}</div>
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
          <div class="border-b border-border pb-3">
            <h2 class="text-lg font-semibold tracking-tight">1. Estructura y Multimedia</h2>
          </div>

          <div class="p-5 bg-muted/50 rounded-lg border border-border flex items-start gap-4">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="is_oculta" name="is_oculta" bind:checked={isOculta} class="w-4 h-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-background">
            </div>
            <div class="flex-1">
              <label for="is_oculta" class="text-sm font-medium cursor-pointer flex items-center gap-2">
                <EyeOff class="w-4 h-4 text-muted-foreground" />
                Mantener en Pre-Mercado (Oculta)
              </label>
              <p class="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                La propiedad no será visible en el catálogo público. Solo accesible vía enlace directo.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div>
              <label for="operacion" class="block text-xs font-medium text-muted-foreground mb-1.5">Operación</label>
              <select bind:this={selectOperacion} id="operacion" name="operacion" class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label for="tipo" class="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de Inmueble</label>
              <select bind:this={selectTipo} id="tipo" name="tipo" class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-xs font-medium text-muted-foreground mb-1.5">Precio de Mercado (MXN)</label>
              <div class="relative">
                <BadgeDollarSign class="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <input bind:this={inputPrecio} id="precio" type="number" name="precio" required class="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Ej. 5500000">
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="ubicacion" class="block text-xs font-medium text-muted-foreground mb-1.5">Ubicación Estratégica (Colonia, Ciudad)</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              </div>
            </div>

            <div class="col-span-2 grid grid-cols-3 sm:grid-cols-6 gap-4">
              <div><label for="recamaras" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
              <div><label for="banos" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">Baños</label><input id="banos" type="number" name="banos" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
              <div><label for="medio_bano" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
              <div><label for="estacionamientos" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
              <div><label for="m2_terreno" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
              <div><label for="m2_construccion" class="block text-[10px] font-medium text-muted-foreground uppercase mb-1.5 text-center w-full">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-center shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="0"></div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="imagen_principal" class="block text-xs font-medium text-muted-foreground mb-1.5">Fotografía Principal (Hero)</label>
              <div class="flex justify-center px-6 pt-5 pb-6 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors relative overflow-hidden group h-48 cursor-pointer bg-muted/20">
                {#if imagePreview}
                  <img src={imagePreview} alt="Vista previa" class="absolute inset-0 w-full h-full object-cover z-10" />
                  <div class="absolute inset-0 bg-background/50 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {/if}
                <div class="relative z-20 flex flex-col items-center justify-center {imagePreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity">
                  <div class="bg-background p-3 rounded-md shadow-sm border border-border mb-2 text-muted-foreground">
                    <UploadCloud class="w-5 h-5" />
                  </div>
                  <span class="text-foreground font-medium text-xs">Subir Portada Principal</span>
                </div>
                <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" required onchange={handleImageChange}>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="galeria_input" class="block text-xs font-medium text-muted-foreground mb-1.5">Galería Secundaria (1 a 15 fotos)</label>
              <div class="flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors relative cursor-pointer min-h-[120px] bg-muted/20">
                <div class="text-center z-10 relative flex flex-col items-center">
                  <Images class="w-5 h-5 text-muted-foreground mb-2" />
                  <span class="text-foreground font-medium text-xs">Seleccionar Fotos Adicionales</span>
                </div>
                <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleGaleriaChange}>
                
                {#if galeriaPreviews.length > 0}
                  <div class="mt-6 grid grid-cols-4 sm:grid-cols-6 gap-2 w-full relative z-20 pointer-events-none">
                    {#each galeriaPreviews as preview, index}
                      <div class="aspect-square rounded-md overflow-hidden bg-muted border border-border"><img src={preview} alt="Miniatura {index + 1}" class="w-full h-full object-cover"/></div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="video_url" class="block text-xs font-medium text-muted-foreground mb-1.5">Video Recorrido (YouTube / Vimeo)</label>
              <input id="video_url" type="url" name="video_url" placeholder="Ej. https://www.youtube.com/watch?v=..." class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            </div>

            <div class="sm:col-span-2">
              <label for="recorrido_3d_url" class="block text-xs font-medium text-muted-foreground mb-1.5">Recorrido 3D (Matterport)</label>
              <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" placeholder="Ej. https://my.matterport.com/show/?m=..." class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            </div>
          </div>
        </section>

        <section class="relative">
          <div class="bg-zinc-950 rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-md border border-zinc-900/50">
            
            <div class="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div class="relative z-10">
              
              <div class="flex flex-col items-center w-full mb-8">
                <h2 class="text-xl font-semibold text-zinc-50 tracking-tight flex items-center justify-center gap-2">
                  <Sparkles class="w-5 h-5 text-primary" />
                  Estudio Creativo IA Inmublia
                </h2>
                <p class="text-sm text-zinc-400 mt-3 max-w-xl text-center">
                  Autogenera la descripción comercial, mensajes estructurados para WhatsApp y guiones para redes sociales basándote en los datos de la Sección 1.
                </p>
              </div>

              <div class="flex flex-col sm:flex-row items-end justify-center gap-4 w-full max-w-2xl mx-auto bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm rounded-xl p-3 shadow-inner">
                
                <div class="flex flex-col items-center gap-1.5 w-full sm:w-1/3">
                  <label for="tono-ia" class="text-[10px] font-medium text-zinc-400 uppercase tracking-widest text-center w-full">Tono de Redacción</label>
                  <select id="tono-ia" bind:value={tonoIA} class="flex h-9 w-full items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none">
                    <option value="lujo">Premium / Elegante</option>
                    <option value="familiar">Familiar / Cálido</option>
                    <option value="inversionista">Analítico / ROI</option>
                  </select>
                </div>

                <div class="flex items-center justify-center w-full sm:w-1/3 pb-0.5">
                  <div class="inline-flex items-center gap-1.5 px-4 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs font-medium text-zinc-300">
                    <span class="relative flex h-2 w-2">
                      {#if creditosIA > 0}
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      {:else}
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      {/if}
                    </span>
                    {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                  </div>
                </div>

                <div class="w-full sm:w-1/3 flex flex-col items-center">
                  <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full shadow-sm">
                    {#if generandoIA}
                      <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    {:else}
                      Generar Contenido
                    {/if}
                  </button>
                </div>
              </div>

            </div>

            {#if iaEjecutada}
              <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10 animate-in slide-in-from-bottom-4 fade-in duration-500">
                
                <div class="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 class="w-4 h-4 text-primary" />
                      Ficha Editorial Web
                    </h4>
                    {#if !generandoIA && textoGeneradoFicha.titulo}
                      <button type="button" onclick={aplicarAlFormulario} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 h-7 px-3">
                        <Check class="w-3 h-3 mr-1.5" />
                        Usar Textos
                      </button>
                    {/if}
                  </div>
                  
                  <div class="flex-1 space-y-4">
                    <div>
                      <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Título</p>
                      {#if generandoIA && !textoGeneradoFicha.titulo}
                        <div class="h-5 bg-zinc-800 rounded animate-pulse w-3/4"></div>
                      {:else}
                        <p class="text-sm font-semibold text-zinc-100">{textoGeneradoFicha.titulo}</p>
                      {/if}
                    </div>
                    <div>
                      <p class="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Descripción</p>
                      {#if generandoIA && !textoGeneradoFicha.descripcion}
                        <div class="space-y-1.5">
                          <div class="h-3 bg-zinc-800 rounded w-full animate-pulse"></div>
                          <div class="h-3 bg-zinc-800 rounded w-full animate-pulse"></div>
                          <div class="h-3 bg-zinc-800 rounded w-4/5 animate-pulse"></div>
                        </div>
                      {:else}
                        <p class="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{textoGeneradoFicha.descripcion}</p>
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-4">
                  <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex-1 flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageCircle class="w-4 h-4 text-emerald-500" />
                        WhatsApp
                      </h4>
                      {#if !generandoIA && textoGeneradoWhatsapp}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-zinc-500 hover:text-zinc-300 transition-colors" title="Copiar">
                          <Copy class="w-4 h-4" />
                        </button>
                      {/if}
                    </div>
                    <div class="text-xs text-zinc-300 whitespace-pre-line leading-relaxed flex-1">
                      {#if generandoIA && !textoGeneradoWhatsapp}
                         <div class="space-y-1.5 mt-1"><div class="h-3 bg-zinc-800 rounded w-full animate-pulse"></div><div class="h-3 bg-zinc-800 rounded w-3/4 animate-pulse"></div></div>
                      {:else}
                        {textoGeneradoWhatsapp}
                      {/if}
                    </div>
                  </div>

                  <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex-1 flex flex-col">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Video class="w-4 h-4 text-rose-500" />
                        Guion Video
                      </h4>
                      {#if !generandoIA && textoGeneradoTiktok}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="text-zinc-500 hover:text-zinc-300 transition-colors" title="Copiar">
                          <Copy class="w-4 h-4" />
                        </button>
                      {/if}
                    </div>
                    <div class="text-xs text-zinc-300 whitespace-pre-line leading-relaxed flex-1">
                      {#if generandoIA && !textoGeneradoTiktok}
                         <div class="space-y-1.5 mt-1"><div class="h-3 bg-zinc-800 rounded w-full animate-pulse"></div><div class="h-3 bg-zinc-800 rounded w-3/4 animate-pulse"></div></div>
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

        <section id="seccion-oficial" class="space-y-6 pt-6 border-t border-border">
          <div class="border-b border-border pb-3 flex items-center justify-between">
            <h2 class="text-lg font-semibold tracking-tight">3. Publicación Oficial</h2>
          </div>

          <div>
            <label for="titulo" class="block text-xs font-medium text-muted-foreground mb-1.5">Título de la Publicación (Obligatorio)</label>
            <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Ej. Residencia Minimalista en Puerta de Hierro">
          </div>

          <div>
            <label for="descripcion" class="block text-xs font-medium text-muted-foreground mb-1.5">Descripción Editorial (Obligatorio)</label>
            <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="6" class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y" placeholder="Escribe aquí los detalles de la propiedad o usa el Estudio Creativo IA para redactar..."></textarea>
          </div>

          <div class="flex items-start mt-4 p-5 bg-muted/50 rounded-lg border border-border">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="destacada" name="destacada" class="w-4 h-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-background">
            </div>
            <div class="ml-3 flex-1">
              <label for="destacada" class="text-sm font-medium cursor-pointer">VIP / Signature (Propiedad Destacada)</label>
              <p class="text-xs text-muted-foreground mt-1 leading-relaxed">Resalta este inmueble en tu catálogo público como una exclusiva de alto valor.</p>
            </div>
          </div>
        </section>

        <div class="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-border">
          <a href="/admin" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">Cancelar</a>
          <button type="submit" disabled={loading} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 shadow-sm">
            {#if loading}
              <Loader2 class="w-4 h-4 mr-2 animate-spin" />
              Procesando...
            {:else}
               {isOculta ? 'Guardar Pre-Mercado' : 'Publicar Propiedad'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
