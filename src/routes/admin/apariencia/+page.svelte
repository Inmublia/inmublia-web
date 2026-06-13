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

  // 2. GALERÍA DE SMART BROCHURES (Las 9 de propiedades) - SOLO EXHIBICIÓN
  export const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería horizontal.', minPlan: 'basico' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky agresivo.', minPlan: 'pro' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel vertical.', minPlan: 'pro' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Estilo revista (Serif).', minPlan: 'pro' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Glassmorphism sobre fondo.', minPlan: 'elite' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video hero en bucle.', minPlan: 'elite' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Neo-brutalismo oscuro.', minPlan: 'elite' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Matterport de fondo.', minPlan: 'elite' }
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

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-3 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <Palette class="w-6 h-6 text-amber-400" />
      </div>
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">Design Studio</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
           Nivel de acceso: <span class="text-slate-800">{planSuscripcion}</span>
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
          <CheckCircle2 class="w-5 h-5" /> Diseño global de agencia actualizado correctamente.
        </div>
      {/if}

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
        <div class="w-20 h-20 rounded-full border-4 border-slate-100 shadow-md overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Identidad de Marca</h2>
          <p class="text-xl font-black text-slate-900 mb-2">{broker.nombre_comercial || 'Mi Agencia Inmobiliaria'}</p>
          <p class="text-xs text-slate-500">Este logo y nombre se mostrarán en todos sus catálogos. (Modificable en la pestaña de Perfil).</p>
        </div>
      </div>

      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div class="mb-6 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-5 h-5 text-indigo-500" />
            1. Diseño del Portal de Agencia
          </h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Seleccione la interfaz principal donde los clientes verán todo su inventario.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = puedeUsar(template.minPlan)}
            {@const activo = selectedTemplate === template.id}
            
            <label class="relative flex flex-col bg-white border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 {activo ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-lg' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-24 bg-slate-50 border-b border-slate-100 flex flex-col items-center justify-center relative group overflow-hidden">
                <LayoutTemplate class="w-8 h-8 text-slate-300 transition-transform group-hover:scale-110" />
                <a href="https://demo.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute bottom-2 right-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded shadow-sm hover:text-indigo-600 hover:border-indigo-200 transition-colors z-10" onclick={(e) => e.stopPropagation()}>
                  <Eye class="w-3.5 h-3.5" /> Ver Demo
                </a>
              </div>
              
              <div class="p-5 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-black text-sm {activo ? 'text-amber-700' : 'text-slate-900'}">{template.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-200 text-slate-500">🔒 {template.minPlan}</span>
                  {:else if activo}
                    <CheckCircle2 class="w-5 h-5 text-amber-500" />
                  {/if}
                </div>
                <p class="text-xs text-slate-500 leading-relaxed">{template.desc}</p>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <div class="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        
        <div class="mb-6 border-b border-slate-800 pb-4 relative z-10">
          <h3 class="text-lg font-black text-white flex items-center gap-2">
            <Smartphone class="w-5 h-5 text-indigo-400" />
            2. Catálogo de Smart Brochures
          </h3>
          <p class="text-xs font-medium text-slate-400 mt-1">Estos diseños se aplican de forma individual al momento de publicar cada propiedad. (Modo exhibición).</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            
            <div class="relative flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden {!autorizado ? 'opacity-40 grayscale' : 'hover:border-indigo-400 hover:shadow-lg transition-all shadow-md group'}">
              
              <div class="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4">
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Plantilla Individual</span>
                <a href="https://demo.inmublia.com/demo-propiedad?template={propTemplate.id}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded hover:text-white hover:bg-indigo-600 transition-colors shrink-0">
                  <Eye class="w-3.5 h-3.5" /> Preview
                </a>
              </div>
              
              <div class="p-4 flex flex-col flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-white truncate pr-2">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-800 text-slate-500 shrink-0">🔒 {propTemplate.minPlan}</span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">✓ {propTemplate.minPlan}</span>
                  {/if}
                </div>
                <p class="text-[10px] text-slate-400 leading-relaxed">{propTemplate.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
