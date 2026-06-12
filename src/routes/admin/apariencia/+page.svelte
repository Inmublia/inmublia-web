<script>
  // ==========================================
  // INMUBLIA ADMIN: THE DESIGN SANCTUARY
  // ==========================================
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutGrid, Tablet, Smartphone } from 'lucide-svelte';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  // 🔥 CANDADO DE NEGOCIO: Solo templates autorizados por el plan ELITE
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['prop_elite_1'] });
  let templatesAutorizados = $derived(planConfig.templates_autorizados);

  let savingDesign = $state(false);
  let showSuccess = $state(false);

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

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4">
      <div class="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-inner">
        <Palette class="w-6 h-6" />
      </div>
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Apariencia y Marca</h1>
        <p class="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Defina el estilo visual de sus Smart Brochures</p>
      </div>
    </div>

    <form method="POST" action="?/updateTemplate" use:enhance={() => { savingDesign = true; return async ({ update, result }) => { savingDesign = false; if(result.type === 'success'){ showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll();} update({ reset: false }); }; }}>
      <input type="hidden" name="template_seleccionado" value={selectedTemplateId}>
      
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
    <div class="max-w-[1400px] mx-auto">

      {#if form?.error}
        <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-rose-500/10 text-rose-600 border border-rose-500/20 shadow-sm" role="alert">
          <AlertCircle class="w-5 h-5" /> Error: {form.error}
        </div>
      {/if}

      {#if showSuccess}
        <div class="p-4 rounded-2xl font-bold mb-8 text-sm flex items-center gap-3 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-5 h-5" /> Configuración de diseño y catálogo actualizada correctamente.
        </div>
      {/if}

      <div class="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        <div class="xl:col-span-6 space-y-8">
          
          <section class="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <Layers class="w-5 h-5 text-slate-400" />
              <h2 class="text-lg font-black text-slate-900 tracking-tight">Identidad del Portal Corporativo</h2>
            </div>
            
            <div class="p-8 text-center flex flex-col items-center gap-5 border-b border-slate-100 bg-zinc-950 shadow-inner relative">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <span class="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 relative z-10">PREVISUALIZACIÓN DE BARRA SUPERIOR</span>
              <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'Inmublia'}&background=f59e0b&color=fff`} alt="Logo" class="w-16 h-16 rounded-full border-2 border-white object-cover shadow-2xl relative z-10">
              <span class="text-xs uppercase tracking-[0.3em] font-extrabold text-white relative z-10">{broker.nombre_comercial || 'Inmublia'}</span>
            </div>

            <div class="p-6">
              <p class="text-xs font-semibold text-slate-500 mb-4 leading-relaxed">El logotipo corporativo y nombre comercial se muestran en la barra superior de su portal de propiedades y en las cabeceras de las Smart Brochures.</p>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Nota del Sistema</p>
                 <p class="text-xs font-medium text-slate-700">Para cambiar el logotipo o nombre comercial, diríjase al módulo de <strong>Configuración / Perfil</strong> en el menú lateral.</p>
              </div>
            </div>
          </section>

          <section class="bg-white rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div class="flex items-center gap-3">
                <LayoutGrid class="w-5 h-5 text-slate-400" />
                <h2 class="text-lg font-black text-slate-900 tracking-tight">Catálogo de Diseños Inmobiliarios</h2>
              </div>
              <span class="text-[9px] font-black px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-widest">
                 {templatesAutorizados.length} Disponibles
              </span>
            </div>

            <div class="p-6">
              <p class="text-xs font-medium text-slate-500 mb-6">Seleccione la plantilla principal que se aplicará por defecto a sus nuevas propiedades. Podrá previsualizar el diseño en tiempo real en el panel derecho.</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {#each authorizedCatalog as template}
                  <button 
                    onclick={() => selectedTemplateId = template.id} 
                    class="template-card flex flex-col bg-white p-4 rounded-2xl border-2 border-slate-100 transition-all text-left group hover:border-amber-200 hover:shadow-md active:scale-[0.98]"
                    class:selected={selectedTemplateId === template.id}
                  >
                    <div class="w-full h-28 bg-slate-900 rounded-xl mb-4 overflow-hidden shadow-inner flex flex-col items-center justify-center p-2 relative group-hover:bg-black transition-colors">
                      <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                      <span class="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 backdrop-blur-md">
                        <Eye class="w-3.5 h-3.5" />
                      </span>
                      <LayoutGrid class="w-8 h-8 text-white/20 mb-2 relative z-10" />
                      <div class="text-white/80 text-[10px] font-black uppercase tracking-[0.2em] relative z-10 text-center">{template.name.split(' ')[0]}</div>
                    </div>
                    
                    <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors mb-1">{template.name}</h4>
                    <p class="text-[11px] font-medium text-slate-500 leading-relaxed flex-1">{template.desc}</p>
                    
                    <div class="mt-4 flex items-center justify-between w-full">
                       <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                         {#if selectedTemplateId === template.id} Seleccionada {:else} Elegir plantilla {/if}
                       </span>
                       {#if selectedTemplateId === template.id}
                          <CheckCircle2 class="w-4 h-4 text-amber-500" />
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
            
            <div class="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
              <div class="flex items-center gap-3">
                <div class="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  <Eye class="w-4 h-4" />
                </div>
                <div>
                  <h3 class="text-sm font-black text-slate-900 tracking-tight">Estudio de Previsualización</h3>
                  <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{selectedTemplateData.name}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-1 bg-slate-200/50 p-1 rounded-lg border border-slate-200">
                <button onclick={() => previewMode = 'tablet'} class="p-2 rounded-md text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'tablet'} class:text-indigo-600={previewMode === 'tablet'} class:shadow-sm={previewMode === 'tablet'} title="Vista Tablet / Desktop">
                  <Tablet class="w-4 h-4" />
                </button>
                <button onclick={() => previewMode = 'mobile'} class="p-2 rounded-md text-slate-400 transition-colors hover:text-slate-900" class:bg-white={previewMode === 'mobile'} class:text-indigo-600={previewMode === 'mobile'} class:shadow-sm={previewMode === 'mobile'} title="Vista Móvil">
                  <Smartphone class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="p-6 md:p-8 flex flex-col items-center justify-center bg-slate-900 min-h-[600px] shadow-inner relative overflow-hidden">
              
              <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
              
              <div 
                class="border-[8px] md:border-[12px] border-black rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative bg-zinc-950"
                class:w-[320px]={previewMode === 'mobile'} class:h-[580px]={previewMode === 'mobile'}
                class:w-full={previewMode === 'tablet'} class:max-w-[600px]={previewMode === 'tablet'} class:h-[600px]={previewMode === 'tablet'}
              >
                {#if previewMode === 'mobile'}
                   <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-20 transition-all"></div>
                {/if}

                <iframe 
                  src={selectedTemplateData.demoUrl} 
                  title="Vista previa real"
                  class="w-full h-full border-0 absolute inset-0 z-10 transition-opacity duration-500"
                  loading="lazy"
                ></iframe>
              </div>

              {#if !selectedTemplateData.demoUrl}
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
