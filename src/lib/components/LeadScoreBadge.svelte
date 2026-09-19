<!-- src/lib/components/LeadScoreBadge.svelte -->
<script>
  let { scoreData } = $props();
  
  let colorClase = $derived(
    scoreData.isHot ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm' :
    scoreData.score >= 50 ? 'border-amber-300 bg-amber-50 text-slate-700' :
    scoreData.isCold ? 'border-slate-200 bg-slate-50 text-slate-400' : 'border-slate-100 bg-white text-slate-700'
  );
</script>

<!-- Badge limpio para el Kanban. El texto largo se muestra nativamente al dejar el mouse sin ensuciar la UI -->
<div 
  class="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black transition-all duration-200 {colorClase} hover:ring-2 ring-indigo-500/20 cursor-help"
  title="{scoreData.etiqueta}: {scoreData.razon} 👉 Acción: {scoreData.accion}"
>
  {#if scoreData.isHot}
    <span class="animate-pulse">🔥</span>
  {:else if scoreData.isCold}
    <span>❄️</span>
  {/if}
  <span>{scoreData.score}</span>
</div>
