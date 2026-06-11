<script>
  import { page } from '$app/stores';
  import { ArrowLeft } from 'lucide-svelte';

  // Navegación Inteligente: Detecta si la página se abrió en una pestaña nueva
  function goBack() {
    if (window.history.length > 2) {
      window.history.back();
    } else {
      window.location.href = '/admin'; // Fallback seguro al Inventario
    }
  }
</script>

<div class="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center font-sans p-6 relative overflow-hidden">
  
  <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/[0.04] rounded-[100%] blur-[80px] pointer-events-none"></div>

  <div class="relative z-10 text-center max-w-2xl animate-[fadeIn_0.6s_ease-out]">
    
    <h1 class="text-[140px] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 mb-6 select-none">
      {$page.status}
    </h1>
    
    <h2 class="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
      {#if $page.status === 404}
        Esta página no existe.
      {:else}
        Error interno del sistema.
      {/if}
    </h2>
    
    <p class="text-zinc-500 font-medium mb-12 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
      {#if $page.status === 404}
        El activo inmobiliario que buscas es privado, ha sido removido del inventario oficial o la dirección URL es incorrecta.
      {:else}
        {$page.error?.message || 'Hemos detectado una anomalía de conexión. El equipo técnico de Inmublia ha sido notificado.'}
      {/if}
    </p>

    <button onclick={goBack} class="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold transition-all focus:outline-none focus:ring-2 focus:ring-zinc-700 bg-white text-black hover:bg-zinc-200 hover:scale-105 h-12 px-8 gap-2 shadow-[0_0_40px_rgba(255,255,255,0.15)] active:scale-95 mx-auto">
      <ArrowLeft class="w-4 h-4" />
      Regresar al Inventario
    </button>
  </div>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
