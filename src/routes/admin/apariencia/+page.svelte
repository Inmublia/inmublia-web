<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Palette, ShieldCheck, CheckCircle2, AlertCircle, LayoutTemplate, Smartphone } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplate = $state(broker.template_seleccionado || 'classic');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  // 1. CATÁLOGO GLOBAL DE AGENCIA (Las 6 originales) - ESTAS SE GUARDAN
  const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  // 2. GALERÍA DE SMART BROCHURES (Las 9 nuevas para propiedades) - SOLO EXHIBICIÓN
  const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería horizontal.', minPlan: 'basico' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky agresivo para captura.', minPlan: 'pro' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel independiente vertical.', minPlan: 'pro' },
    { id: 'prop_pro_3', brought_to: 'Editorial Story', desc: 'Revista de arquitectura (Fuentes Serif).', minPlan: 'pro' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism sobre fondo.', minPlan: 'elite' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video hero en bucle continuo de fondo.', minPlan: 'elite' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Estética neo-brutalista (Negro/Bronce).', minPlan: 'elite' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Integración pura de recorridos Matterport.', minPlan: 'elite' }
  ];

  function puedeUsarPropiedad(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-10 shrink-0 shadow-xl shadow-zinc-900/10 z-10 relative">
    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/4 -translate-y-1/2"></div>
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-2.5 bg-zinc-900 rounded-xl text-white shadow-sm border border-zinc-800">
        <Palette class="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-white">Design Studio</h1>
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-zinc-300 uppercase">{planSuscripcion}</span>
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
            <button type="submit" disabled={savingProfile} class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm flex items-center gap-2 transition-all text-sm">
                {#if savingProfile}
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
                {:else}
                    <CheckCircle2 class="w-4 h-4" /> Guardar Portal de Agencia
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

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
        <div class="mb-8 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-black text-slate-900">1. Identidad del Portal de Agencia</h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Selecciona el diseño principal que representará el índice de todas tus propiedades.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = selectedTemplate === template.id}
            
            <div class="relative bg-white border rounded-2xl flex flex-col overflow-hidden transition-all duration-300 {activo ? 'border-indigo-600 ring-1 ring-indigo-600 shadow-md' : 'border-slate-200 hover:border-slate-300'} {!autorizado ? 'opacity-60 bg-slate-50 grayscale' : ''}">
              
              <div class="h-28 bg-slate-100 border-b border-slate-200 flex items-center justify-center relative group">
                <LayoutTemplate class="w-8 h-8 text-slate-300" />
                <a href="https://demo.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Smartphone class="w-5 h-5 mb-1" />
                  Ver Demo
                </a>
              </div>
              
              <label class="p-4 flex flex-col justify-between flex-1 cursor-pointer {activo ? 'bg-indigo-50/20' : ''} {!autorizado ? 'cursor-not-allowed' : ''}">
                <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-black text-sm {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                    {#if !autorizado}
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest bg-slate-200 text-slate-600">
                         🔒 {template.minPlan}
                      </span>
                    {:else if activo}
                      <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                        <CheckCircle2 class="w-3.5 h-3.5" />
                      </span>
                    {/if}
                  </div>
                  <p class="text-[11px] text-slate-500 font-medium leading-relaxed">{template.desc}</p>
                </div>
              </label>
            </div>
          {/each}
        </div>
      </div>

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
        
        <div class="mb-8 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-black text-slate-900">2. Galería de Smart Brochures</h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Conozca los 9 diseños disponibles para vestir cada propiedad individual. Podrá seleccionar y asignar uno de estos diseños al momento de crear o editar una propiedad en su inventario.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsarPropiedad(propTemplate.minPlan)}
            
            <div class="relative bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden {!autorizado ? 'opacity-50 bg-slate-50 grayscale' : 'hover:border-indigo-300 hover:shadow-sm transition-all'}">
              
              <div class="h-20 bg-slate-50 border-b border-slate-200 flex items-center justify-center relative group">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{propTemplate.nombre.split(' ')[0]}</span>
                <a href="https://demo.inmublia.com/brochure/{propTemplate.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-indigo-900/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
                  <span class="text-white font-bold text-[10px] uppercase tracking-widest border border-white/30 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors">Vista Previa</span>
                </a>
              </div>
              
              <div class="p-4 flex flex-col justify-between flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-slate-900 truncate pr-2">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-amber-100 text-amber-700 shrink-0">
                       🔒 {propTemplate.minPlan}
                    </span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                       ✓ {propTemplate.minPlan}
                    </span>
                  {/if}
                </div>
                <p class="text-[10px] text-slate-500 font-medium leading-relaxed">{propTemplate.desc}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
