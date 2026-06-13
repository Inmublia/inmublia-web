<script module>
  // 1. CATÁLOGO GLOBAL DE AGENCIA (Las 6 originales) - SE GUARDAN EN BD
  export const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  // 2. GALERÍA DE TEMPLATES DE PROPIEDADES - SOLO EXHIBICIÓN INTERACTIVA
  export const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa y optimizada.', minPlan: 'basico' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque limpio en la galería de imágenes.', minPlan: 'basico' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky optimizado para captura.', minPlan: 'pro' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel vertical contemporáneo.', minPlan: 'pro' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Estilo de revista de arquitectura (Fuentes Serif).', minPlan: 'pro' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism premium sobre fondo.', minPlan: 'elite' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video de fondo con interfaz limpia integrada.', minPlan: 'elite' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Estética neo-brutalista selecta en negro y bronce.', minPlan: 'elite' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Integración fluida para recorridos virtuales.', minPlan: 'elite' }
  ];
</script>

<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutTemplate, Smartphone, ShieldCheck } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplate = $state(broker.template_seleccionado || 'classic');

  // Resolvedores directos desde la BD (Load function)
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

<style>
  .template-card.selected {
    border-color: #6366f1 !important; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    background-color: #e0e7ff; 
  }
</style>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4 relative z-10">
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
        <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center gap-2 transition-all text-sm active:scale-95">
          {#if savingProfile}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
          {:else}
            <Save class="w-4 h-4 text-amber-400" /> Guardar Portal de Agencia
          {/if}
        </button>
      </form>
    </div>
  </header>

  <div class="p-8 md:p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-6xl mx-auto space-y-10">

      {#if form?.error}
        <div class="p-4 rounded-xl text-sm font-bold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 shadow-sm" role="alert">
          <AlertCircle class="w-5 h-5" /> {form.error}
        </div>
      {/if}
      
      {#if showSuccess}
        <div class="p-4 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-5 h-5" /> Ajustes de visualización actualizados con éxito.
        </div>
      {/if}

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
        <div class="w-16 h-16 rounded-full border-2 border-slate-200 shadow-sm overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Identidad Corporativa</h2>
          <p class="text-lg font-black text-slate-900 mb-1">{broker.nombre_comercial || 'Inmublia Showcase'}</p>
          <p class="text-xs text-slate-500">Logotipo reflejado en índices públicos y documentos de visualización. Configurable desde la sección Perfil.</p>
        </div>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div class="mb-6 border-b border-slate-100 pb-4">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-4 h-4 text-indigo-500" />
            1. Interfaz Base de la Agencia
          </h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Determine la maqueta global para desplegar la colección de propiedades públicas.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {#each catalogoGlobal as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = selectedTemplate === template.id}
            
            <label class="template-card relative flex flex-col bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 {activo ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplateId} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-28 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative group overflow-hidden">
                {#if template.id === 'classic' || template.id === 'clean'}
                  <div class="w-full h-full bg-slate-50 flex flex-col p-4 select-none">
                     <div class="w-1/2 h-2 bg-slate-300 rounded mb-2"></div>
                     <div class="w-full h-full bg-slate-200 rounded"></div>
                  </div>
                {:else if template.id === 'modern' || template.id === 'editorial'}
                  <div class="w-full h-full bg-slate-50 flex gap-2 p-2 select-none">
                     <div class="w-2/3 h-full bg-slate-300 rounded"></div>
                     <div class="w-1/3 h-full bg-slate-200 rounded"></div>
                  </div>
                {:else}
                  <div class="w-full h-full bg-slate-800 flex items-center justify-center select-none">
                     <div class="w-1/2 h-4 bg-white/20 rounded-full"></div>
                  </div>
                {/if}

                <a href="https://{subdominio}.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10" onclick={(e) => e.stopPropagation()}>
                  <Eye class="w-5 h-5 mb-1" /> Ver Ejemplo
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

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div class="mb-6 border-b border-slate-100 pb-4">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-indigo-500" />
            2. Catálogo de Diseños Inmobiliarios
          </h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Muestrario estético e interactivo. Estas maquetas de Landing Page se aplican de forma exclusiva en la ficha de cada propiedad.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            
            <div class="relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 {!autorizado ? 'opacity-40 bg-slate-50 grayscale' : 'hover:border-indigo-500 hover:shadow-md group'}">
              
              <div class="h-24 bg-slate-50 flex flex-col items-center justify-center relative p-3 border-b border-slate-100">
                <div class="w-full h-full rounded border border-slate-200 bg-white flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-wider select-none shadow-inner">
                  Mini Domo Visual
                </div>

                {#if autorizado}
                  <a href="https://{subdominio}.inmublia.com/{previewSlug}?template={propTemplate.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-indigo-950/90 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
                    <span class="text-white font-bold text-[9px] uppercase tracking-widest border border-white/20 px-3.5 py-1.5 rounded flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                      <Eye class="w-3.5 h-3.5" /> Ver Vista Previa
                    </span>
                  </a>
                {/if}
              </div>
              
              <div class="p-5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-extrabold text-sm text-slate-900 tracking-tight">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 uppercase tracking-wider shrink-0">🔒 {propTemplate.minPlan}</span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase tracking-wider shrink-0">✓ {propTemplate.minPlan}</span>
                  {/if}
                </div>
                <p class="text-[11px] text-slate-500 leading-normal font-medium flex-1 mb-4">{propTemplate.desc}</p>

                <div class="mt-auto">
                    {#if autorizado}
                      <a href="https://{subdominio}.inmublia.com/{previewSlug}?template={propTemplate.id}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors w-full text-center">
                        <Eye class="w-3.5 h-3.5 text-amber-400" /> Ver Demo Real
                      </a>
                    {:else}
                      <button disabled class="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 text-slate-400 px-3 py-2 rounded-xl cursor-not-allowed w-full text-center">
                        Requiere Plan {propTemplate.minPlan}
                      </button>
                    {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
