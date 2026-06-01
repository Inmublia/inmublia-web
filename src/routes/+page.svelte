<script>
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

<!-- Globo Flotante de WhatsApp Oficial -->
{#if broker && broker.whatsapp}
  <a 
    href="https://wa.me/{broker.whatsapp}" 
    target="_blank" 
    class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group"
    aria-label="Contactar por WhatsApp"
  >
    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
    <span class="absolute right-full mr-4 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
      Chatea conmigo
    </span>
  </a>
{/if}

<main class="min-h-screen bg-slate-50 font-sans">
  
  <!-- HERO SECTION -->
  <div class="relative bg-slate-900 overflow-hidden">
    <div class="absolute inset-0">
      <img class="w-full h-full object-cover opacity-40" src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop" alt="Real Estate Background">
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
    </div>
    
    <div class="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
      {#if broker}
        <h1 class="text-4xl font-black text-white tracking-tight sm:text-6xl md:text-7xl uppercase drop-shadow-lg">
          {broker.nombre_comercial}
        </h1>
        <p class="mt-6 max-w-3xl mx-auto text-xl text-slate-300 font-medium tracking-wide">
          Encuentra la propiedad que define tu estilo de vida.
        </p>
      {:else}
        <!-- Logo Inyectado para Inmuvia Global -->
        <img src="/logo.png" alt="Inmuvia Logo" class="h-24 md:h-32 mx-auto mb-8 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500">
        
        <h1 class="text-4xl font-black text-white tracking-tight sm:text-6xl md:text-7xl drop-shadow-lg">
          Inmuvia Global
        </h1>
        <p class="mt-6 max-w-3xl mx-auto text-xl text-slate-300 font-medium">
          El motor de búsqueda inmobiliario más avanzado.
        </p>
      {/if}

      <!-- Buscador Falso (Showcase UI) -->
      <div class="mt-10 max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-2 sm:p-4 flex flex-col sm:flex-row gap-2">
        <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ubicación</label>
          <input type="text" placeholder="¿Dónde quieres vivir?" class="w-full focus:outline-none text-slate-900 font-medium bg-transparent">
        </div>
        <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
          <select class="w-full focus:outline-none text-slate-900 font-medium bg-transparent appearance-none cursor-pointer">
            <option>Casa</option>
            <option>Departamento</option>
            <option>Terreno</option>
          </select>
        </div>
        <div class="flex-1 px-4 py-2 text-left">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Presupuesto</label>
          <select class="w-full focus:outline-none text-slate-900 font-medium bg-transparent appearance-none cursor-pointer">
            <option>Sin límite</option>
            <option>Hasta $5M MXN</option>
            <option>Hasta $10M MXN</option>
          </select>
        </div>
        <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-colors sm:w-auto w-full mt-2 sm:mt-0 flex items-center justify-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          Buscar
        </button>
      </div>
    </div>
  </div>

  <!-- CATEGORÍAS -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        </div>
        <h3 class="font-bold text-slate-800">Casas</h3>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
        </div>
        <h3 class="font-bold text-slate-800">Departamentos</h3>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h3 class="font-bold text-slate-800">Terrenos</h3>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
        </div>
        <h3 class="font-bold text-slate-800">Preventas</h3>
      </div>
    </div>
  </div>

  <!-- SECCIÓN DE PROPIEDADES DESTACADAS -->
  <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-end mb-8">
      <div>
        <h2 class="text-3xl font-black text-slate-900 tracking-tight">Propiedades Destacadas</h2>
        <p class="mt-2 text-slate-500">Seleccionadas rigurosamente para ti.</p>
      </div>
      <a href="#" class="hidden sm:block text-blue-600 font-bold hover:text-blue-800 transition-colors">Ver todas &rarr;</a>
    </div>

    {#if propiedades.length === 0}
      <div class="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
        <p class="text-lg text-slate-400 font-medium">El catálogo está siendo actualizado. Vuelve pronto.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div class="relative h-72 overflow-hidden">
              <div class="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                En Venta
              </div>
              <img 
                class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                src={propiedad.imagen_url} 
                alt={propiedad.titulo} 
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              
              <div class="absolute bottom-4 left-4 right-4 text-white">
                <p class="text-3xl font-black tracking-tight">
                  ${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-sm font-medium uppercase opacity-80">MXN</span>
                </p>
              </div>
            </div>
            
            <div class="p-6 flex flex-col flex-1">
              <h3 class="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{propiedad.titulo}</h3>
              <p class="text-sm text-slate-500 mb-6 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Guadalajara, Jalisco
              </p>
              
              <div class="mt-auto pt-4 border-t border-slate-100 flex justify-between text-slate-600">
                <div class="flex items-center gap-1.5">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                  <span class="font-bold text-sm">4</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
                  <span class="font-bold text-sm">3.5</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                  <span class="font-bold text-sm">350 m²</span>
                </div>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FOOTER / PERFIL DEL BROKER -->
  {#if broker}
    <div class="bg-slate-900 text-white mt-12 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="flex items-center gap-6">
          <div class="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-600 overflow-hidden shrink-0">
            <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=1e293b&color=fff&size=150" alt="Broker" class="w-full h-full object-cover">
          </div>
          <div>
            <h3 class="text-2xl font-bold">{broker.nombre_comercial}</h3>
            <p class="text-blue-400 font-medium mb-2">Especialista en Bienes Raíces</p>
            <p class="text-slate-400 text-sm max-w-md">Asesoría profesional para la compra, venta y renta de propiedades exclusivas. Tu patrimonio en las mejores manos.</p>
          </div>
        </div>
        <div class="flex gap-4 w-full md:w-auto">
          {#if broker.whatsapp}
            <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="flex-1 md:flex-none text-center bg-white text-slate-900 hover:bg-slate-100 font-bold py-3 px-6 rounded-lg transition-colors">
              Enviar Mensaje
            </a>
          {/if}
          <button class="flex-1 md:flex-none text-center border border-slate-600 hover:border-white text-white font-bold py-3 px-6 rounded-lg transition-colors">
            Agendar Llamada
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
