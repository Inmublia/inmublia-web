<!-- src/lib/components/LeadScoreBadge.svelte -->
<script>
  import { Flame, Zap, Snowflake, Moon } from 'lucide-svelte';
  
  let { scoreData } = $props();
  
  // Asignación dinámica de colores adaptable a Light/Dark Mode (Tailwind 2026)
  let colorClase = $derived(
    scoreData.score >= 75 ? 'border-orange-300 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm dark:shadow-none' :
    scoreData.score >= 50 ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
    scoreData.score >= 25 ? 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 
    'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500'
  );
</script>

<!-- Badge limpio para el Kanban con íconos SVG Premium y tooltips nativos -->
<div 
  class="flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black transition-all duration-200 {colorClase} hover:ring-2 hover:ring-indigo-500/20 dark:hover:ring-indigo-500/50 cursor-help shrink-0"
  title="{scoreData.etiqueta}: {scoreData.razon} 👉 Acción: {scoreData.accion}"
>
  {#if scoreData.score >= 75}
    <Flame class="w-3 h-3 fill-orange-500/20 dark:fill-orange-500/40 animate-pulse" />
  {:else if scoreData.score >= 50}
    <Zap class="w-3 h-3 fill-amber-500/20 dark:fill-amber-500/40" />
  {:else if scoreData.score >= 25}
    <Snowflake class="w-3 h-3" />
  {:else}
    <Moon class="w-3 h-3" />
  {/if}
  <span>{scoreData.score}</span>
</div>
