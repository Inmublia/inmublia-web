<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';

  // Reactividad nativa de Svelte 5 (Runes) EAV
  let propiedades = $state([]);
  let cargando = $state(true);
  let error = $state(null);

  onMount(async () => {
    try {
      // Jalamos los datos en tiempo real desde Supabase
      const { data, error: dbError } = await supabase
        .from('propiedades')
        .select('*');

      if (dbError) throw dbError;
      propiedades = data;
    } catch (e) {
      error = e.message;
    } finally {
      cargando = false;
    }
  });
</script>

<main class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    
    <header class="mb-12 text-center">
      <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
        Inmublia Plataforma
      </h1>
      <p class="mt-4 text-xl text-slate-600">
        Prueba de conexión con Supabase exitosa
      </p>
    </header>

    {#if cargando}
      <div class="flex justify-center items-center py-12">
        <p class="text-lg text-slate-600 animate-pulse">Consultando base de datos...</p>
      </div>
    {:else if error}
      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md max-w-xl mx-auto">
        <p class="text-sm text-red-700 font-bold">Error de conexión: {error}</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <img class="h-48 w-full object-cover bg-slate-100" src={propiedad.imagen_url} alt={propiedad.titulo} />
            <div class="p-6">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 mb-3 uppercase tracking-wider">
                ID: {propiedad.broker_id}
              </span>
              <h3 class="text-lg font-bold text-slate-900 mb-2">{propiedad.titulo}</h3>
              <p class="text-2xl font-black text-blue-600">
                ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</main>
