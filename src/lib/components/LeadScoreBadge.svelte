<!-- src/lib/components/LeadScoreBadge.svelte -->
<script>
  import { Flame, Zap, Snowflake, Moon } from 'lucide-svelte';
  
  let { scoreData } = $props();
  
  // Asignación dinámica de colores según el nivel de urgencia/temperatura
  let colorClase = $derived(
    scoreData.score >= 75 ? 'border-orange-300 bg-orange-50 text-orange-600 shadow-sm' :
    scoreData.score >= 50 ? 'border-amber-300 bg-amber-50 text-amber-600' :
    scoreData.score >= 25 ? 'border-sky-200 bg-sky-50 text-sky-600' : 
    'border-slate-200 bg-slate-50 text-slate-400'
  );
</script>

<!-- Badge limpio para el Kanban con íconos SVG Premium y tooltips nativos -->
<div 
  class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black transition-all duration-200 {colorClase} hover:ring-2 hover:ring-indigo-500/20 cursor-help shrink-0"
  title="{scoreData.etiqueta}: {scoreData.razon} 👉 Acción: {scoreData.accion}"
>
  {#if scoreData.score >= 75}
    <Flame class="w-3 h-3 fill-orange-500/20 animate-pulse" />
  {:else if scoreData.score >= 50}
    <Zap class="w-3 h-3 fill-amber-500/20" />
  {:else if scoreData.score >= 25}
    <Snowflake class="w-3 h-3" />
  {:else}
    <Moon class="w-3 h-3" />
  {/if}
  <span>{scoreData.score}</span>
</div>
