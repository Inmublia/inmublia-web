<!-- src/lib/components/LeadScoreBadge.svelte -->
<script>
  let { scoreData } = $props();
  
  let colorClase = $derived(
    scoreData.isHot ? 'border-orange-400 bg-orange-50 shadow-orange-100 shadow-sm' :
    scoreData.score >= 50 ? 'border-amber-300 bg-amber-50' :
    scoreData.isCold ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-white'
  );
</script>

<div class="relative group">
  <!-- Badge del score (Kanban Card) -->
  <div class="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black cursor-help transition-all duration-200 {colorClase} group-hover:ring-2 ring-indigo-500/20">
    {#if scoreData.isHot}
      <span class="animate-pulse">🔥</span>
    {:else if scoreData.isCold}
      <span>❄️</span>
    {/if}
    <span class="{scoreData.isHot ? 'text-orange-700' : scoreData.isCold ? 'text-slate-400' : 'text-slate-700'}">
      {scoreData.score}
    </span>
  </div>

  <!-- Micro-Tooltip Elegante (Hover) -->
  <div class="absolute bottom-full right-0 mb-2 z-[9999] w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 hidden group-hover:block pointer-events-none origin-bottom-right animate-[fadeIn_.15s_ease-out]">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-[10px] font-black uppercase tracking-widest {scoreData.isHot ? 'text-orange-400' : 'text-white'}">
        {scoreData.etiqueta}
      </span>
      <span class="text-xs font-black text-slate-400">{scoreData.score}</span>
    </div>
    
    <p class="text-[10px] text-slate-300 leading-tight font-medium">
      {scoreData.accion}
    </p>
    
    <div class="mt-2 text-[8px] font-bold text-slate-500 uppercase tracking-widest text-right">
      Clic para abrir panel ➔
    </div>
  </div>
</div>
