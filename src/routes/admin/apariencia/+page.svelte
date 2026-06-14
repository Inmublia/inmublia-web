<script module>
  // Catálogo unificado con planes mínimos explícitos
  export const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  export const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa y optimizada.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque limpio en la galería de imágenes.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky optimizado para captura.', minPlan: 'pro', thumbType: 'form' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel vertical contemporáneo.', minPlan: 'pro', thumbType: 'split' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Revista de arquitectura elegante.', minPlan: 'pro', thumbType: 'immersive' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism premium sobre fondo.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video de fondo con interfaz limpia integrada.', minPlan: 'elite', thumbType: 'video' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Estética neo-brutalista en negro y bronce.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Integración fluida para recorridos virtuales.', minPlan: 'elite', thumbType: 'video' }
  ];
</script>

<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Palette, Eye, LayoutTemplate, Smartphone, ShieldCheck, Lock } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  // Vinculación reactiva bidireccional limpia para persistir ambas opciones
  let selectedTemplate = $state(broker.template_seleccionado || 'classic');
  let selectedLanding = $state(broker.template_id_catalog || 'prop_basic_1');

  let subdominio = $derived(broker.subdominio || 'demo');
  let previewSlug = $derived(data.previewSlug || 'propiedad-demo');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <Palette class="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Design Studio</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Cuenta: <span class="text-slate-800 uppercase">{planSuscripcion}</span>
        </p>
      </div>
    </div>

    <div>
      <form method="POST" action="?/updateTemplate" use:enhance={() => {
        savingProfile = true;
        return async ({ update, result }) => {
          savingProfile = false;
          if (result.type === 'failure') alert("❌ Error: " + (result.data?.error || "Desconocido"));
          else if (result.type === 'success') { showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll(); }
          update({ reset: false });
        };
      }}>
        <input type="hidden" name="template_seleccionado" value={selectedTemplate}>
        <input type="hidden" name="template_id_catalog" value={selectedLanding}>
        
        <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center gap-2 transition-all text-sm cursor-pointer active:scale-95">
          {#if savingProfile}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
          {:else}
            <Save class="w-4 h-4 text-amber-400" /> Guardar Configuración Global
          {/if}
        </button>
      </form>
    </div>
  </header>

  <div class="p-6 md:p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-6xl mx-auto space-y-8">

      {#if form?.error}
        <div class="p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 shadow-sm">
          <AlertCircle class="w-4 h-4" /> {form.error}
        </div>
      {/if}
      
      {#if showSuccess}
        <div class="p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <CheckCircle2 class="w-4 h-4" /> Configuración visual actualizada con éxito.
        </div>
      {/if}

      <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
        <div class="w-14 h-14 rounded-full border-2 border-slate-100 shadow-sm overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Identidad Corporativa</h2>
          <p class="text-base font-black text-slate-900 leading-tight">{broker.nombre_comercial || 'Inmublia Showcase'}</p>
        </div>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
        <div class="mb-5 flex flex-col gap-1">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-4 h-4 text-amber-500" />
            1. Interfaz Base de la Agencia
          </h3>
          <p class="text-[11px] font-medium text-slate-500 leading-relaxed">Determine la maqueta global para desplegar el catálogo general con todas sus propiedades públicas.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each catalogoGlobal as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = selectedTemplate === template.id}
            
            <label class="relative flex flex-col bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 {activo ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-md bg-amber-50/10' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-20 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center relative group overflow-hidden">
                {#if template.id === 'classic' || template.id === 'clean'}
                  <div class="w-full h-full bg-slate-50 flex flex-col p-3 select-none opacity-80">
                     <div class="w-1/3 h-1 bg-slate-300 rounded mb-1"></div>
                     <div class="w-full h-full bg-slate-200 rounded"></div>
                  </div>
                {:else if template.id === 'modern' || template.id === 'editorial'}
                  <div class="w-full h-full bg-slate-50 flex gap-1 p-2 select-none opacity-80">
                     <div class="w-3/5 h-full bg-slate-300 rounded"></div>
                     <div class="w-2/5 h-full bg-slate-200 rounded"></div>
                  </div>
                {:else}
                  <div class="w-full h-full bg-slate-800 flex items-center justify-center select-none">
                     <div class="w-1/3 h-2 bg-white/20 rounded-full"></div>
                  </div>
                {/if}

                <a href="https://{subdominio}.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center gap-1 text-white font-bold text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10" onclick={(e) => e.stopPropagation()}>
                  <Eye class="w-3.5 h-3.5" /> Ver Ejemplo
                </a>
              </div>
              
              <div class="p-3.5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-extrabold text-xs tracking-tight {activo ? 'text-amber-800' : 'text-slate-900'}">{template.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 uppercase flex items-center gap-1 shrink-0"><Lock class="w-2 h-2"/> Plan {template.minPlan}</span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest {activo ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'} shrink-0">
                      ✓ Plan {template.minPlan}
                    </span>
                  {/if}
                </div>
                <div class="flex items-center justify-between mt-auto">
                   <p class="text-[10px] text-slate-500 leading-tight font-medium line-clamp-1 pr-2">{template.desc}</p>
                   {#if activo}
                     <CheckCircle2 class="w-4 h-4 text-amber-500 shrink-0" />
                   {/if}
                </div>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-slate-900">
        <div class="mb-5 flex flex-col gap-1">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-slate-900" />
            2. Diseños Base de Landing Pages para Propiedades
          </h3>
          <p class="text-[11px] font-medium text-slate-500 leading-relaxed">Seleccione la plantilla predeterminada para las nuevas propiedades de su inventario. El diseño puede modificarse de forma individual en la consola de cada propiedad.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            {@const activoLanding = selectedLanding === propTemplate.id}
            
            <label class="relative flex flex-col bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 {activoLanding ? 'border-amber-500 bg-amber-50/30 shadow-md ring-2 ring-amber-500/10' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-40 bg-slate-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="landing_radio" bind:group={selectedLanding} value={propTemplate.id} disabled={!autorizado} class="hidden">
              
              <div class="h-16 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center relative p-2 group overflow-hidden">
                <div class="w-full h-full rounded border border-slate-200 flex overflow-hidden opacity-70 {propTemplate.thumbType === 'immersive' ? 'bg-slate-200' : propTemplate.thumbType === 'video' ? 'bg-slate-300' : 'bg-white'}">
                  {#if propTemplate.thumbType === 'immersive'}
                    <div class="w-full h-full flex items-center justify-center relative">
                      <div class="m-auto w-5 h-5 bg-slate-400 rounded-full border border-slate-300"></div>
                    </div>
                  {:else if propTemplate.thumbType === 'video'}
                    <div class="w-full h-full flex items-center justify-center relative">
                      <div class="w-full h-full border border-dashed border-slate-400 rounded opacity-50 m-auto"></div>
                    </div>
                  {:else if propTemplate.thumbType === 'form'}
                    <div class="flex flex-row gap-1.5 w-full h-full p-1.5 bg-slate-50">
                      <div class="w-2/3 h-full bg-slate-200 rounded-xs"></div>
                      <div class="w-1/3 h-full bg-slate-300 rounded-xs p-0.5 flex flex-col gap-0.5">
                        <div class="w-full h-0.5 bg-slate-400"></div>
                        <div class="w-full h-1 bg-amber-500 mt-auto"></div>
                      </div>
                    </div>
                  {:else}
                    <div class="flex flex-col gap-0.5 w-full h-full p-1.5 bg-slate-50">
                      <div class="w-1/2 h-1 bg-slate-400 rounded-xs mb-0.5"></div>
                      <div class="w-full h-full bg-slate-200 rounded-xs"></div>
                    </div>
                  {/if}
                </div>

                {#if autorizado}
                  <a href="https://{subdominio}.inmublia.com/{previewSlug}?template={propTemplate.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer" onclick={(e) => e.stopPropagation()}>
                    <span class="text-white font-bold text-[9px] uppercase tracking-widest border border-white/20 px-3 py-1 rounded flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                      <Eye class="w-3.5 h-3.5 text-amber-400" /> Ver Demo Real
                    </span>
                  </a>
                {/if}
              </div>
              
              <div class="p-3.5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-extrabold text-xs tracking-tight {activoLanding ? 'text-amber-800' : 'text-slate-900'}">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 uppercase flex items-center gap-1 shrink-0"><Lock class="w-2 h-2"/> Plan {propTemplate.minPlan}</span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest {activoLanding ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'} shrink-0">
                      ✓ Plan {propTemplate.minPlan}
                    </span>
                  {/if}
                </div>
                <div class="flex items-center justify-between mt-auto">
                   <p class="text-[10px] text-slate-500 leading-tight font-medium line-clamp-1 pr-2">{propTemplate.desc}</p>
                   {#if activoLanding}
                     <CheckCircle2 class="w-4 h-4 text-amber-500 shrink-0" />
                   {/if}
                </div>
              </div>
            </label>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
