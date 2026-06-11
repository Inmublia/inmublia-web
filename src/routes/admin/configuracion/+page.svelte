<script>
  import { enhance } from '$app/forms';
  import { 
    LayoutTemplate, 
    CheckCircle2, 
    Lock, 
    Sparkles, 
    Loader2, 
    ShieldCheck 
  } from 'lucide-svelte';

  let { data, form } = $props();
  
  let broker = $derived(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let loading = $state(false);

  const catalogoTemplates = [
    { 
      id: 'classic', 
      nombre: 'Classic Minimalist', 
      desc: 'Diseño limpio y tradicional enfocado en texto de alta legibilidad y listados rápidos.', 
      minPlan: 'basico',
      mockupBg: 'bg-white',
      mockupLine: 'bg-slate-200'
    },
    { 
      id: 'modern', 
      nombre: 'Modern Grid', 
      desc: 'Mosaicos dinámicos y transiciones fluidas optimizadas para agencias en escala.', 
      minPlan: 'pro',
      mockupBg: 'bg-slate-50',
      mockupLine: 'bg-indigo-300'
    },
    { 
      id: 'luxury', 
      nombre: 'Luxury Immersive', 
      desc: 'Diseño oscuro premium con cinemáticas, ideal para exclusivas de alto ticket.', 
      minPlan: 'elite',
      mockupBg: 'bg-zinc-950',
      mockupLine: 'bg-amber-500/50'
    }
  ];
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50 font-sans text-slate-900">
  
 <header class="h-20 bg-zinc-950 border-b border-zinc-800 flex items-center px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-xl shadow-zinc-900/10">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-zinc-900 rounded-xl text-white shadow-sm border border-zinc-800">
        <LayoutTemplate class="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-white">Identidad del Portal</h1>
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-zinc-300 uppercase">{broker.plan_suscripcion}</span>
        </p>
      </div>
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto pb-32 animate-[fadeIn_0.4s_ease-out]">
    <div class="max-w-[1200px] mx-auto">
      
      <div class="mb-10">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Arquitectura Visual</h2>
        <p class="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
          Elige la identidad y el motor de renderizado con la que tus compradores potenciales interactuarán con tus exclusivas inmobiliarias.
        </p>
      </div>

      {#if form?.success}
        <div class="mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-bold p-4 rounded-xl text-sm flex items-center gap-3 shadow-sm animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 class="w-5 h-5 text-emerald-500" />
          ¡Arquitectura visual del portal sincronizada con éxito!
        </div>
      {/if}

      <form method="POST" action="?/guardarTemplate" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }}>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each catalogoTemplates as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = broker.template_seleccionado === template.id}
            
            <label class="relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-sm
              {activo ? 'bg-white border-2 border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.12)] ring-4 ring-indigo-50' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'} 
              {!autorizado ? 'opacity-75 bg-slate-50/50 cursor-not-allowed filter grayscale-[20%]' : ''}">
              
              {#if autorizado}
                <input type="radio" name="template_id" value={template.id} checked={activo} class="sr-only">
              {/if}

              <div class="w-full h-32 rounded-xl mb-6 border border-slate-200/60 overflow-hidden relative shadow-inner {template.mockupBg}">
                <div class="absolute top-4 left-4 right-4 h-4 rounded-md {template.mockupLine} opacity-50"></div>
                <div class="absolute top-10 left-4 w-1/3 h-12 rounded-md {template.mockupLine} opacity-30"></div>
                <div class="absolute top-10 right-4 w-1/2 h-12 rounded-md {template.mockupLine} opacity-30"></div>
                {#if template.id === 'luxury'}
                  <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                {/if}
              </div>

              <div class="flex-1">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-black text-lg text-slate-900 flex items-center gap-2">
                    {template.nombre}
                    {#if template.id === 'luxury'} <Sparkles class="w-4 h-4 text-amber-500" /> {/if}
                  </h3>
                </div>
                <p class="text-sm text-slate-500 leading-relaxed font-medium">{template.desc}</p>
              </div>

              <div class="mt-8 pt-5 border-t border-slate-100/80">
                {#if autorizado}
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors {activo ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}">
                      {#if activo} <CheckCircle2 class="w-3.5 h-3.5 text-white" /> {/if}
                    </div>
                    <span class="text-xs font-bold uppercase tracking-widest {activo ? 'text-indigo-700' : 'text-slate-500'}">
                      {activo ? 'Motor Activo' : 'Seleccionar Motor'}
                    </span>
                  </div>
                {:else}
                  <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Lock class="w-3.5 h-3.5 text-slate-400" /> Requiere Licencia
                    </div>
                    <a href="/admin/perfil" class="inline-flex items-center justify-center w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm active:scale-95 gap-2">
                      <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                      Desbloquear Plan {template.minPlan.toUpperCase()}
                    </a>
                  </div>
                {/if}
              </div>
            </label>
          {/each}
        </div>

        <div class="mt-12 flex justify-end">
          <button type="submit" disabled={loading} class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-indigo-600 h-14 px-10 gap-3 shadow-xl shadow-slate-900/10 active:scale-95">
            {#if loading}
              <Loader2 class="w-5 h-5 animate-spin" />
              Sincronizando Identidad...
            {:else}
              <CheckCircle2 class="w-5 h-5" />
              Confirmar Arquitectura Visual
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</main>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
