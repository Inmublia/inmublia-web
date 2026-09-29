<!-- src/lib/components/PageHeader.svelte -->
<script lang="ts">
  let { 
    title, 
    icon: Icon = null, 
    subtitle, 
    actions 
  } = $props();
</script>

<!-- 🚀 FIX: Restauramos pb-28 (padding bottom gigante) para crear la "cinta" sobre la que flotan las tarjetas -->
<!-- También la regresamos a position relative (no sticky) para recuperar el comportamiento original -->
<header class="w-full bg-white dark:bg-zinc-950 text-slate-900 dark:text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0 border-b border-slate-200 dark:border-zinc-800 transition-colors duration-300">
  
  <!-- Deco Neumórfica Sutil -->
  <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3 transition-opacity"></div>

  <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
    <div>
      <h1 class="text-3xl font-black tracking-tight text-slate-900 dark:text-zinc-50 flex items-center gap-3">
        {#if Icon}
          <Icon class="w-7 h-7 text-indigo-500 dark:text-indigo-400" />
        {/if}
        {title}
      </h1>
      
      {#if subtitle}
        <div class="text-sm font-medium text-slate-500 dark:text-zinc-400 mt-1.5 flex items-center gap-2">
          {@render subtitle()}
        </div>
      {/if}
    </div>

    {#if actions}
      <div class="flex items-center gap-3">
        {@render actions()}
      </div>
    {/if}
  </div>
</header>
