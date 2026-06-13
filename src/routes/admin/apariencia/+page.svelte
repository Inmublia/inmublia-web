<script module>
  export const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

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

  // Resolvedores seguros de subdominio y slug inyectados por el load function
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
            
            <label class="relative flex flex-col bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 {activo ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-md bg-amber-50/10' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-24 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center relative group overflow-hidden">
                {#if template.id === 'classic' || template.id === 'clean'}
                  <div class="w-full h-full bg-slate-50 flex flex-col p-4 select-none">
                     <div class="w-1/3 h-1.5 bg-slate-300 rounded mb-1.5"></div>
                     <div class="w-full h-full bg-slate-200 rounded"></div>
                  </div>
                {:else if template.id === 'modern' || template.id === 'editorial'}
                  <div class="w-full h-full bg-slate-50 flex gap-1.5 p-3 select-none">
                     <div class="w-3/5 h-full bg-slate-300 rounded"></div>
                     <div class="w-2/5 h-full bg-slate-200 rounded"></div>
                  </div>
                {:else}
                  <div class="w-full h-full bg-slate-800 flex items-center justify-center select-none">
                     <div class="w-1/3 h-3 bg-white/20 rounded-full"></div>
                  </div>
                {/if}

                <a href="https://{subdominio}.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center gap-1.5 text-white font-bold text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10" onclick={(e) => e.stopPropagation()}>
                  <Eye class="w-3.5 h-3.5" /> Ver Ejemplo
                </a>
              </div>
              
              <div class="p-4 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-extrabold text-xs tracking-tight {activo ? 'text-amber-800' : 'text-slate-900'}">{template.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 uppercase tracking-wider">Plan {template.minPlan}</span>
                  {:else if activo}
                    <CheckCircle2 class="w-4 h-4 text-amber-500" />
                  {/if}
                </div>
                <p class="text-[10px] text-slate-500 leading-normal font-medium">{template.desc}</p>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <div class="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-lg border border-slate-800 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div class="mb-6 border-b border-slate-800 pb-4 relative z-10">
          <h3 class="text-base font-black text-white flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-indigo-400" />
            2. Diseños de Maquetas para Propiedades
          </h3>
          <p class="text-xs font-medium text-slate-400 mt-1">Catálogo estético interactivo. Estos diseños se asignan individualmente dentro de la consola de cada propiedad.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5 relative z-10">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            
            <div class="relative flex flex-col bg-slate-800/40 border border-slate-700/80 rounded-xl overflow-hidden transition-all duration-200 {!autorizado ? 'opacity-40 bg-slate-950 grayscale' : 'hover:border-indigo-500/80 hover:shadow-md group'}">
              
              <div class="h-20 bg-slate-950 flex flex-col items-center justify-center relative p-3 border-b border-slate-800/50">
                <div class="w-full h-full rounded bg-slate-900 border border-slate-800/60 flex items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-wider select-none">
                  Vista Maqueta
                </div>

                {#if autorizado}
                  <a href="https://{subdominio}.inmublia.com/{previewSlug}?brochure=true&template={propTemplate.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-indigo-950/90 backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
                    <span class="text-white font-bold text-[9px] uppercase tracking-widest border border-white/20 px-3.5 py-1.5 rounded flex items-center gap-1.5 hover:bg-white/10 transition-colors">
                      <Eye class="w-3.5 h-3.5" /> Ver Vista Previa
                    </span>
                  </a>
                {/if}
              </div>
              
              <div class="p-4 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-extrabold text-xs text-white tracking-tight">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase tracking-wider shrink-0">🔒 {propTemplate.minPlan}</span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider shrink-0">✓ {propTemplate.minPlan}</span>
                  {/if}
                </div>
                <p class="text-[10px] text-slate-400 leading-normal font-medium flex-1">{propTemplate.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
