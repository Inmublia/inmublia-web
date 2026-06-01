<script>
  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.brokerActivo);
</script>

<svelte:head>
  <!-- Etiquetas SEO y Open Graph para WhatsApp/Facebook -->
  <title>{propiedad.titulo} | {broker ? broker.toUpperCase() : 'Inmublia'}</title>
  <meta name="description" content="Propiedad disponible por ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN." />
  <meta property="og:title" content={propiedad.titulo} />
  <meta property="og:description" content="Propiedad disponible por ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} MXN." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:type" content="website" />
</svelte:head>

<main class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
    
    <!-- Botón de regreso -->
    <div class="p-6 border-b border-slate-100">
      <a href="/" class="text-blue-600 hover:text-blue-800 font-semibold flex items-center transition-colors">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver al catálogo
      </a>
    </div>

    <img class="w-full h-96 object-cover bg-slate-100" src={propiedad.imagen_url} alt={propiedad.titulo} />
    
    <div class="p-8">
      <div class="flex justify-between items-start">
        <div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700 mb-4 uppercase tracking-wider">
            ID BROKER: {propiedad.broker_id}
          </span>
          <h1 class="text-3xl font-extrabold text-slate-900 mb-4">{propiedad.titulo}</h1>
        </div>
        <p class="text-4xl font-black text-blue-600">
          ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-xl text-slate-500 font-medium">MXN</span>
        </p>
      </div>

      <div class="mt-8 border-t border-slate-100 pt-8">
        <h2 class="text-xl font-bold text-slate-900 mb-4">Acerca de esta propiedad</h2>
        <p class="text-slate-600 leading-relaxed">
          Esta es la estructura definitiva de la página. Aquí iremos agregando componentes como la galería de imágenes real, mapa de ubicación, amenidades y detalles específicos (habitaciones, metros cuadrados) directamente desde la base de datos de Supabase.
        </p>
      </div>

      <!-- CTA de Contacto -->
      <div class="mt-10 bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
        <h3 class="text-lg font-bold text-slate-900 mb-2">¿Te interesa esta propiedad?</h3>
        <p class="text-slate-600 mb-4">Contacta directamente a {broker ? broker.replace('-', ' ') : 'nuestro agente'} para agendar una visita.</p>
        <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-sm transition-colors w-full sm:w-auto">
          Contactar por WhatsApp
        </button>
      </div>
    </div>

  </div>
</main>
