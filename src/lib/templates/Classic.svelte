<!-- src/lib/templates/Classic.svelte -->
<script>
  import { Search, MapPin, Heart, Sparkles, Building2 } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  
  let { broker, propiedades } = $props();
  
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    maximumFractionDigits: 0 
  }).format(valor);

  // 🚀 ESTADOS DE BÚSQUEDA (REACTIVOS)
  let filtroUbicacion = $state('');
  let filtroTipo = $state('Todos');

  // Extraer tipos de inmueble únicos dinámicamente de tu base de datos
  let tiposDisponibles = $derived([
    'Todos', 
    ...new Set(propiedades.map(p => p.tipo_inmueble || p.tipo || 'Propiedad').filter(Boolean))
  ]);

  // 🚀 MOTOR DE FILTRADO EN TIEMPO REAL
  let propiedadesFiltradas = $derived(propiedades.filter(p => {
    const ubicacionValida = filtroUbicacion === '' || 
      (p.ubicacion || '').toLowerCase().includes(filtroUbicacion.toLowerCase()) || 
      (p.titulo || '').toLowerCase().includes(filtroUbicacion.toLowerCase());
    
    const tipoValido = filtroTipo === 'Todos' || (p.tipo_inmueble || p.tipo) === filtroTipo;

    return ubicacionValida && tipoValido;
  }));

  // Navegación suave a los resultados
  function hacerScrollResultados() {
    document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<main class="min-h-screen bg-white font-sans flex flex-col justify-between selection:bg-[#FF385C] selection:text-white">
  
  <!-- HERO SECTION (Estilo Airbnb) -->
  <div class="relative w-full bg-slate-50 pt-6 pb-24 md:pt-10 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
    <nav class="max-w-7xl mx-auto flex justify-between items-center mb-16 md:mb-24">
      <span class="text-2xl font-black tracking-tighter text-[#FF385C] flex items-center gap-2">
        <Building2 class="w-8 h-8" />
        {broker.nombre_comercial}
      </span>
      {#if broker.avatar_url}
        <img src={broker.avatar_url} alt="Asesor" class="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200">
      {/if}
    </nav>

    <div class="max-w-4xl mx-auto text-center relative z-10">
      <h1 class="text-4xl sm:text-6xl md:text-7xl font-bold text-gray-900 tracking-tight mb-8">
        Encuentra tu lugar <br><span class="text-gray-400 font-medium">en el mundo.</span>
      </h1>
      
      <!-- 🚀 BUSCADOR FLOTANTE TIPO AIRBNB -->
      <div class="mt-10 mx-auto max-w-3xl bg-white rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.08)] border border-gray-200 p-2 flex flex-col sm:flex-row items-center transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        
        <!-- Bloque Ubicación -->
        <div class="flex-1 w-full sm:w-auto px-6 py-3 hover:bg-gray-100 rounded-full transition cursor-text group">
          <label class="block text-[10px] font-bold text-gray-800 uppercase tracking-wider">Dónde</label>
          <input 
            type="text" 
            bind:value={filtroUbicacion} 
            placeholder="Busca por zona o ciudad" 
            class="w-full bg-transparent outline-none text-sm text-gray-600 placeholder-gray-400 truncate pt-1"
          >
        </div>

        <div class="hidden sm:block w-px h-10 bg-gray-200 mx-2"></div>

        <!-- Bloque Tipo -->
        <div class="flex-1 w-full sm:w-auto px-6 py-3 hover:bg-gray-100 rounded-full transition cursor-pointer relative">
          <label class="block text-[10px] font-bold text-gray-800 uppercase tracking-wider">Tipo de Espacio</label>
          <select 
            bind:value={filtroTipo} 
            class="w-full bg-transparent outline-none text-sm text-gray-600 appearance-none cursor-pointer pt-1"
          >
            {#each tiposDisponibles as tipo}
              <option value={tipo}>{tipo}</option>
            {/each}
          </select>
        </div>

        <!-- Botón Circular -->
        <button 
          onclick={hacerScrollResultados}
          class="w-full sm:w-auto mt-2 sm:mt-0 bg-[#FF385C] hover:bg-[#D70466] text-white p-4 rounded-full flex items-center justify-center gap-2 font-bold transition transform active:scale-95 shadow-md"
        >
          <Search class="w-5 h-5" />
          <span class="sm:hidden">Buscar</span>
        </button>
      </div>
    </div>
  </div>

  <!-- CATÁLOGO DE PROPIEDADES -->
  <div id="catalogo" class="max-w-[1600px] mx-auto py-16 px-6 sm:px-10 lg:px-12 w-full flex-1">
    
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-[#FF385C]" /> 
        {propiedadesFiltradas.length} {propiedadesFiltradas.length === 1 ? 'resultado' : 'resultados'}
      </h2>
    </div>

    <!-- Empty State -->
    {#if propiedadesFiltradas.length === 0}
      <div class="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-300">
        <MapPin class="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-gray-900 mb-2">No encontramos coincidencias</h3>
        <p class="text-gray-500">Intenta buscar en otra zona o cambia el tipo de espacio.</p>
        <button onclick={() => { filtroUbicacion = ''; filtroTipo = 'Todos'; }} class="mt-6 px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition">Limpiar filtros</button>
      </div>
    {:else}
      <!-- Grid estilo Airbnb (Tarjetas cuadradas sin bordes pesados) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
        {#each propiedadesFiltradas as propiedad}
          <a href="/{propiedad.slug}" class="group block cursor-pointer">
            <!-- Contenedor Imagen -->
            <div class="relative aspect-square overflow-hidden rounded-2xl mb-3 bg-gray-200">
              
              <div class="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-md {propiedad.estatus === 'Vendida' ? 'text-rose-700' : 'text-gray-900'} text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                {propiedad.estatus === 'Vendida' ? 'No disponible' : 'En Venta'}
              </div>

              <button class="absolute top-3 right-3 z-20 p-2 text-white hover:scale-110 transition active:scale-95 drop-shadow-md">
                <Heart class="w-6 h-6 stroke-[1.5px]" fill={propiedad.estatus === 'Vendida' ? 'currentColor' : 'none'} />
              </button>
              
              {#if propiedad.estatus === 'Vendida'}
                <div class="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center overflow-hidden pointer-events-none">
                  <img src="/sello-vendido.png" alt="Vendido" class="w-[120%] h-auto object-contain opacity-90 -rotate-12 scale-110" />
                </div>
              {/if}

              <img 
                src={propiedad.imagen_url} 
                alt={propiedad.titulo} 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 {propiedad.estatus === 'Vendida' ? 'grayscale-[50%]' : ''}" 
              />
            </div>
            
            <!-- Detalles de Tarjeta -->
            <div class="flex justify-between items-start">
              <div class="pr-2">
                <h3 class="font-bold text-gray-900 text-sm truncate">{propiedad.ubicacion}</h3>
                <p class="text-gray-500 text-sm truncate mt-0.5">{propiedad.titulo}</p>
                <p class="text-gray-500 text-sm mt-0.5">{propiedad.recamaras} recámaras • {propiedad.banos} baños</p>
                <p class="text-gray-900 font-bold mt-1 text-sm">
                  {formatearDinero(propiedad.precio)} <span class="font-normal">MXN</span>
                </p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FOOTER -->
  <footer class="bg-gray-50 border-t border-gray-200 py-10">
    <div class="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        {#if broker.avatar_url}
          <img src={broker.avatar_url} alt={broker.nombre_comercial} class="w-12 h-12 rounded-full object-cover">
        {/if}
        <div>
          <h3 class="font-bold text-gray-900 text-sm">{broker.nombre_comercial}</h3>
          <p class="text-gray-500 text-xs">{broker.bio || 'Asesoría de confianza.'}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4 text-gray-500">
        <SocialLinks {broker} isDark={false} />
      </div>
    </div>
  </footer>
</main>
