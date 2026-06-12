<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Palette, ShieldCheck, CheckCircle2, AlertCircle, LayoutTemplate } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplate = $state(broker.template_seleccionado || 'classic');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  // 1. CATÁLOGO GLOBAL DE AGENCIA (Las 6 originales)
  const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  // 2. GALERÍA DE SMART BROCHURES (Las 9 nuevas para propiedades)
  const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería.', minPlan: 'basico' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Captura de leads agresiva.', minPlan: 'pro' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Diseño para desarrollos.', minPlan: 'pro' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Narrativa visual elegante.', minPlan: 'pro' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Premium pantalla completa.', minPlan: 'elite' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video inmersivo inicial.', minPlan: 'elite' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Modo oscuro absoluto.', minPlan: 'elite' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Matterport como héroe.', minPlan: 'elite' }
  ];

  function puedeUsarPropiedad(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-zinc-950 border-b border-zinc-800 flex items-center px-10 shrink-0 shadow-xl shadow-zinc-900/10 z-10 relative">
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
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-7xl mx-auto space-y-12">

      {#if form?.error}
         <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 shadow-sm" role="alert">
           <AlertCircle class="w-4 h-4" /> {form.error}
         </div>
      {/if}
      
      {#if showSuccess}
        <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-4 h-4" /> Diseño global actualizado correctamente.
        </div>
      {/if}

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100">
          <div>
            <h3 class="text-xl font-black text-slate-900">1. Identidad de Portal (Global)</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">Selecciona el diseño principal de tu catálogo donde se listarán todas tus propiedades.</p>
          </div>
          
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
             <button type="submit" disabled={savingProfile} class="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-bold py-3 px-8 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all w-full md:w-auto active:scale-95 text-sm">
                {#if savingProfile}
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
                {:else}
                  <CheckCircle2 class="w-4 h-4" /> Guardar Portal
                {/if}
             </button>
          </form>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = selectedTemplate === template.id}
            <div class="relative bg-white border rounded-2xl flex flex-col overflow-hidden transition-all duration-300 {activo ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-md' : 'border-slate-200 hover:border-slate-300'} {!autorizado ? 'opacity-60 bg-slate-50 grayscale-[30%]' : ''}">
              
              <div class="h-24 bg-slate-100 border-b border-slate-200 flex items-center justify-center relative group">
                <LayoutTemplate class="w-8 h-8 text-slate-300" />
                <a href="https://{broker.subdominio}.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  Vista Previa
                </a>
              </div>
              
              <label class="p-4 flex flex-col justify-between flex-1 cursor-pointer {activo ? 'bg-indigo-50/10' : ''} {!autorizado ? 'cursor-not-allowed' : ''}">
                <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-black text-sm {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                    {#if !autorizado}
                      <span class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest {template.minPlan === 'elite' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}">
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

      <div class="bg-slate-900 p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div class="mb-8 pb-6 border-b border-slate-800 relative z-10">
          <h3 class="text-xl font-black text-white">2. Catálogo de Smart Brochures</h3>
          <p class="text-xs font-medium text-slate-400 mt-1">Estas son las 9 plantillas disponibles para vestir cada propiedad individual. Las seleccionarás al crear o editar una casa en el Inventario.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsarPropiedad(propTemplate.minPlan)}
            <div class="relative bg-slate-800/50 border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden {!autorizado ? 'opacity-40 grayscale-[50%]' : 'hover:border-slate-500 transition-colors'}">
              
              <div class="h-20 bg-slate-800 border-b border-slate-700 flex items-center justify-center relative group">
                <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                <div class="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span class="text-white font-bold text-[10px] uppercase tracking-widest border border-white/30 px-3 py-1.5 rounded-lg hover:bg-white/10">Ver Demo</span>
                </div>
              </div>
              
              <div class="p-4 flex flex-col justify-between flex-1">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-xs text-white">{propTemplate.nombre}</span>
                  {#if !autorizado}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                       🔒 {propTemplate.minPlan}
                    </span>
                  {:else}
                    <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
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
