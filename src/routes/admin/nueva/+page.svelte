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

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40 shadow-sm">
    <div class="flex items-center gap-4">
      <a href="/admin" class="text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200" aria-label="Volver al inicio">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900 tracking-tight">Crear Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 w-full">
    <div class="w-full max-w-[1000px] mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 sm:p-12">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100 animate-[fadeIn_0.3s_ease-out]">{form.error}</div>
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
      }} class="space-y-16">
        
        <section class="space-y-8">
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-2xl font-black text-slate-900 tracking-tight">1. Datos Base y Multimedia</h2>
            <p class="text-sm text-slate-500 mt-1 font-medium">Información estructural y material visual del inmueble.</p>
          </div>

          <div class="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="is_oculta" name="is_oculta" bind:checked={isOculta} class="w-5 h-5 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer transition-all">
            </div>
            <div class="flex-1">
              <label for="is_oculta" class="text-sm font-bold text-slate-900 cursor-pointer">Mantener propiedad oculta (Modo Pre-Mercado)</label>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                Al activar esta casilla, la propiedad no será visible en el catálogo público de tu agencia. Solo se podrá acceder a ella mediante el enlace directo. Ideal para eventos privados o campañas de expectativa antes del lanzamiento oficial.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-2">
            <div>
              <label for="operacion" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operación</label>
              <select bind:this={selectOperacion} id="operacion" name="operacion" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label for="tipo" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tipo de Inmueble</label>
              <select bind:this={selectTipo} id="tipo" name="tipo" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Precio de Mercado (MXN)</label>
              <input bind:this={inputPrecio} id="precio" type="number" name="precio" required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-slate-900 outline-none font-black text-slate-900 text-xl shadow-sm placeholder:text-slate-300" placeholder="Ej. 5500000">
            </div>

            <div class="sm:col-span-2">
              <label for="ubicacion" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ubicación Estratégica</label>
              <input bind:this={inputUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm">
            </div>

            <div class="col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div><label for="recamaras" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recámaras</label><input bind:this={inputRecamaras} id="recamaras" type="number" name="recamaras" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
              <div><label for="banos" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Baños</label><input id="banos" type="number" name="banos" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
              <div><label for="medio_bano" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">1/2 Baños</label><input id="medio_bano" type="number" name="medio_bano" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
              <div><label for="estacionamientos" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
              <div><label for="m2_terreno" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
              <div><label for="m2_construccion" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-slate-900 outline-none shadow-sm text-center"></div>
            </div>

            <div class="sm:col-span-2 pt-4">
              <label for="imagen_principal" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fotografía Principal (Hero)</label>
              <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-2xl hover:border-slate-400 bg-slate-50 transition-colors relative overflow-hidden group h-56 cursor-pointer">
                {#if imagePreview}
                  <img src={imagePreview} alt="Vista previa" class="absolute inset-0 w-full h-full object-cover z-10" />
                  <div class="absolute inset-0 bg-black/20 z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {/if}
                <div class="relative z-20 flex flex-col items-center justify-center {imagePreview ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity">
                  <div class="bg-white p-4 rounded-full shadow-sm border border-slate-100 mb-3 text-slate-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <span class="text-slate-900 font-bold bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-lg text-sm shadow-sm">Subir Portada</span>
                </div>
                <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" required onchange={handleImageChange}>
              </div>
            </div>

            <div class="sm:col-span-2">
              <label for="galeria_input" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Galería Secundaria (1 a 15 fotos)</label>
              <div class="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-2xl hover:border-slate-400 bg-slate-50 transition-colors relative cursor-pointer min-h-[140px]">
                <div class="text-center z-10 relative">
                  <span class="text-slate-900 font-bold bg-white px-5 py-2.5 rounded-xl shadow-sm border border-slate-200 text-sm hover:bg-slate-50 transition-colors">Seleccionar Fotos Adicionales</span>
                </div>
                <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleGaleriaChange}>
                
                {#if galeriaPreviews.length > 0}
                  <div class="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-4 w-full relative z-20 pointer-events-none">
                    {#each galeriaPreviews as preview, index}
                      <div class="aspect-square rounded-xl overflow-hidden bg-slate-200 shadow-sm ring-1 ring-slate-200"><img src={preview} alt="Miniatura {index + 1}" class="w-full h-full object-cover"/></div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <div class="sm:col-span-2 pt-2">
              <label for="video_url" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Video Recorrido (YouTube / Vimeo)</label>
              <input id="video_url" type="url" name="video_url" placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 font-medium focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm">
            </div>

            <div class="sm:col-span-2">
              <label for="recorrido_3d_url" class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recorrido 3D (Matterport)</label>
              <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 font-medium focus:ring-2 focus:ring-slate-900 outline-none text-slate-900 shadow-sm">
            </div>
          </div>
        </section>

        <section class="mt-16 relative">
          <div class="bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden ring-1 ring-slate-700 shadow-2xl">
            
            <div class="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div class="relative z-10">
              
              <div class="flex flex-col xl:flex-row xl:items-start justify-between gap-8 border-b border-slate-700 pb-8">
                
                <div class="flex-1 flex flex-col items-center xl:items-start">
                  <h2 class="text-3xl font-black text-white tracking-tight flex items-center justify-center xl:justify-start gap-3 w-full">
                    Estudio Creativo IA Inmublia
                    <span class="flex h-2.5 w-2.5 relative mt-1">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </h2>
                  <p class="text-sm text-slate-400 mt-4 font-medium max-w-xl leading-relaxed text-justify">
                    Transforma los datos estructurales en una campaña de marketing completa. Genera la ficha editorial, mensajes de WhatsApp y guiones para video en milisegundos.
                  </p>
                </div>

                <div class="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-6 w-full xl:w-auto shrink-0">
                  
                  <div class="flex flex-col gap-2 w-full sm:w-auto text-center">
                    <label for="tono-ia" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 w-full text-center">Tono de Redacción</label>
                    <select id="tono-ia" bind:value={tonoIA} class="bg-slate-800 text-white border border-slate-700 text-sm font-bold rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer appearance-none pr-10 relative w-full sm:w-auto bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1.2em_1.2em]">
                      <option value="lujo">Premium / Elegante</option>
                      <option value="familiar">Familiar / Cálido</option>
                      <option value="inversionista">Analítico / ROI</option>
                    </select>
                  </div>
                  
                  <div class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/80 rounded-full border border-slate-600 text-sm font-bold text-white shadow-inner sm:mb-0.5">
                    <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                  </div>
                  
                  <div class="w-full sm:w-auto flex flex-col gap-2">
                    <div class="hidden sm:block h-[18px]"></div> 
                    <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="w-full sm:w-auto relative overflow-hidden group bg-white text-slate-900 font-black px-8 py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center">
                      {#if generandoIA}
                        <div class="flex items-center justify-center gap-2">
                          <svg class="animate-spin w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Procesando...
                        </div>
                      {:else}
                        <span class="relative z-10 flex items-center justify-center gap-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                          Generar Contenido
                        </span>
                        <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-900/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite] z-0"></div>
                      {/if}
                    </button>
                  </div>

                </div>
              </div>

              {#if iaEjecutada}
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
                  
                  <div class="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-inner flex flex-col">
                    <div class="flex items-center justify-between mb-6">
                      <h4 class="text-sm font-bold text-white/90 uppercase tracking-widest flex items-center gap-2">
                        <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Ficha Editorial Web
                      </h4>
                      {#if !generandoIA && textoGeneradoFicha.titulo}
                        <button type="button" onclick={aplicarAlFormulario} class="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 px-4 py-2 rounded-lg transition-colors border border-indigo-500/30">
                          Transferir al Formulario
                        </button>
                      {/if}
                    </div>
                    
                    <div class="flex-1 space-y-6">
                      <div>
                        <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Título SEO</p>
                        {#if generandoIA && !textoGeneradoFicha.titulo}
                          <div class="h-8 bg-slate-700 rounded-lg animate-pulse w-3/4"></div>
                        {:else}
                          <p class="text-xl font-black text-white">{textoGeneradoFicha.titulo}</p>
                        {/if}
                      </div>
                      <div>
                        <p class="text-[10px] text-slate-400 uppercase tracking-widest mb-2">Descripción Persuasiva</p>
                        {#if generandoIA && !textoGeneradoFicha.descripcion}
                          <div class="space-y-2">
                            <div class="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
                            <div class="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
                            <div class="h-4 bg-slate-700 rounded w-5/6 animate-pulse"></div>
                          </div>
                        {:else}
                          <p class="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-light">{textoGeneradoFicha.descripcion}</p>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-6">
                    
                    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-inner flex-1 flex flex-col relative group">
                      <div class="flex items-center justify-between mb-4">
                        <h4 class="text-xs font-bold text-white/90 uppercase tracking-widest flex items-center gap-2">
                          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                          Campaña WA
                        </h4>
                        {#if !generandoIA && textoGeneradoWhatsapp}
                          <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-slate-400 hover:text-emerald-400 transition-colors p-1" aria-label="Copiar" title="Copiar al portapapeles">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                          </button>
                        {/if}
                      </div>
                      <div class="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-light">
                        {#if generandoIA && !textoGeneradoWhatsapp}
                           <div class="space-y-2 mt-2"><div class="h-3 bg-slate-700 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700 rounded w-2/3 animate-pulse"></div></div>
                        {:else}
                          {textoGeneradoWhatsapp}
                        {/if}
                      </div>
                    </div>

                    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 shadow-inner flex-1 flex flex-col relative group">
                      <div class="flex items-center justify-between mb-4">
                        <h4 class="text-xs font-bold text-white/90 uppercase tracking-widest flex items-center gap-2">
                          <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                          Guion Video
                        </h4>
                        {#if !generandoIA && textoGeneradoTiktok}
                          <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoTiktok)} class="text-slate-400 hover:text-rose-400 transition-colors p-1" aria-label="Copiar" title="Copiar al portapapeles">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                          </button>
                        {/if}
                      </div>
                      <div class="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-light">
                        {#if generandoIA && !textoGeneradoTiktok}
                           <div class="space-y-2 mt-2"><div class="h-3 bg-slate-700 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700 rounded w-full animate-pulse"></div><div class="h-3 bg-slate-700 rounded w-2/3 animate-pulse"></div></div>
                        {:else}
                          {textoGeneradoTiktok}
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </section>

        <section id="seccion-oficial" class="space-y-6 pt-12 border-t border-slate-200">
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-xl font-black text-slate-900 tracking-tight">3. Publicación Oficial</h2>
            <p class="text-sm text-slate-500 mt-1 font-medium">Revisa y ajusta los textos finales que verán tus clientes.</p>
          </div>

          <div>
            <label for="titulo" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Publicación (Obligatorio)</label>
            <input bind:this={inputTitulo} id="titulo" type="text" name="titulo" required class="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 focus:ring-2 focus:ring-slate-900 text-base font-bold shadow-sm outline-none text-slate-900 placeholder:text-slate-300" placeholder="Ej. Residencia Minimalista en Puerta de Hierro">
          </div>

          <div>
            <label for="descripcion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción Editorial (Obligatorio)</label>
            <textarea bind:this={inputDescripcion} id="descripcion" name="descripcion" rows="8" class="w-full bg-white border border-slate-200 rounded-xl p-5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed resize-y placeholder:text-slate-300" placeholder="Escribe aquí los detalles de la propiedad o usa la Inteligencia Artificial arriba para generarla automáticamente..."></textarea>
          </div>

          <div class="flex items-start mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div class="flex items-center h-5 mt-0.5">
              <input type="checkbox" id="destacada" name="destacada" class="w-5 h-5 text-slate-900 rounded cursor-pointer border border-slate-300 bg-white focus:ring-slate-900">
            </div>
            <div class="ml-4">
              <label for="destacada" class="text-sm font-bold text-slate-900 cursor-pointer">Marcar como Propiedad Signature (VIP)</label>
              <p class="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">Destaca visualmente este inmueble en tu catálogo público con una insignia distintiva, posicionándola como una propiedad exclusiva y de alto valor.</p>
            </div>
          </div>
        </section>

        <div class="pt-8 flex flex-col-reverse sm:flex-row justify-end gap-4 border-t border-slate-200">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-4 px-8 rounded-xl transition-colors shadow-sm text-center">Descartar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-black py-4 px-10 rounded-xl disabled:bg-slate-400 shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:shadow-slate-900/30 transition-all flex items-center justify-center gap-2 transform active:scale-95">
            {#if loading}
              <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Procesando Archivos...
            {:else}
               {#if isOculta}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  Guardar en Pre-Mercado
               {:else}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Publicar Propiedad
               {/if}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>

<style>
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
