<script>
  import { page } from '$app/stores';
  import { ArrowLeft, Home, Compass } from 'lucide-svelte';
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-50 p-6 relative overflow-hidden">
  
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="relative z-10 text-center max-w-lg animate-[fadeIn_0.5s_ease-out]">
    <div class="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl mb-8 ring-1 ring-zinc-800/50">
      <Compass class="w-10 h-10 text-indigo-400" />
    </div>
    
    <h1 class="text-8xl font-black tracking-tighter text-white mb-2 drop-shadow-lg">
      {$page.status}
    </h1>
    
    <h2 class="text-2xl font-bold text-zinc-300 tracking-tight mb-6">
      {#if $page.status === 404}
        Territorio Inexplorado
      {:else}
        Interrupción del Sistema
      {/if}
    </h2>
    
    <p class="text-zinc-500 font-medium mb-10 leading-relaxed text-sm">
      {#if $page.status === 404}
        La propiedad o la página que buscas no existe en nuestra base de datos, ha sido eliminada o la dirección es incorrecta.
      {:else}
        {$page.error?.message || 'Ha ocurrido un error inesperado en el servidor. Nuestro equipo técnico ha sido notificado.'}
      {/if}
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button onclick={() => window.history.back()} class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800 h-12 px-8 gap-2 w-full sm:w-auto shadow-sm active:scale-95">
        <ArrowLeft class="w-4 h-4" />
        Regresar
      </button>
      
      <a href="/" class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-zinc-950 hover:bg-zinc-200 h-12 px-8 gap-2 w-full sm:w-auto shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
        <Home class="w-4 h-4" />
        Ir al Inicio
      </a>
    </div>
  </div>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
