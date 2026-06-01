<script>
  // Recibimos los datos inyectados por +page.server.js
  let { data } = $props();
  
  // Usamos el rune $derived para mantener la reactividad en Svelte 5
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.brokerActivo);
</script>

<main class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    
    <header class="mb-12 text-center">
      {#if broker}
        <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl uppercase">
          Propiedades de {broker.replace('-', ' ')}
        </h1>
        <p class="mt-4 text-xl text-slate-600">
          Sitio exclusivo operado por Inmublia
        </p>
      {:else}
        <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Inmublia Directorio Global
        </h1>
        <p class="mt-4 text-xl text-slate-600">
          Explora todas las propiedades de nuestra red
        </p>
      {/if}
    </header>

    {#if propiedades.length === 0}
      <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md max-w-xl mx-auto">
        <p class="text-sm text-yellow-700 font-bold">No se encontraron propiedades.</p>
      </div>
    {:else}
      <!-- Grid de Propiedades Dinámicas -->
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
