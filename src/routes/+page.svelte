<script>
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

{#if broker && broker.whatsapp}
  <a 
    href="https://wa.me/{broker.whatsapp}" 
    target="_blank" 
    class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group"
    aria-label="Contactar por WhatsApp"
  >
    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.966.01c3.184.001 6.177 1.242 8.425 3.492 2.247 2.25 3.481 5.24 3.48 8.427-.004 6.618-5.34 11.955-11.914 11.955-1.996-.001-3.956-.5-5.717-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437 0 9.862-4.421 9.865-9.859.001-2.636-1.02-5.115-2.875-6.973-1.857-1.857-4.341-2.879-6.98-2.88-5.446 0-9.873 4.42-9.876 9.86-.001 1.967.514 3.89 1.493 5.583L1.82 21.196l4.827-1.266z"/>
    </svg>
    <span class="absolute right-full mr-4 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      Chatea conmigo
    </span>
  </a>
{/if}

<main class="min-h-screen bg-white">
  <div class="bg-slate-50 border-b border-slate-200">
    <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center">
      {#if broker}
        <h1 class="text-4xl font-black text-slate-900 tracking-tight sm:text-6xl uppercase">
          {broker.nombre_comercial}
        </h1>
        <p class="mt-4 text-xl text-slate-500 font-medium tracking-wide">
          COLECCIÓN EXCLUSIVA DE PROPIEDADES
        </p>
      {:else}
        <h1 class="text-4xl font-black text-slate-900 tracking-tight sm:text-6xl">
          Inmublia Global
        </h1>
        <p class="mt-4 text-xl text-slate-500 font-medium">
          El directorio de bienes raíces más potente
        </p>
      {/if}
    </div>
  </div>

  <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
    {#if propiedades.length === 0}
      <div class="text-center py-20">
        <p class="text-lg text-slate-400 font-medium">El catálogo está siendo actualizado. Vuelve pronto.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div class="relative h-64 overflow-hidden">
              <img 
                class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" 
                src={propiedad.imagen_url} 
                alt={propiedad.titulo} 
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div class="p-6">
              <p class="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-base text-slate-500 font-normal uppercase">MXN</span>
              </p>
              <h3 class="text-lg font-semibold text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1">{propiedad.titulo}</h3>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</main>
