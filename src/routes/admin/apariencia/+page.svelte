<script>
  // ==========================================
  // INMUBLIA ADMIN: THE DESIGN SANCTUARY
  // ==========================================
  import { enhance } from '$app/forms';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutGrid, Tablet, Smartphone } from 'lucide-svelte';
  import AdminLayout from '$lib/components/AdminLayout.svelte';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  // 🔥 CANDADO DE NEGOCIO: Solo templates autorizados por el plan ELITE
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['prop_elite_1'] });
  let templatesAutorizados = $derived(planConfig.templates_autorizados);

  let savingDesign = $state(false);

  // --- LÓGICA DE PREVISUALIZACIÓN DINÁMICA DE BROCHURES ---
  // Mapa de miniaturas y previews reales para datos demo
  const catalogTemplates = {
    'prop_elite_1': { 
      name: 'Luxury Immersive', 
      desc: 'Glassmorphism sobre fondo fijo al 100%.',
      demoUrl: 'https://demo.inmublia.com/demo-property-elite1' // Url de demo real de Inmublia
    },
    'prop_elite_2': { 
      name: 'Cinematic Tour', 
      desc: 'Video hero en bucle como fondo inmersivo.',
      demoUrl: 'https://demo.inmublia.com/demo-property-elite2'
    },
    'prop_elite_3': { 
      name: 'Prestige Dark', 
      desc: 'Estética neo-brutalista en negro y bronce.',
      demoUrl: 'https://demo.inmublia.com/demo-property-elite3'
    },
    'prop_elite_4': { 
      name: 'Panoramic 3D', 
      desc: 'Matterport 3D como protagonista absoluto.',
      demoUrl: 'https://demo.inmublia.com/demo-property-elite4'
    }
  };

  // Filtramos el catálogo para mostrar solo los autorizados
  let authorizedCatalog = $derived(
    Object.entries(catalogTemplates)
      .filter(([id]) => templatesAutorizados.includes(id))
      .map(([id, data]) => ({ id, ...data }))
  );

  // Estado para la previsualización del catálogo
  // Fallback si no hay plantilla elegida -> la primera autorizada
  let selectedTemplateId = $state(broker.template_id_catalog || templatesAutorizados[0] || 'prop_elite_1');
  let selectedTemplateData = $derived(catalogTemplates[selectedTemplateId]);
  let previewMode = $state('tablet'); // 'mobile' o 'tablet'
</script>

<style>
  /* Efecto de borde de selección ámbar */
  .template-card.selected {
    border-color: #f59e0b !important;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  }
</style>

<AdminLayout title="Santuario de Diseño" broker={broker}>
  
  <header class="sticky top-[73px] bg-white border-b border-slate-200 p-6 z-40 mb-8 -mx-6 shadow-sm flex items-center justify-between">
    <div class="flex items-center gap-3.5">
      <div class="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-inner">
        <Palette class="w-7 h-7" />
      </div>
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">Apariencia y Marca</h1>
        <p class="text-slate-500 text-sm font-medium mt-1">Defina la identidad de su portal inmobiliario y el estilo de sus Smart Brochures Elite.</p>
      </div>
    </div>

    <form method="POST" action="?/saveAllDesign" use:enhance={() => { savingDesign = true; return async ({ update }) => { savingDesign = false; update(); }; }}>
      <input type="hidden" name="template_id_catalog" value={selectedTemplateId}>
      
      <button type="submit" disabled={savingDesign} class="flex items-center gap-2.5 px-7 py-3.5 bg-amber-500 text-white rounded-xl text-sm font-extrabold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30 disabled:opacity-50 active:scale-[0.98]">
        {#if savingDesign}
          Procesando...
        {:else}
          <Save class="w-4 h-4" /> Guardar Configuración de Diseño
        {/if}
      </button>
    </form>
  </header>

  {#if form?.success}
    <div class="p-5 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" role="alert">
      <CheckCircle2 class="w-5 h-5" /> Configuración de diseño y catálogo actualizada correctamente.
    </div>
  {:else if form?.error}
    <div class="p-5 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-rose-500/10 text-rose-600 border border-rose-500/20" role="alert">
      <AlertCircle class="w-5 h-5" /> Error: {form.error}
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
    
    <div class="lg:col-span-6 space-y-10">
      
      <section class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-8 border-b border-slate-200 flex items-center gap-3">
          <Layers class="w-5 h-5 text-slate-400" />
          <h2 class="text-xl font-black text-slate-900 tracking-tight">Identidad del Portal Corporativo</h2>
        </div>
        
        <div class="p-10 text-center flex flex-col items-center gap-6 border-b border-slate-100 bg-zinc-950 shadow-inner">
          <span class="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">PREVISUALIZACIÓN DE BARRA SUPERIOR</span>
          <img src={broker.avatar_url || 'https://ui-avatars.com/api/?name=Inmublia&background=f59e0b&color=fff'} alt="Logo" class="w-20 h-20 rounded-full border-4 border-white object-cover shadow-xl">
          <span class="text-xs uppercase tracking-[0.3em] font-extrabold text-white">{broker.nombre_comercial || 'Inmublia'}</span>
        </div>

        <div class="p-8">
          <p class="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">Arrastre y suelte su logotipo corporativo (formato PNG transparente recomendado, máx 1MB). Este se mostrará en la barra superior de su portal de propiedades y en las cabeceras de las Smart Brochures.</p>
          
          <div class="w-full">
            <input type="text" value={broker.nombre_comercial || ''} placeholder="Nombre Comercial (ej. Inmublia Exclusivas)" class="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium focus:border-amber-400 focus:ring-amber-200 transition-colors" readonly>
            <p class="text-[10px] font-semibold text-slate-400 mt-1.5 ml-1">Vea el perfil para cambiar el nombre comercial.</p>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-8 border-b border-slate-200 flex items-center gap-3">
          <LayoutGrid class="w-5 h-5 text-slate-400" />
          <h2 class="text-xl font-black text-slate-900 tracking-tight">Configuración del Catálogo Elite</h2>
        </div>

        <div class="p-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each authorizedCatalog as template}
              <button 
                onclick={() => selectedTemplateId = template.id} 
                class="template-card flex flex-col bg-white p-5 rounded-[2rem] border-2 border-slate-100 transition-all text-left group hover:border-amber-200 hover:shadow-lg active:scale-[0.98]"
                class:selected={selectedTemplateId === template.id}
              >
                <div class="w-full h-32 bg-slate-950 rounded-xl mb-4 overflow-hidden shadow-inner flex items-center justify-center p-2 relative">
                  <span class="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye class="w-4 h-4" />
                  </span>
                  <div class="w-24 h-24 bg-white/10 rounded-full border border-white/20 shadow-xl flex items-center justify-center text-white/50 text-xs font-black uppercase tracking-widest">{template.name.split(' ')[0]}</div>
                </div>
                
                <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">{template.name}</h4>
                <p class="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed flex-1">{template.desc}</p>
                
                <span class="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <Palette class="w-3.5 h-3.5" /> Seleccionar plantilla
                </span>
              </button>
            {/each}
          </div>
        </div>
      </section>
    </div>

    <div class="lg:col-span-6">
      <section class="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden sticky top-[180px]">
        
        <div class="p-6 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-inner">
              <Eye class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-black text-slate-900 tracking-tight">Previsualización del Catálogo</h3>
              <p class="text-[11px] font-semibold text-amber-600 mt-0.5">Viendo Plantilla: {selectedTemplateData.name}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
            <button onclick={() => previewMode = 'tablet'} class="p-2.5 rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900" class:bg-amber-100={previewMode === 'tablet'} class:text-amber-700={previewMode === 'tablet'}>
              <Tablet class="w-4 h-4" />
            </button>
            <button onclick={() => previewMode = 'mobile'} class="p-2.5 rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900" class:bg-amber-100={previewMode === 'mobile'} class:text-amber-700={previewMode === 'mobile'}>
              <Smartphone class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="p-8 md:p-12 text-center flex flex-col items-center bg-slate-900 min-h-[600px] shadow-inner relative">
          
          <div 
            class="mockup-frame border-[12px] border-black rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ease-in-out relative bg-white"
            class:w-[360px]={previewMode === 'mobile'} class:h-[640px]={previewMode === 'mobile'}
            class:w-[500px]={previewMode === 'tablet'} class:h-[660px]={previewMode === 'tablet'}
          >
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-xl z-20"></div>

            <iframe 
              src={selectedTemplateData.demoUrl} 
              title="Vista previa real"
              class="w-full h-full border-0 absolute inset-0 z-10"
              loading="lazy"
            ></iframe>
          </div>

          {#if !selectedTemplateData.demoUrl}
            <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-12 text-center text-slate-500">
              Elija una plantilla del catálogo a la izquierda para cargar la previsualización interactiva aquí.
            </div>
          {/if}

        </div>
      </section>
    </div>

  </div>
</AdminLayout>
