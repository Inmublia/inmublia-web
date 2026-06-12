<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutGrid, Tablet, Smartphone } from 'lucide-svelte';
  
  // RESTAURACIÓN DEL SIDEBAR ORIGINAL
  import Sidebar from '$lib/components/Sidebar.svelte';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  // Lógica de Plan
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic', 'clean', 'modern', 'editorial', 'luxury', 'cinematic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');

  let savingDesign = $state(false);
  let showSuccess = $state(false);

  // 1. CATÁLOGO GLOBAL (Las 6 para el Portal) - ESTAS SE GUARDAN
  const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico', previewUrl: 'https://demo.inmublia.com/classic' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico', previewUrl: 'https://demo.inmublia.com/clean' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Asimétrico con contacto fijo.', minPlan: 'pro', previewUrl: 'https://demo.inmublia.com/modern' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Lectura y tipografía elegante.', minPlan: 'pro', previewUrl: 'https://demo.inmublia.com/editorial' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Premium de pantalla completa.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/luxury' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Navegación inmersiva en video.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/cinematic' }
  ];

  // 2. CATÁLOGO SMART BROCHURES (Las 9 de Propiedades) - ESTAS SOLO SE EXHIBEN AQUÍ
  const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico', previewUrl: 'https://demo.inmublia.com/brochure-basic1' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería horizontal.', minPlan: 'basico', previewUrl: 'https://demo.inmublia.com/brochure-basic2' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky agresivo.', minPlan: 'pro', previewUrl: 'https://demo.inmublia.com/brochure-pro1' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel independiente.', minPlan: 'pro', previewUrl: 'https://demo.inmublia.com/brochure-pro2' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Revista de arquitectura (Serif).', minPlan: 'pro', previewUrl: 'https://demo.inmublia.com/brochure-pro3' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Glassmorphism sobre fondo.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/brochure-elite1' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video en bucle de fondo.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/brochure-elite2' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Neo-brutalismo oscuro y bronce.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/brochure-elite3' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Matterport interactivo de fondo.', minPlan: 'elite', previewUrl: 'https://demo.inmublia.com/brochure-elite4' }
  ];

  const allTemplates = [...catalogoGlobal, ...catalogoPropiedades];

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }

  // --- ESTADOS SEGUROS ANTI-CRASH ---
  // 1. Lo que se va a guardar en base de datos (Portal Global)
  let selectedGlobalId = $state(broker.template_seleccionado || 'classic');

  // 2. Lo que se está viendo en la pantalla interactiva derecha
  let previewId = $state(selectedGlobalId); 
  // Fallback seguro: Si no encuentra el ID, usa el primero del arreglo, jamás será undefined.
  let previewData = $derived(allTemplates.find(t => t.id === previewId) || allTemplates[0]);
  
  let previewMode = $state('tablet'); // 'mobile' o 'tablet'
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden relative">
  
  <Sidebar />
  
  <main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
    
    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-inner">
          <Palette class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">Design Studio</h1>
          <p class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure la identidad visual de su agencia</p>
        </div>
      </div>

      <form method="POST" action="?/updateTemplate" use:enhance={() => { savingDesign = true; return async ({ update, result }) => { savingDesign = false; if(result.type === 'success'){ showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll();} update({ reset: false }); }; }}>
        <input type="hidden" name="template_seleccionado" value={selectedGlobalId}>
        
        <button type="submit" disabled={savingDesign} class="flex items-center gap-2.5 px-8 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-extrabold hover:bg-slate-800 transition-colors shadow-xl disabled:opacity-50 active:scale-[0.98]">
          {#if savingDesign}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
          {:else}
            <Save class="w-4 h-4 text-amber-400" /> Guardar Diseño de Portal
          {/if}
        </button>
      </form>
    </header>

    <div class="p-10 flex-1 overflow-auto pb-32">
      <div class="max-w-[1500px] mx-auto">

        {#if form?.error}
          <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm" role="alert">
            <AlertCircle class="w-5 h-5" /> Error: {form.error}
          </div>
        {/if}

        {#if showSuccess}
          <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
            <CheckCircle2 class="w-5 h-5" /> Configuración global actualizada correctamente.
          </div>
        {/if}

        <div class="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          <div class="xl:col-span-6 space-y-8">
            
            <section class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div class="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                <Layers class="w-5 h-5 text-slate-400" />
                <h2 class="text-base font-black text-slate-900 tracking-tight">1. Identidad de Barra Superior</h2>
              </div>
              
              <div class="p-6 flex items-center gap-6">
                <div class="w-20 h-20 rounded-full border-2 border-slate-200 shadow-md overflow-hidden shrink-0 bg-slate-100">
                  <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
                </div>
                <div>
                  <h3 class="text-lg font-black text-slate-900">{broker.nombre_comercial || 'Inmublia'}</h3>
                  <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-1 mb-2">Previsualización de su marca</p>
                  <a href="/admin/perfil" class="text-xs font-bold text-indigo-600 hover:text-indigo-500 underline">Modificar en Perfil</a>
                </div>
              </div>
            </section>

            <section class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-amber-500">
              <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div class="flex items-center gap-3">
                  <LayoutGrid class="w-5 h-5 text-slate-400" />
                  <h2 class="text-base font-black text-slate-900 tracking-tight">2. Diseño del Portal (Global)</h2>
                </div>
                <span class="text-[9px] font-black px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-widest">
                  Selección Activa
                </span>
              </div>

              <div class="p-6">
                <p class="text-xs font-medium text-slate-500 mb-5">Elija la plantilla que estructurará todo su inventario público. Esta es la opción que se guarda al presionar el botón superior.</p>
                
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {#each catalogoGlobal as template}
                    {@const isSelected = selectedGlobalId === template.id}
                    {@const isPreviewing = previewId === template.id}
                    {@const autorizado = puedeUsar(template.minPlan)}
                    
                    <button 
                      type="button"
                      disabled={!autorizado}
                      onclick={() => { selectedGlobalId = template.id; previewId = template.id; }} 
                      class="flex flex-col bg-white p-3 rounded-2xl border-2 transition-all text-left group {!autorizado ? 'opacity-50 grayscale cursor-not-allowed border-slate-100' : isSelected ? 'border-amber-500 bg-amber-50/30 shadow-md ring-4 ring-amber-500/10' : 'border-slate-100 hover:border-amber-200'}"
                    >
                      <div class="flex items-center justify-between w-full mb-2">
                        <span class="text-xs font-black text-slate-900">{template.nombre}</span>
                        {#if isSelected}
                          <CheckCircle2 class="w-4 h-4 text-amber-500" />
                        {/if}
                      </div>
                      
                      <div class="w-full h-16 rounded-lg overflow-hidden mb-3 border border-slate-200/50 flex {template.id === 'cinematic' ? 'bg-zinc-900' : 'bg-slate-100'}">
                        <div class="w-1/3 h-full bg-black/10"></div>
                        <div class="w-2/3 h-full flex flex-col gap-1 p-2">
                          <div class="w-full h-2 bg-black/10 rounded-full"></div>
                          <div class="w-3/4 h-2 bg-black/10 rounded-full"></div>
                        </div>
                      </div>

                      <div class="flex items-center justify-between w-full mt-auto">
                        {#if !autorizado}
                          <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-200 text-slate-500">🔒 {template.minPlan}</span>
                        {:else}
                          <span class="text-[9px] font-bold {isPreviewing ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500'} transition-colors flex items-center gap-1">
                            <Eye class="w-3 h-3" /> Ver Preview
                          </span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            </section>

            <section class="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative">
              <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 relative z-10">
                <div class="flex items-center gap-3">
                  <LayoutGrid class="w-5 h-5 text-indigo-400" />
                  <h2 class="text-base font-black text-white tracking-tight">3. Exhibición de Smart Brochures</h2>
                </div>
                <span class="text-[9px] font-black px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-widest">
                  Solo Previsualización
                </span>
              </div>

              <div class="p-6 relative z-10">
                <p class="text-xs font-medium text-slate-400 mb-5">Estas 9 plantillas son individuales para cada propiedad. Solo haga clic para previsualizarlas a la derecha. (Se asignan al dar de alta una casa).</p>
                
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {#each catalogoPropiedades as template}
                    {@const isPreviewing = previewId === template.id}
                    {@const autorizado = puedeUsar(template.minPlan)}
                    
                    <button 
                      type="button"
                      disabled={!autorizado}
                      onclick={() => previewId = template.id} 
                      class="flex flex-col bg-slate-800/50 p-3 rounded-xl border transition-all text-left group {!autorizado ? 'opacity-40 grayscale cursor-not-allowed border-slate-800' : isPreviewing ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20' : 'border-slate-700 hover:border-indigo-400'}"
                    >
                      <h4 class="text-xs font-bold text-white mb-1 truncate w-full">{template.nombre}</h4>
                      
                      <div class="w-full h-12 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center mb-2 group-hover:bg-black transition-colors">
                        <Eye class="w-4 h-4 {isPreviewing ? 'text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400'} transition-colors" />
                      </div>

                      <div class="flex justify-between items-center w-full mt-auto">
                        {#if !autorizado}
                          <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-800 text-slate-500">🔒 {template.minPlan}</span>
                        {:else}
                          <span class="text-[8px] font-black uppercase tracking-widest {isPreviewing ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-300'}">
                            {isPreviewing ? 'Viendo Ahora' : 'Probar Visual'}
                          </span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                </div>
              </div>
            </section>

          </div>

          <div class="xl:col-span-6">
            <section class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-8">
              
              <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    <Eye class="w-4 h-4" />
                  </div>
                  <div>
                    <h3 class="text-sm font-black text-slate-900 tracking-tight">Estudio Interactivo</h3>
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{previewData.nombre}</p>
                  </div>
                </div>
                
                <div class="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg border border-slate-200">
                  <button onclick={() => previewMode = 'tablet'} class="p-1.5 rounded-md text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'tablet'} class:text-slate-900={previewMode === 'tablet'} class:shadow-sm={previewMode === 'tablet'} title="Pantalla Completa">
                    <Tablet class="w-4 h-4" />
                  </button>
                  <button onclick={() => previewMode = 'mobile'} class="p-1.5 rounded-md text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'mobile'} class:text-slate-900={previewMode === 'mobile'} class:shadow-sm={previewMode === 'mobile'} title="Móvil">
                    <Smartphone class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="p-6 md:p-8 flex flex-col items-center justify-center bg-slate-900 min-h-[600px] shadow-inner relative overflow-hidden">
                <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
                
                <div 
                  class="border-[8px] md:border-[12px] border-black rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative bg-zinc-950"
                  class:w-[320px]={previewMode === 'mobile'} class:h-[580px]={previewMode === 'mobile'}
                  class:w-full={previewMode === 'tablet'} class:max-w-[600px]={previewMode === 'tablet'} class:h-[600px]={previewMode === 'tablet'}
                >
                  {#if previewMode === 'mobile'}
                     <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20 transition-all"></div>
                  {/if}

                  <iframe 
                    src={previewData.previewUrl} 
                    title="Vista previa real"
                    class="w-full h-full border-0 absolute inset-0 z-10 transition-opacity duration-500 bg-white"
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  </main>
</div>
