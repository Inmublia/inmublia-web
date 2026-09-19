<!-- src/lib/components/LeadScoreBadge.svelte -->
<script>
  let { scoreData } = $props();
  
  let colorClase = $derived(
    scoreData.isHot ? 'border-orange-400 bg-orange-50 shadow-orange-100 shadow-md' :
    scoreData.score >= 50 ? 'border-amber-300 bg-amber-50' :
    scoreData.isCold ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'
  );
</script>

<div class="relative group">
  <!-- Badge del score -->
  <div class="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black cursor-help transition-all duration-200 {colorClase}">
    {#if scoreData.isHot}
      <span class="animate-pulse">🔥</span>
    {:else if scoreData.isCold}
      <span>❄️</span>
    {/if}
    <span class="{scoreData.isHot ? 'text-orange-700' : scoreData.isCold ? 'text-slate-400' : 'text-slate-700'}">
      {scoreData.score}
    </span>
  </div>

  <!-- Tooltip expandido al hover -->
  <div class="absolute top-8 right-0 z-[100] w-64 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] p-4 hidden group-hover:block animate-[fadeIn_.2s_ease-out] pointer-events-none">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-black text-slate-900">{scoreData.etiqueta}</span>
      <span class="text-lg font-black {scoreData.isHot ? 'text-orange-500' : 'text-slate-700'}">
        {scoreData.score}/100
      </span>
    </div>
    
    <!-- Barra de score visual -->
    <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
      <div class="h-full rounded-full transition-all duration-500 {scoreData.isHot ? 'bg-orange-400' : scoreData.score >= 50 ? 'bg-amber-400' : 'bg-slate-300'}" style="width:{scoreData.score}%"></div>
    </div>
    
    <p class="text-[10px] font-medium text-slate-500 leading-relaxed mb-3">{scoreData.razon}</p>
    
    <div class="bg-indigo-50 rounded-lg p-2.5 border border-indigo-100 mb-3">
      <p class="text-[10px] font-bold text-indigo-700 leading-tight">👉 {scoreData.accion}</p>
    </div>
    
    <!-- Breakdown numérico de la auditoría -->
    <div class="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-center">
      <div>
        <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Etapa</p>
        <p class="text-xs font-black text-slate-700">{scoreData.base}/50</p>
      </div>
      <div>
        <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Señales</p>
        <p class="text-xs font-black text-slate-700">×{scoreData.multiplicador.toFixed(1)}</p>
      </div>
      <div>
        <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Frescura</p>
        <p class="text-xs font-black {scoreData.decayFactor < 0.5 ? 'text-red-500' : 'text-emerald-600'}">
          ×{scoreData.decayFactor.toFixed(1)}
        </p>
      </div>
    </div>
  </div>
</div>
