<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Palette, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  
  let selectedTemplate = $state(broker.template_seleccionado || 'classic');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  const catalogoTemplates = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'conversion', nombre: 'Conversion Focus', desc: 'Diseñado para captura agresiva de leads.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' },
    { id: 'prestige', nombre: 'Prestige Dark', desc: 'Modo oscuro absoluto para desarrollos VIP.', minPlan: 'elite' },
    { id: 'panoramic', nombre: 'Panoramic 3D', desc: 'Integración fluida de recorridos Matterport.', minPlan: 'elite' }
  ];
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
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-zinc-300 uppercase">{broker.plan_suscripcion || 'Básico'}</span>
        </p>
      </div>
    </div>
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-7xl mx-auto">

      {#if form?.error}
         <div class="mb-6 font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 shadow-sm" role="alert">
           <AlertCircle class="w-4 h-4" /> {form.error}
         </div>
      {/if}
      
      {#if showSuccess}
        <div class="mb-6 font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-4 h-4" /> Diseño global actualizado correctamente.
        </div>
      {/if}

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h3 class="text-xl font-black text-slate-900">Plantillas de Agencia (Global)</h3>
            <p class="text-xs font-medium text-slate-500 mt-1">Selecciona el diseño principal que representará a toda tu agencia inmobiliaria.</p>
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
                  <CheckCircle2 class="w-4 h-4" /> Guardar Diseño Global
                {/if}
             </button>
          </form>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {#each catalogoTemplates as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = selectedTemplate === template.id}
            <div class="relative bg-white border rounded-2xl flex flex-col overflow-hidden transition-all duration-300 {activo ? 'border-indigo-600 ring-2 ring-indigo-600 shadow-md' : 'border-slate-200 hover:border-slate-300'} {!autorizado ? 'opacity-60 bg-slate-50 grayscale-[30%]' : ''}">
              
              <div class="h-32 bg-slate-100 border-b border-slate-200 flex items-center justify-center relative group">
                <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                
                <a href="https://{broker.subdominio}.inmublia.com/?preview={template.id}" target="_blank" rel="noopener noreferrer" class="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  Vista Previa
                </a>
              </div>
              
              <label class="p-5 flex flex-col justify-between flex-1 cursor-pointer {activo ? 'bg-indigo-50/10' : ''} {!autorizado ? 'cursor-not-allowed' : ''}">
                <input type="radio" name="template_radio" bind:group={selectedTemplate} value={template.id} disabled={!autorizado} class="hidden">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="font-black text-sm {activo ? 'text-indigo-900' : 'text-slate-900'}">{template.nombre}</span>
                    {#if !autorizado}
                      <span class="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest {template.minPlan === 'elite' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}">
                         🔒 {template.minPlan}
                      </span>
                    {:else if activo}
                      <span class="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                        <CheckCircle2 class="w-3.5 h-3.5" />
                      </span>
                    {/if}
                  </div>
                  <p class="text-xs text-slate-500 font-medium leading-relaxed">{template.desc}</p>
                </div>
              </label>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
