<script>
  // ==========================================
  // INMUBLIA ADMIN: THE DESIGN SANCTUARY (Fixed)
  // ==========================================
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutGrid, Tablet, Smartphone } from 'lucide-svelte';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  // 🔥 CANDADO DE NEGOCIO: Solo templates autorizados por el plan
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let templatesAutorizados = $derived(planConfig.templates_autorizados);

  let savingDesign = $state(false);
  let showSuccess = $state(false);

  // --- MAPA MAESTRO DE DEMOS (Url reales de demostración de plantillas) ---
  const demoUrls = {
    // Portal/Global Templates
    'classic': 'https://demo.inmublia.com/template-classic',
    'clean': 'https://demo.inmublia.com/template-clean',
    'modern': 'https://demo.inmublia.com/template-modern',
    'editorial': 'https://demo.inmublia.com/template-editorial',
    'luxury': 'https://demo.inmublia.com/template-luxury',
    'cinematic': 'https://demo.inmublia.com/template-cinematic',
    
    // Smart Brochures (Property Level)
    'prop_basic_1': 'https://demo.inmublia.com/demo-property-basic1',
    'prop_basic_2': 'https://demo.inmublia.com/demo-property-basic2',
    'prop_pro_1': 'https://demo.inmublia.com/demo-property-pro1',
    'prop_pro_2': 'https://demo.inmublia.com/demo-property-pro2',
    'prop_elite_1': 'https://demo.inmublia.com/demo-property-elite1',
    'prop_elite_2': 'https://demo.inmublia.com/demo-property-elite2'
  };

  // --- LÓGICA DE PREVISUALIZACIÓN DINÁMICA DE CATÁLOGOS ---
  // Mapa de miniaturas y previews reales para datos demo
  const catalogTemplates = {
    'prop_elite_1': { 
      name: 'Luxury Immersive', 
      desc: 'Glassmorphism sobre fondo fijo al 100%.',
      thumbnailType: 'immersive'
    },
    'prop_elite_2': { 
      name: 'Cinematic Tour', 
      desc: 'Video hero en bucle como fondo inmersivo.',
      thumbnailType: 'video'
    },
    'prop_pro_1': { 
      name: 'Lead Magnet', 
      desc: 'Formulario sticky agresivo en la cabecera.',
      thumbnailType: 'form'
    },
    'prop_basic_1': { 
      name: 'Essential Focus', 
      desc: 'Ficha técnica directa y optimizada.',
      thumbnailType: 'list'
    }
    // ... más templates
  };

  // Filtramos el catálogo para mostrar solo los autorizados
  let authorizedCatalog = $derived(
    Object.entries(catalogTemplates)
      .filter(([id]) => templatesAutorizados.includes(id))
      .map(([id, data]) => ({ id, ...data }))
  );

  // Fallback si no hay plantilla elegida -> la primera autorizada
  let selectedTemplateId = $state(broker.template_id_catalog || templatesAutorizados[0] || 'prop_elite_1');
  
  // --- ESTADO INTERACTIVO DERECHO (THE THEATER) ---
  // Este ID controla qué url de demo real se carga en el iframe de la derecha
  let theaterPreviewId = $state(selectedTemplateId); 
  let theaterPreviewUrl = $derived(demoUrls[theaterPreviewId] || demoUrls['prop_elite_1']);
  let theaterPreviewName = $derived(catalogTemplates[theaterPreviewId]?.name || 'Luxury Immersive');
  
  let previewMode = $state('tablet'); // 'mobile' o 'tablet'
</script>

<style>
  /* Efecto de borde de selección ámbar */
  .template-card.selected {
    border-color: #f59e0b !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  }

  /* Estilos para Thumbnails Abstractos (Domo Mini) */
  .abstract-thumb {
    @apply w-full h-full rounded-md flex items-center justify-center p-1 relative overflow-hidden;
  }
  
  .immersive { @apply bg-slate-950 border border-slate-800; }
  .video { @apply bg-slate-900 border border-slate-800; }
  .form { @apply bg-zinc-950 border border-zinc-800; }
  .list { @apply bg-slate-50 border border-slate-200; }
</style>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-inner">
        <Palette class="w-7 h-7" />
      </div>
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Apariencia y Marca</h1>
        <p class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Configure la identidad visual corporativa y el catálogo elite</p>
      </div>
    </div>

    <form method="POST" action="?/saveAllDesign" use:enhance={() => { savingDesign = true; return async ({ update, result }) => { savingDesign = false; if(result.type === 'success'){ showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll();} update({ reset: false }); }; }}>
      <input type="hidden" name="template_id_catalog" value={selectedTemplateId}>
      
      <button type="submit" disabled={savingDesign} class="flex items-center gap-2.5 px-8 py-3.5 bg-slate-900 text-white rounded-xl text-sm font-extrabold hover:bg-slate-800 transition-colors shadow-xl disabled:opacity-50 active:scale-[0.98]">
        {#if savingDesign}
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
        {:else}
          <Save class="w-4 h-4 text-amber-400" /> Guardar Configuración Global
        {/if}
      </button>
    </form>
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-[1500px] mx-auto pb-20">

      {#if form?.error}
        <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm" role="alert">
          <AlertCircle class="w-5 h-5" /> Error: {form.error}
        </div>
      {/if}

      {#if showSuccess}
        <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-5 h-5" /> Configuración global de diseño y catálogo actualizada correctamente.
        </div>
      {/if}

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        <div class="xl:col-span-6 space-y-8">
          
          <section class="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 relative z-10">
              <Layers class="w-5 h-5 text-slate-400" />
              <h2 class="text-lg font-black text-slate-900 tracking-tight">1. Identidad del Portal de Agencia</h2>
            </div>
            
            <div class="p-10 text-center flex flex-col items-center gap-5 border-b border-slate-100 bg-zinc-950 shadow-inner relative">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <span class="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 relative z-10">PREVISUALIZACIÓN DE BARRA SUPERIOR</span>
              <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=f59e0b&color=fff`} alt="Logo" class="w-16 h-16 rounded-full border-2 border-white object-cover shadow-2xl relative z-10">
              <span class="text-xs uppercase tracking-[0.3em] font-extrabold text-white relative z-10">{broker.nombre_comercial || 'Inmublia'}</span>
            </div>

            <div class="p-6">
              <p class="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">El logotipo corporativo y nombre comercial se muestran en la barra superior de su portal de propiedades y en las cabeceras de las Smart Brochures. (Modificable en Perfil).</p>
            </div>
          </section>

          <section class="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden relative border-l-4 border-l-amber-500">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-3">
                <LayoutGrid class="w-5 h-5 text-slate-400" />
                <h2 class="text-lg font-black text-slate-900 tracking-tight">2. Catálogo de Diseños Elite (Propiedades)</h2>
              </div>
              <span class="text-[9px] font-black px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest">
                 {templatesAutorizados.length} Disponibles
              </span>
            </div>

            <div class="p-6">
              <p class="text-xs font-medium text-slate-500 mb-6 leading-relaxed">Seleccione la plantilla principal que se aplicará por defecto a todas las propiedades individuales de su catálogo. Previsualice el diseño real a la derecha.</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {#each authorizedCatalog as template}
                  <button 
                    onclick={() => { selectedTemplateId = template.id; theaterPreviewId = template.id; }} 
                    class="template-card flex flex-col bg-white p-3.5 rounded-2xl border-2 transition-all text-left group border-slate-100 hover:border-amber-200 hover:shadow-md active:scale-[0.98]"
                    class:selected={selectedTemplateId === template.id}
                  >
                    <div class="w-full h-20 rounded-lg overflow-hidden mb-3.5 shadow-inner relative transition-colors" class:group-hover:bg-zinc-950={template.thumbnailType !== 'list'}>
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <span class="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 text-white z-10 transition-opacity" class:opacity-0={selectedTemplateId === template.id}>
                        <Eye class="w-3 h-3" />
                      </span>
                      
                      {#if template.thumbnailType === 'immersive'}
                         <div class="abstract-thumb immersive">
                           <div class="w-12 h-12 bg-white/10 rounded-full border border-white/20"></div>
                         </div>
                      {:else if template.thumbnailType === 'video'}
                         <div class="abstract-thumb video">
                           <div class="w-full h-full border-2 border-dashed border-white/10 rounded"></div>
                         </div>
                      {:else if template.thumbnailType === 'form'}
                         <div class="abstract-thumb form">
                           <div class="w-3/4 h-3/4 bg-white/10 rounded p-1.5 flex flex-col gap-1">
                             <div class="w-full h-1.5 bg-white/20 rounded"></div>
                             <div class="w-full h-1.5 bg-white/20 rounded"></div>
                           </div>
                         </div>
                      {:else}
                         <div class="abstract-thumb list">
                           <div class="w-full h-full bg-slate-900/10 rounded"></div>
                         </div>
                      {/if}
                    </div>
                    
                    <h4 class="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">{template.name}</h4>
                    <p class="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed flex-1 truncate">{template.desc}</p>
                    
                    <div class="mt-3.5 flex items-center justify-between w-full">
                       <span class="text-[9px] font-black uppercase tracking-widest text-indigo-600 group-hover:text-amber-700 transition-colors">
                         {#if selectedTemplateId === template.id} Selección Actual {:else} Ver Diseño {/if}
                       </span>
                       {#if selectedTemplateId === template.id}
                          <CheckCircle2 class="w-4 h-4 text-amber-500 shrink-0" />
                       {/if}
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          </section>
        </div>

        <div class="xl:col-span-6">
          <section class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-10">
            
            <div class="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent"></div>
                  <Eye class="w-4 h-4 relative z-10" />
                </div>
                <div>
                  <h3 class="text-sm font-black text-slate-900 tracking-tight">Estudio Interactivo</h3>
                  <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">{theaterPreviewName}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200 shadow-inner relative overflow-hidden">
                <button onclick={() => previewMode = 'tablet'} class="p-2.5 rounded-lg text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'tablet'} class:text-emerald-700={previewMode === 'tablet'} class:shadow-sm={previewMode === 'tablet'} title="Vista Tablet / Desktop">
                  <Tablet class="w-4 h-4" />
                </button>
                <button onclick={() => previewMode = 'mobile'} class="p-2.5 rounded-lg text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'mobile'} class:text-emerald-700={previewMode === 'mobile'} class:shadow-sm={previewMode === 'mobile'} title="Vista Móvil">
                  <Smartphone class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="p-6 md:p-8 flex flex-col items-center bg-slate-900 min-h-[600px] shadow-inner relative overflow-hidden">
              
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
                  src={theaterPreviewUrl} 
                  title="Vista previa real"
                  class="w-full h-full border-0 absolute inset-0 z-10 transition-opacity duration-500 bg-white"
                  loading="lazy"
                ></iframe>
              </div>

              {#if !theaterPreviewUrl}
                <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-12 text-center text-slate-400 z-30">
                  <div class="max-w-xs">
                     <AlertCircle class="w-10 h-10 mx-auto mb-4 text-slate-600" />
                     <p class="text-sm font-medium">Previsualización no disponible para este diseño en este momento.</p>
                  </div>
                </div>
              {/if}

            </div>
          </section>
        </div>

      </div>
    </div>
  </div>
</main>
