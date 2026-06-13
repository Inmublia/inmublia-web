<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutTemplate, Smartphone } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplateId = $state(broker.template_seleccionado || 'classic');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  // --- MAPA MAESTRO DE DEMOS ---
  const demoUrls = {
    'classic': 'https://demo.inmublia.com/template-classic',
    'clean': 'https://demo.inmublia.com/template-clean',
    'modern': 'https://demo.inmublia.com/template-modern',
    'editorial': 'https://demo.inmublia.com/template-editorial',
    'luxury': 'https://demo.inmublia.com/template-luxury',
    'cinematic': 'https://demo.inmublia.com/template-cinematic',
    'prop_basic_1': 'https://demo.inmublia.com/demo-property-basic1',
    'prop_basic_2': 'https://demo.inmublia.com/demo-property-basic2',
    'prop_pro_1': 'https://demo.inmublia.com/demo-property-pro1',
    'prop_pro_2': 'https://demo.inmublia.com/demo-property-pro2',
    'prop_pro_3': 'https://demo.inmublia.com/demo-property-pro3',
    'prop_elite_1': 'https://demo.inmublia.com/demo-property-elite1',
    'prop_elite_2': 'https://demo.inmublia.com/demo-property-elite2',
    'prop_elite_3': 'https://demo.inmublia.com/demo-property-elite3',
    'prop_elite_4': 'https://demo.inmublia.com/demo-property-elite4'
  };

  // 1. CATÁLOGO GLOBAL DE AGENCIA (Las 6 originales) - ESTAS SE GUARDAN
  const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  // 2. GALERÍA DE SMART BROCHURES (Las 9 de propiedades) - SOLO EXHIBICIÓN
  const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería horizontal.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky agresivo.', minPlan: 'pro', thumbType: 'form' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel independiente vertical.', minPlan: 'pro', thumbType: 'immersive' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Revista de arquitectura (Serif).', minPlan: 'pro', thumbType: 'immersive' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism sobre fondo.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video hero en bucle continuo.', minPlan: 'elite', thumbType: 'video' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Neo-brutalismo oscuro y bronce.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Matterport interactivo de fondo.', minPlan: 'elite', thumbType: 'video' }
  ];

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<style>
  .template-card.selected {
    border-color: #6366f1 !important; /* indigo-500 */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    background-color: #e0e7ff; /* indigo-50 */
  }
</style>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-3 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <Palette class="w-6 h-6 text-amber-400" />
      </div>
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">Design Studio</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-slate-800 uppercase">{planSuscripcion}</span>
        </p>
      </div>
    </div>

    <div class="relative z-10">
        <form method="POST" action="?/updateTemplate" use:enhance={() => {
            savingProfile = true;
            return async ({ update, result }) => {
                savingProfile = false;
                if (result.type === 'failure') alert("❌ Error: " + (result.data?.error || "Desconocido"));
                else if (result.type === 'success') { showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll(); }
                update({ reset: false });
            };
        }}>
            <input type="hidden" name="template_seleccionado" value={selectedTemplateId}>
            <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3.5 px-8 rounded-xl shadow-md flex items-center gap-2.5 transition-all text-sm active:scale-95">
                {#if savingProfile}
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
                {:else}
                    <Save class="w-4 h-4 text-amber-400" /> Guardar Portal de Agencia
                {/if}
            </button>
        </form>
    </div>
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-6xl mx-auto space-y-12">

      {#if form?.error}
         <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 shadow-sm" role="alert">
           <AlertCircle class="w-4 h-4" /> {form.error}
         </div>
      {/if}
      
      {#if showSuccess}
        <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-4 h-4" /> Diseño global de agencia actualizado.
        </div>
      {/if}

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-6">
        <div class="w-20 h-20 rounded-full border-4 border-slate-100 shadow-md overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Identidad de Marca</h2>
          <p class="text-xl font-black text-slate-900 mb-2">{broker.nombre_comercial || 'Mi Agencia Inmobiliaria'}</p>
          <p class="text-xs text-slate-500">Este logo y nombre se mostrarán en todos sus catálogos. (Modificable en la pestaña de Perfil).</p>
        </div>
      </div>

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 border-l-4 border-l-amber-500">
        <div class="mb-8 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-5 h-5 text-indigo-500" />
            1. Diseño del Portal de Agencia
          </h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Seleccione la interfaz principal donde los clientes verán todo su inventario público.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = puedeUsar(template.minPlan)}
            {@const activo = selectedTemplateId === template.id}
            
            <label class="template-card relative flex flex-col bg-white border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 {activo ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplateId} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-28 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative group overflow-hidden">
                {#if template.id === 'classic' || template.id === 'clean'}
                  <div class="w-full h-full bg-slate-50 flex flex-col p-4">
                     <div class="w-1/2 h-2 bg-slate-300 rounded mb-2"></div>
                     <div class="w-full h-full bg-slate-200 rounded"></div>
                  </div>
                {:else if template.id === 'modern' || template.id === 'editorial'}
                  <div class="w-full h-full bg-slate-50 flex gap-2 p-2">
                     <div class="w-2/3 h-full bg-slate-300 rounded"></div>
                     <div class="w-1/3 h-full bg-slate-200 rounded"></div>
                  </div>
                {:else}
                  <div class="w-full h-full bg-slate-800 flex items-center justify-center">
                     <div class="w-1/2 h-4 bg-white/20 rounded-full"></div>
                  </div>
                {/if}

                <a href={demoUrls[template.id]} target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10" onclick={(e) => e.stopPropagation()}>
                  <Eye class="w-5 h-5 mb-1" /> Ver Demo Completo
                </a>
              </div>
              
              <div class="p-5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-black text-sm {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-200 text-slate-600">
                       🔒 {template.minPlan}
                    </span>
                  {:else if activo}
                    <CheckCircle2 class="w-5 h-5 text-indigo-600" />
                  {/if}
                </div>
                <p class="text-[11px] text-slate-500 font-medium leading-relaxed">{template.desc}</p>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <div class="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/4 -translate-y-1/4"></div>
        
        <div class="mb-8 border-b border-slate-800 pb-4 relative z-10">
          <h3 class="text-lg font-black text-white flex items-center gap-2">
            <Smartphone class="w-5 h-5 text-indigo-400" />
            2. Arsenal de Smart Brochures
          </h3>
          <p class="text-xs font-medium text-slate-400 mt-1">Estos diseños se aplican individualmente en cada propiedad de su inventario. (Modo exhibición).</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            
            <div class="relative bg-slate-800/50 border border-slate-700 rounded-2xl flex flex-col overflow-hidden {!autorizado ? 'opacity-40 grayscale' : 'hover:border-indigo-400 hover:shadow-lg transition-all group'}">
              
              <div class="h-20 bg-slate-950 flex flex-col items-center justify-center relative p-3">
                
                <div class="w-full h-full rounded-md flex items-center justify-center relative overflow-hidden {propTemplate.thumbType === 'immersive' ? 'bg-slate-900 border border-slate-800' : propTemplate.thumbType === 'video' ? 'bg-slate-950 border border-slate-800' : propTemplate.thumbType === 'form' ? 'bg-black border border-zinc-900' : 'bg-slate-50 border border-slate-200'}">
                  {#if propTemplate.thumbType === 'immersive'}
                    <div class="w-8 h-8 bg-white/10 rounded-full border border-white/20"></div>
                  {:else if propTemplate.thumbType === 'video'}
                    <div class="w-full h-full border-2 border-dashed border-white/10 rounded"></div>
                  {:else if propTemplate.thumbType === 'form'}
                    <div class="w-2/3 h-2/3 bg-white/10 rounded p-1 flex flex-col gap-0.5">
                      <div class="w-full h-1 bg-white/20 rounded"></div>
                    </div>
                  {/if}
                </div>

                <a href={demoUrls[propTemplate.id] || 'https://demo.inmublia.com'} target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-indigo-900/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
                  <span class="text-white font-bold text-[10px] uppercase tracking-widest border border-white/30 px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5"><Eye class="w-3.5 h-3.5" /> Preview</span>
                </a>
              </div>
              
              <div class="p-5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-sm text-white truncate pr-2">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-800 text-slate-500 shrink-0">
                       🔒 {propTemplate.minPlan}
                    </span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                       ✓ {propTemplate.minPlan}
                    </span>
                  {/if}
                </div>
                <p class="text-[10px] text-slate-400 font-medium leading-relaxed">{propTemplate.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
