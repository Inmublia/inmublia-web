<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  // Obtenemos el código de error (ej. 404, 500)
  let status = $derived($page.status);
  let errorMsg = $derived($page.error?.message);
  
  let countdown = $state(5);
  let timer;

  onMount(() => {
    // Si es un error 500, iniciamos la redirección automática
    if (status === 500) {
      timer = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
          clearInterval(timer);
          window.location.href = '/login?motivo=inactividad';
        }
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  });
</script>

<div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
  <div class="max-w-md w-full bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 text-center">
    
    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
    </div>

    <h1 class="text-6xl font-black text-slate-900 mb-2">{status}</h1>
    
    {#if status === 404}
      <h2 class="text-xl font-bold text-slate-800 mb-4">Página no encontrada</h2>
      <p class="text-slate-500 text-sm mb-8">La dirección a la que intentas acceder no existe o fue movida.</p>
      
      <a href="/admin" data-sveltekit-reload class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm w-full block">
        Volver al Panel Principal
      </a>
      
    {:else if status === 500}
      <h2 class="text-xl font-bold text-slate-800 mb-4">Sesión Inactiva o Error de Sistema</h2>
      <p class="text-slate-500 text-sm mb-6">Por tu seguridad, hemos pausado la conexión. Serás redirigido al inicio de sesión para continuar.</p>
      
      <div class="bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold py-3 px-4 rounded-xl mb-8 flex items-center justify-center gap-2">
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        Redirigiendo en {countdown} segundos...
      </div>

      <a href="/login?motivo=inactividad" data-sveltekit-reload class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm w-full block">
        Ir al Login ahora
      </a>
      
    {:else}
      <h2 class="text-xl font-bold text-slate-800 mb-4">Algo salió mal</h2>
      <p class="text-slate-500 text-sm mb-8">{errorMsg || 'Ha ocurrido un error inesperado.'}</p>
      
      <a href="/admin" data-sveltekit-reload class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm w-full block">
        Volver al Panel Principal
      </a>
    {/if}

  </div>
</div>
