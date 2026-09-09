<script>
  import { CheckCircle2, ArrowRight } from 'lucide-svelte';

  let { 
    id = '',
    nombre = '', 
    descripcion = '',
    plan = 'basico',
    activo = false,
    urlPreview = '' 
  } = $props();

  let iframeLoaded = $state(false);
</script>

<div class="relative flex flex-col bg-white rounded-2xl border {activo ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-200 shadow-sm hover:border-slate-300'} transition-all overflow-hidden group h-full">
  
  {#if activo}
    <div class="absolute top-4 right-4 z-30">
      <span class="bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center p-1">
        <CheckCircle2 class="w-5 h-5" />
      </span>
    </div>
  {/if}

  <div class="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden border-b border-slate-100">
    {#if !iframeLoaded}
      <div class="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
        <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    {/if}

    <div class="absolute inset-0 z-20 bg-transparent group-hover:bg-slate-900/20 transition-colors duration-500 flex flex-col items-center justify-center pointer-events-none">
      <button class="opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 ease-out bg-slate-900 text-white text-xs font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-2xl pointer-events-auto">
        {#if activo}
          Plantilla Actual <CheckCircle2 class="w-4 h-4" />
        {:else}
          Seleccionar Diseño <ArrowRight class="w-4 h-4" />
        {/if}
      </button>
    </div>

    <!-- 🚀 MAGIA: SSR Dead-Drop Sandbox -->
    <div class="absolute top-0 left-0 w-[1440px] h-[3000px] origin-top-left scale-[0.25] transition-transform duration-[8s] ease-in-out group-hover:-translate-y-[10%] z-10 pointer-events-none">
      <iframe 
        src={urlPreview} 
        title="Vista previa de {nombre}"
        class="w-full h-full border-0 bg-white"
        loading="lazy"
        tabindex="-1"
        scrolling="no"
        sandbox="allow-same-origin"
        onload={() => iframeLoaded = true}
      ></iframe>
    </div>
  </div>

  <div class="p-5 flex items-center justify-between bg-white relative z-30 mt-auto">
    <div class="flex-1 pr-4">
      <h4 class="text-sm font-black text-slate-900 truncate">{nombre}</h4>
      <p class="text-[11px] font-medium text-slate-500 mt-1 truncate">{descripcion}</p>
    </div>
    <div class="shrink-0">
      {#if plan === 'elite'}
        <span class="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md bg-slate-900 text-white border border-slate-700 shadow-sm flex items-center gap-1">✓ Elite</span>
      {:else if plan === 'pro'}
        <span class="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">✓ Pro</span>
      {:else}
        <span class="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">✓ Básico</span>
      {/if}
    </div>
  </div>
</div>
