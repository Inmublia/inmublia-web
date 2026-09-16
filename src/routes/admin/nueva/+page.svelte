<!-- src/routes/admin/nueva/+page.svelte -->
<script>
  import { enhance, deserialize } from '$app/forms';
  import imageCompression from 'browser-image-compression';
  import { 
    ArrowLeft, UploadCloud, Images, Sparkles, Loader2, CheckCircle2,
    Copy, MapPin, MessageCircle, BadgeDollarSign, LayoutTemplate,
    AlertTriangle, Eye, Zap
  } from 'lucide-svelte';

  let { form, data } = $props();
  let creditosIA = $state(data?.creditos_ia ?? 15);
  let planSuscripcion = $derived(data?.plan_suscripcion ?? 'basico'); 
  
  let loading = $state(false);
  let isOculta = $state(false);
  let selectedTemplate = $state('prop_basic_1'); 

  let generandoIA = $state(false);
  let iaEjecutada = $state(false);
  let tonoIA = $state('lujo'); 
  
  let textoGeneradoWhatsapp = $state('');

  let valTitulo = $state('');
  let valDescripcion = $state('');
  let valPrecio = $state('');
  let valUbicacion = $state('');
  let valTipo = $state('Casa');
  let valOperacion = $state('Venta');
  let valRecamaras = $state('');
  let valBanos = $state('');
  let valMedioBano = $state('');
  let valEstacionamientos = $state('');
  let valAntiguedad = $state(''); 
  let valM2Terreno = $state(''); 
  let valM2Construccion = $state(''); 

  let cobraMantenimiento = $state(false);
  let valMantenimiento = $state('');

  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let portadaLista = $state(null);
  let galeriaLista = $state([]);
  let comprimiendoGaleria = $state(false);

  const opcionesCompresion = {
    maxWidthOrHeight: 1920,
    initialQuality: 0.85, 
    useWebWorker: true,
    fileType: 'image/webp'
  };

  const catalogoTemplates = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', minPlan: 'basico', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', minPlan: 'basico', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', minPlan: 'pro', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', minPlan: 'pro', img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', minPlan: 'pro', img: 'https://images.unsplash.com/photo-1600607687931-cece5ce21460?w=600&q=80' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', minPlan: 'elite', img: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', minPlan: 'elite', img: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=600&q=80' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', minPlan: 'elite', img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', minPlan: 'elite', img: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80' }
  ];

  function puedeUsarTemplate(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }

  async function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    imagePreview = URL.createObjectURL(file);
    try {
      portadaLista = await imageCompression(file, opcionesCompresion);
    } catch (e) {
      console.warn("Fallo compresión portada", e);
      portadaLista = file; 
    }
  }

  async function handleGaleriaChange(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    comprimiendoGaleria = true;
    galeriaPreviews = Array.from(files).map(file => URL.createObjectURL(file));
    
    const archivosProcesados = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const comp = await imageCompression(files[i], opcionesCompresion);
        archivosProcesados.push(comp);
      } catch (e) {
        console.warn(`Fallo compresión en imagen ${i}`, e);
        archivosProcesados.push(files[i]);
      }
    }
    
    galeriaLista = archivosProcesados;
    comprimiendoGaleria = false;
  }

  async function typeWriter(text, setterCallback, speed = 10) {
    if (!text) return;
    let str = String(text); 
    let current = '';
    for (let i = 0; i < str.length; i++) {
      current += str.charAt(i);
      setterCallback(current);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  async function generarCampañaIA() {
    const precioLimpio = valPrecio.toString().replace(/[^0-9.]/g, '');

    if (!valUbicacion || !precioLimpio || !valTipo) {
      alert("Por favor, llena al menos: Tipo, Precio y Ubicación en la Sección 1.");
      return;
    }

    if (creditosIA <= 0) return; 

    generandoIA = true;
    
    valTitulo = '';
    valDescripcion = '';
    textoGeneradoWhatsapp = '';

    document.getElementById('seccion-oficial')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    try {
      const formData = new FormData();
      formData.append('ubicacion', valUbicacion);
      formData.append('precio', precioLimpio);
      formData.append('tipo', valTipo);
      formData.append('operacion', valOperacion);
      formData.append('recamaras', valRecamaras || '0');
      formData.append('banos', valBanos || '0');
      formData.append('medio_bano', valMedioBano || '0');
      formData.append('estacionamientos', valEstacionamientos || '0');
      formData.append('antiguedad', valAntiguedad || 'No especificada'); 
      formData.append('tono', tonoIA); 

      if (cobraMantenimiento && valMantenimiento) {
        formData.append('mantenimiento', valMantenimiento.toString().replace(/[^0-9.]/g, ''));
      }

      const res = await fetch('?/generarCampañaIA', {
        method: 'POST',
        body: formData,
        headers: { 'x-sveltekit-action': 'true' }
      });

      const textRes = await res.text();
      let result;
      try {
        result = deserialize(textRes);
      } catch (e) {
        throw new Error(`Respuesta no válida del servidor. Código: ${res.status}`);
      }

      if (result.type === 'success' && result.data) {
        creditosIA--;
        generandoIA = false;
        iaEjecutada = true;
        
        await Promise.all([
          typeWriter(result.data.titulo, (v) => valTitulo = v, 25),
          typeWriter(result.data.descripcion, (v) => valDescripcion = v, 5),
          typeWriter(result.data.whatsapp, (v) => textoGeneradoWhatsapp = v, 10)
        ]);
      } else if (result.type === 'failure') {
        throw new Error(result.data?.error || 'Error de validación al generar IA.');
      } else if (result.type === 'error') {
        throw new Error(result.error?.message || `Acceso denegado (HTTP ${res.status}).`);
      }

    } catch (e) {
      console.error(e);
      generandoIA = false;
      alert(`Fallo en IA: ${e.message}`);
    }
  }

  function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto);
    alert("Copiado al portapapeles");
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1000px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <a href="/admin" class="text-zinc-400 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10" title="Volver al Inventario">
          <ArrowLeft class="w-6 h-6" />
        </a>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">Nueva Propiedad</h1>
          <p class="text-sm font-medium text-zinc-400 mt-1">Registra un nuevo activo en tu catálogo inmobiliario.</p>
        </div>
      </div>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1000px] mx-auto px-4 sm:px-10 h-full">
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 mb-10">
        
        {#if form?.error}
          <div class="mb-8 bg-red-50 text-red-600 font-semibold p-4 rounded-xl text-sm border border-red-100 animate-[fadeIn_0.3s_ease-out]">{form.error}</div>
        {/if}

        <form method="POST" action="?/crear" enctype="multipart/form-data" use:enhance={async ({ formData, cancel }) => { 
          if (comprimiendoGaleria) {
            alert("Aún estamos procesando las fotos de tu galería. Espera un par de segundos.");
            cancel();
            return;
          }

          loading = true; 
          
          formData.set('titulo', valTitulo);
          formData.set('descripcion', valDescripcion);
          formData.set('tipo', valTipo);
          formData.set('operacion', valOperacion);
          formData.set('precio', valPrecio);
          formData.set('ubicacion', valUbicacion);
          formData.set('recamaras', valRecamaras);
          formData.set('banos', valBanos);
          formData.set('medio_bano', valMedioBano);
          formData.set('estacionamientos', valEstacionamientos);
          formData.set('m2_terreno', valM2Terreno);
          formData.set('m2_construccion', valM2Construccion);
          formData.set('antiguedad', valAntiguedad);

          formData.set('cobra_mantenimiento', cobraMantenimiento);
          formData.set('mantenimiento', cobraMantenimiento ? valMantenimiento : '0');

          if (portadaLista) {
            formData.set('imagen', portadaLista, 'portada.webp');
          }

          if (galeriaLista.length > 0) {
            formData.delete('galeria'); 
            for (let i = 0; i < galeriaLista.length; i++) {
              const safeName = `galeria-${i}-${Math.random().toString(36).substring(7)}.webp`;
              formData.append('galeria', galeriaLista[i], safeName);
            }
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
                  <select bind:value={valOperacion} id="operacion" name="operacion" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
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
                  <select bind:value={valTipo} id="tipo" name="tipo" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm cursor-pointer appearance-none">
                    <option value="Casa">Casa</option>
                    <option value="Departamento">Departamento</option>
                    <option value="Terreno">Terreno</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div class="sm:col-span-1">
                <label for="precio" class="block text-xs font-semibold text-slate-500 mb-1.5">Precio de Mercado (MXN)</label>
                <div class="relative">
                  <BadgeDollarSign class="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input bind:value={valPrecio} id="precio" type="text" name="precio" required class="flex h-10 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-sm transition-colors" placeholder="Ej. 5,500,000">
                </div>
              </div>

              <div class="sm:col-span-1">
                <div class="flex justify-between items-center mb-1.5">
                  <label class="block text-xs font-semibold text-slate-500">Cuota de Mantenimiento</label>
                  <button type="button" role="switch" aria-checked={cobraMantenimiento} class="relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 {cobraMantenimiento ? 'bg-indigo-500' : 'bg-slate-300'}" onclick={() => cobraMantenimiento = !cobraMantenimiento}>
                    <span class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform {cobraMantenimiento ? 'translate-x-3.5' : 'translate-x-0.5'}"></span>
                  </button>
                </div>
                {#if cobraMantenimiento}
                  <div class="relative animate-[fadeIn_0.2s_ease-out]">
                    <BadgeDollarSign class="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input bind:value={valMantenimiento} id="mantenimiento" type="text" name="mantenimiento" class="flex h-10 w-full rounded-md border border-indigo-200 bg-white pl-10 pr-3 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm transition-colors" placeholder="Ej. 2,500">
                  </div>
                {:else}
                   <div class="h-10 w-full rounded-md border border-slate-100 bg-slate-50 flex items-center px-3 text-xs text-slate-400 font-medium">Sin cuota de mantenimiento</div>
                {/if}
              </div>

              <div class="sm:col-span-2">
                <label for="comision" class="block text-xs font-semibold text-slate-500 mb-1.5">Comisión Pactada (%) <span class="font-normal text-[10px] text-slate-400">(Opcional)</span></label>
                <div class="relative">
                  <input id="comision" type="number" step="0.1" max="100" min="0" name="comision" class="w-full bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm font-bold ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 shadow-sm" placeholder="Ej. 6.5">
                  <span class="absolute right-4 top-2.5 text-slate-400 font-bold">%</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-1">Si dejas este campo en blanco, se usará tu porcentaje base global.</p>
              </div>

              <div class="sm:col-span-2">
                <label for="ubicacion" class="block text-xs font-semibold text-slate-500 mb-1.5">Ubicación Estratégica (Colonia, Ciudad)</label>
                <div class="relative">
                  <MapPin class="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input bind:value={valUbicacion} id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 outline-none shadow-sm">
                </div>
              </div>

              <div class="col-span-2 grid grid-cols-3 sm:grid-cols-7 gap-4">
                <div><label for="recamaras" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Recámaras</label><input bind:value={valRecamaras} id="recamaras" type="number" name="recamaras" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="banos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Baños</label><input bind:value={valBanos} id="banos" type="number" name="banos" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="medio_bano" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">1/2 Baños</label><input bind:value={valMedioBano} id="medio_bano" type="number" name="medio_bano" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="estacionamientos" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Autos</label><input bind:value={valEstacionamientos} id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="m2_terreno" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Terreno</label><input bind:value={valM2Terreno} id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="m2_construccion" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">M² Const.</label><input bind:value={valM2Construccion} id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-200" placeholder="0"></div>
                <div><label for="antiguedad" class="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 text-center w-full">Antigüedad</label><input bind:value={valAntiguedad} id="antiguedad" type="text" name="antiguedad" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-center focus:ring-2 focus:ring-slate-900 outline-none shadow-sm placeholder:text-slate-300" placeholder="Ej. 5 años"></div>
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
                <div class="flex justify-between items-end mb-1.5">
                  <label for="galeria_input" class="block text-xs font-semibold text-slate-500">Galería Secundaria (1 a 15 fotos)</label>
                  {#if comprimiendoGaleria}
                    <span class="text-[10px] font-bold text-indigo-600 flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded"><Loader2 class="w-3 h-3 animate-spin"/> Optimizando...</span>
                  {/if}
                </div>
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
                  <p class="text-sm text-slate-400 mt-4 leading-relaxed max-w-2xl text-center font-medium">
                    Autogenera descripción comercial de alta conversión y copy profesional para WhatsApp basado en tus datos numéricos. 
                  </p>
                </div>

                {#if creditosIA > 0}
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
                          Redactando...
                        {:else}
                          <Sparkles class="w-4 h-4 text-slate-900" />
                          Generar Contenido
                        {/if}
                      </button>
                    </div>
                  </div>
                {:else}
                  <div class="w-full max-w-3xl mx-auto bg-gradient-to-br from-indigo-900/50 to-slate-900/80 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
                    <Zap class="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
                    
                    {#if planSuscripcion === 'elite'}
                      <h3 class="text-xl font-bold text-white mb-2">Límite Mensual Alcanzado (Plan Elite)</h3>
                      <p class="text-sm text-slate-300 mb-6 max-w-lg mx-auto">
                        Has utilizado todos tus créditos. Adquiere un paquete de recarga extra (Top-Up) para continuar redactando campañas sin interrupciones este mes.
                      </p>
                      <a href="/admin/perfil" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                        <Zap class="w-4 h-4" /> Adquirir Top-Up IA
                      </a>
                    {:else if planSuscripcion === 'pro'}
                      <h3 class="text-xl font-bold text-white mb-2">Límite Mensual Alcanzado (Plan Pro)</h3>
                      <p class="text-sm text-slate-300 mb-6 max-w-lg mx-auto">
                        Has utilizado tus 125 créditos. Mejora al plan <strong>Elite (500 créditos)</strong> o adquiere una recarga para operar sin límites.
                      </p>
                      <a href="/admin/perfil" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                        <Sparkles class="w-4 h-4" /> Mejorar a Plan Elite
                      </a>
                    {:else}
                      <h3 class="text-xl font-bold text-white mb-2">Has agotado tus créditos (Plan Básico)</h3>
                      <p class="text-sm text-slate-300 mb-6 max-w-lg mx-auto">
                        La Inteligencia Artificial es el motor de las agencias top. Mejora tu plan a <strong>Pro (125 créditos)</strong> o <strong>Elite (500 créditos)</strong> para dominar el mercado.
                      </p>
                      <a href="/admin/perfil" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                        <Sparkles class="w-4 h-4" /> Desbloquear Estudio Creativo
                      </a>
                    {/if}
                  </div>
                {/if}
              </div>

              {#if iaEjecutada && textoGeneradoWhatsapp}
                <div class="mt-8 animate-[fadeIn_0.4s_ease-out] relative z-10 max-w-2xl mx-auto">
                  <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex flex-col">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle class="w-4 h-4 text-emerald-400" />
                        Campaña WhatsApp Profesional
                      </h4>
                      {#if !generandoIA}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600/50">
                          <Copy class="w-3.5 h-3.5" />
                          Copiar Mensaje
                        </button>
                      {/if}
                    </div>
                    <div class="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {#if generandoIA}
                         <div class="space-y-2 mt-1">
                           <div class="h-3 bg-slate-700/50 rounded w-full animate-pulse"></div>
                           <div class="h-3 bg-slate-700/50 rounded w-5/6 animate-pulse"></div>
                           <div class="h-3 bg-slate-700/50 rounded w-4/6 animate-pulse"></div>
                         </div>
                      {:else}
                        {textoGeneradoWhatsapp}
                      {/if}
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex justify-center animate-[fadeIn_0.4s_ease-out]">
                  <p class="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 text-center max-w-2xl">
                    <AlertTriangle class="w-4 h-4 text-amber-500 shrink-0" />
                    Contenido generado por Inteligencia Artificial. Por favor, revisa y ajusta los textos en la sección inferior antes de publicarlos.
                  </p>
                </div>
              {/if}
            </div>
          </section>

          <section id="seccion-oficial" class="space-y-6 pt-10 border-t border-slate-100">
            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 class="text-xl font-bold text-slate-900 tracking-tight">3. Publicación Oficial</h2>
              {#if iaEjecutada && !generandoIA}
                <span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-[fadeIn_0.4s_ease-out]">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  Autocompletado por IA
                </span>
              {/if}
            </div>

            <div>
              <label for="titulo" class="block text-xs font-semibold text-slate-500 mb-1.5">Título de la Publicación (Obligatorio)</label>
              <input bind:value={valTitulo} id="titulo" type="text" name="titulo" required class="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-slate-900 text-sm font-bold shadow-sm outline-none text-slate-900 placeholder:text-slate-300 transition-colors" placeholder="Ej. Residencia Minimalista en Puerta de Hierro">
            </div>

            <div>
              <label for="descripcion" class="block text-xs font-semibold text-slate-500 mb-1.5">Descripción Editorial (Obligatorio)</label>
              <textarea bind:value={valDescripcion} id="descripcion" name="descripcion" rows="12" class="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-slate-900 text-slate-800 leading-relaxed resize-y placeholder:text-slate-300 transition-colors" placeholder="Escribe aquí los detalles de la propiedad o usa el Estudio Creativo IA para redactar..."></textarea>
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
                <p class="text-xs text-slate-500 mt-1">Elige la plantilla específica para vestir la página de este inmueble.</p>
              </div>
              <div class="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                <p class="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">Plan de Acceso: {planSuscripcion}</p>
              </div>
            </div>

            <input type="hidden" name="template_id" value={selectedTemplate}>

            <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
              {#each catalogoTemplates as template}
                {@const autorizado = puedeUsarTemplate(template.minPlan)}
                {@const activo = selectedTemplate === template.id}
                
                <div class="flex flex-col gap-3">
                  <label class="relative border rounded-xl overflow-hidden cursor-pointer transition-all duration-300 flex flex-col group {activo ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-md bg-indigo-50/10' : 'border-slate-200 hover:border-slate-300 bg-white'} {!autorizado ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-lg'}">
                    <input type="radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
                    
                    <div class="aspect-video w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
                       <img 
                         src={template.img} 
                         alt={template.nombre} 
                         onerror={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/1e293b/ffffff?text=Inmublia+Template'; }}
                         class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                       />
                       {#if activo}
                         <div class="absolute inset-0 bg-indigo-600/15 mix-blend-multiply transition-colors"></div>
                       {/if}
                    </div>

                    <div class="p-4 flex flex-col justify-between flex-1 bg-white">
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-bold text-sm leading-tight {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                        {#if !autorizado}
                          <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-200 text-slate-500 shrink-0">
                            🔒 {template.minPlan}
                          </span>
                        {:else if activo}
                          <CheckCircle2 class="w-5 h-5 text-indigo-600 shrink-0" />
                        {/if}
                      </div>
                    </div>
                  </label>
                  
                  {#if autorizado}
                    <a href="/propiedad-demo?template={template.id}&sandbox=true" target="_blank" class="flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 text-[11px] font-bold py-2 rounded-lg transition-colors border border-slate-200">
                      <Eye class="w-3.5 h-3.5" /> Previsualizar Diseño
                    </a>
                  {/if}
                </div>
              {/each}
            </div>
          </section>

          <div class="pt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-slate-100">
            <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm text-center">Cancelar</a>
            <button type="submit" disabled={loading || comprimiendoGaleria} class="bg-slate-900 text-white font-bold py-2.5 px-8 rounded-lg disabled:opacity-50 shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm transform active:scale-95">
              {#if loading || comprimiendoGaleria}
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
    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
