<script>
  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);
</script>

<svelte:head>
  <title>{propiedad.titulo} | {broker ? broker.nombre_comercial : 'Inmublia'}</title>
  <meta name="description" content="Propiedad disponible por ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN." />
  <meta property="og:title" content={propiedad.titulo} />
  <meta property="og:description" content="Propiedad disponible por ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:type" content="website" />
</svelte:head>

{#if broker && broker.whatsapp}
  <a 
    href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20obtener%20más%20información%20sobre%20la%20propiedad:%20{encodeURIComponent(propiedad.titulo)}"
    target="_blank" 
    class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group"
    aria-label="Preguntar por esta propiedad"
  >
    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 11.966.01c3.184.001 6.177 1.242 8.425 3.492 2.247 2.25 3.481 5.24 3.48 8.427-.004 6.618-5.34 11.955-11.914 11.955-1.996-.001-3.956-.5-5.717-1.451L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437 0 9.862-4.421 9.865-9.859.001-2.636-1.02-5.115-2.875-6.973-1.857-1.857-4.341-2.879-6.98-2.88-5.446 0-9.873 4.42-9.876 9.86-.001 1.967.514 3.89 1.493 5.583L1.82 21.196l4.827-1.266z"/>
    </svg>
    <span class="absolute right-full mr-4 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
      Preguntar por esta casa
    </span>
  </a>
{/if}

<main class="min-h-screen bg-white">
  <div class="border-b border-slate-100 bg-white sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <a href="/" class="text-slate-500 hover:text-slate-900 font-medium flex items-center transition-colors text-sm uppercase tracking-wider">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Catálogo
      </a>
      {#if broker}
        <span class="text-sm font-bold text-slate-900 tracking-widest uppercase">
          {broker.nombre_comercial}
        </span>
      {/if}
    </div>
  </div>

  <div class="max-w-6xl mx-auto pb-24">
    <div class="w-full h-[50vh] sm:h-[60vh] relative bg-slate-100">
      <img class="w-full h-full object-cover" src={propiedad.imagen_url} alt={propiedad.titulo} />
    </div>
    
    <div class="px-4 sm:px-6 lg:px-8 mt-12 max-w-4xl mx-auto">
      <div class="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-12">
        <div class="flex-1">
          <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {propiedad.titulo}
          </h1>
        </div>
        <div class="shrink-0">
          <p class="text-5xl font-black text-blue-600 tracking-tighter">
            ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-xl text-slate-500 font-medium block md:inline md:ml-1 tracking-normal">MXN</span>
          </p>
        </div>
      </div>

      <div class="border-t border-slate-200 pt-12">
        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Descripción de la Propiedad</h2>
        <div class="prose prose-lg prose-slate text-slate-600">
          <p class="leading-relaxed">
            {propiedad.descripcion || 'Información detallada no disponible en este momento.'}
          </p>
        </div>
      </div>
    </div>
  </div>
</main>
