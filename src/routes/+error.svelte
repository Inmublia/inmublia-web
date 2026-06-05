<script>
  import { page } from '$app/stores';

  // Obtenemos el código de error y el mensaje real del servidor
  let status = $derived($page.status);
  let errorMsg = $derived($page.error?.message);
</script>

<div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 text-center">
    
    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
    </div>

    <h1 class="text-6xl font-black text-slate-900 mb-2">{status}</h1>
    
    {#if status === 404}
      <h2 class="text-xl font-bold text-slate-800 mb-4">Página no encontrada</h2>
      <p class="text-slate-500 text-sm mb-8">La dirección a la que intentas acceder no existe.</p>
    {:else}
      <!-- AHORA MOSTRAREMOS EL ERROR REAL AQUÍ -->
      <h2 class="text-xl font-bold text-slate-800 mb-4">Fallo en el Sistema</h2>
      <div class="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-mono text-left mb-8 overflow-auto border border-red-100">
        {errorMsg || 'Error interno del servidor sin detalles.'}
      </div>
    {/if}

    <a href="/admin" data-sveltekit-reload class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm w-full block">
      Volver al Panel Principal
    </a>
  </div>
</div>
