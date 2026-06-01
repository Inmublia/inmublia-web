<script>
  // Recibimos los datos inyectados por +page.server.js
  let { data } = $props();
  
  // Usamos runes para mantener la reactividad limpia de Svelte 5
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

<main class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    
    <header class="mb-12 text-center">
      {#if broker}
        <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl uppercase">
          {broker.nombre_comercial}
        </h1>
        <p class="mt-4 text-xl text-slate-600">
          Sitio exclusivo operado por Inmublia
        </p>
        {#if broker.whatsapp}
          <div class="mt-4">
            <a 
              href="https://wa.me/{broker.whatsapp}" 
              target="_blank" 
              class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-full text-sm shadow-sm transition-colors"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.966.01c3.184.001 6.177 1.242 8.425 3.492 2.247 2.25 3.481 5.24 3.48 8.427-.004 6.618-5.34 11.955-11.914 11.955-1.996-.001-3.956-.5-5.717-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437 0 9.862-4.421 9.865-9.859.001-2.636-1.02-5.115-2.875-6.973-1.857-1.857-4.341-2.879-6.98-2.88-5.446 0-9.873 4.42-9.876 9.86-.001 1.967.514 3.89 1.493 5.583L1.82 21.196l4.827-1.266z"/>
              </svg>
              Contactar por WhatsApp
            </a>
          </div>
        {/if}
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
        <p class="text-sm text-yellow-700 font-bold">No se encontraron propiedades disponibles en este catálogo.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow duration-300">
            <img class="h-48 w-full object-cover bg-slate-100" src={propiedad.imagen_url} alt={propiedad.titulo} />
            <div class="p-6">
              <h3 class="text-lg font-bold text-slate-900 mb-2">{propiedad.titulo}</h3>
              <p class="text-2xl font-black text-blue-600 mb-4">
                ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN
              </p>
              <a 
                href="/{propiedad.slug}" 
                class="block text-center bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors"
              >
                Ver Detalles
              </a>
            </div>
          </div>
        {/each}
      </div>
    {/if}

  </div>
</main>
