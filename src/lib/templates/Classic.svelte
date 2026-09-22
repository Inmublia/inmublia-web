<!-- src/lib/templates/Classic.svelte -->
<script>
  import { Search, MapPin, Heart, Sparkles } from 'lucide-svelte';
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

<main class="min-h-screen bg-white font-sans flex flex-col justify-between selection:bg-slate-900 selection:text-white">
  
  <!-- HERO SECTION -->
  <div class="relative w-full bg-slate-50 pt-6 pb-24 md:pt-10 md:pb-32 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
    <nav class="max-w-7xl mx-auto flex justify-between items-center mb-16 md:mb-24">
      <!-- 🚀 FIX: Eliminado el icono de edificio. Branding limpio y elegante. -->
      <span class="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
        {broker.nombre_comercial}
      </span>
      {#if broker.avatar_url}
        <img src={broker.avatar_url} alt="Asesor" class="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm border border-gray-200">
      {/if}
    </nav>

    <div class="max-w-4xl mx-auto text-center relative z-10">
      <h1 class="text-4xl sm:text-6xl md:text-7xl font-bold text-slate-900 tracking-tight mb-8">
        Encuentra tu lugar <br><span class="text-slate-400 font-medium">en el mundo.</span>
      </h1>
      
      <!-- 🚀 BUSCADOR FLOTANTE FUNCIONAL -->
      <div class="mt-10 mx-auto max-w-3xl bg-white rounded-full shadow-lg border border-gray-200 p-2 flex flex-col sm:flex-row items-center transition-all duration-300 hover:shadow-xl">
        
        <div class="flex-1 w-full sm:w-auto px-6 py-3 hover:bg-gray-50 rounded-full transition cursor-text group text-left">
          <label class="block text-[10px] font-bold text-slate-800 uppercase tracking-wider">Ubicación</label>
          <input 
            type="text" 
            bind:value={filtroUbicacion} 
            placeholder="¿Dónde quieres buscar?" 
            class="w-full bg-transparent outline-none text-sm text-slate-600 placeholder-slate-400 truncate pt-1"
          >
        </div>

        <div class="hidden sm:block w-px h-10 bg-gray-200 mx-2"></div>

        <div class="flex-1 w-full sm:w-auto px-6 py-3 hover:bg-gray-50 rounded-full transition cursor-pointer relative text-left">
          <label class="block text-[10px] font-bold text-slate-800 uppercase tracking-wider">Inmueble</label>
          <select 
            bind:value={filtroTipo} 
            class="w-full bg-transparent outline-none text-sm text-slate-600 appearance-none cursor-pointer pt-1"
          >
            {#each tiposDisponibles as tipo}
              <option value={tipo}>{tipo}</option>
            {/each}
          </select>
        </div>

        <button 
          onclick={hacerScrollResultados}
          class="w-full sm:w-auto mt-2 sm:mt-0 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full flex items-center justify-center gap-2 font-bold transition transform active:scale-95 shadow-md"
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
      <h2 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-slate-400" /> 
        {propiedadesFiltradas.length} {propiedadesFiltradas.length === 1 ? 'resultado' : 'resultados'}
      </h2>
    </div>

    {#if propiedadesFiltradas.length === 0}
      <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
        <MapPin class="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 class="text-xl font-bold text-slate-900 mb-2">No encontramos coincidencias</h3>
        <p class="text-slate-500">Intenta buscar en otra zona o cambia el tipo de espacio.</p>
        <button onclick={() => { filtroUbicacion = ''; filtroTipo = 'Todos'; }} class="mt-6 px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition">Limpiar filtros</button>
      </div>
    {:else}
      <!-- 🚀 FIX: Grid estructurado con gap correcto (gap-y-12) para que las tarjetas no colapsen hacia abajo -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
        {#each propiedadesFiltradas as propiedad}
          <a href="/{propiedad.slug}" class="group block cursor-pointer flex flex-col h-full">
            <!-- Contenedor Imagen -->
            <div class="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 mb-4">
              
              <div class="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm {propiedad.estatus === 'Vendida' ? 'text-rose-700' : 'text-slate-900'} text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
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
            
            <!-- 🚀 FIX: Textos de Tarjeta con separación, flex-col, y truncamiento estricto (line-clamp) -->
            <div class="flex flex-col flex-1 px-1">
              <h3 class="font-bold text-slate-900 text-base leading-tight mb-1 line-clamp-1">{propiedad.ubicacion}</h3>
              <p class="text-slate-500 text-sm line-clamp-1 mb-1">{propiedad.titulo}</p>
              
              <div class="mt-auto pt-2 flex flex-col gap-1">
                <p class="text-slate-500 text-sm">{propiedad.recamaras} recámaras • {propiedad.banos} baños</p>
                <p class="text-slate-900 font-black mt-1 text-base tracking-tight">
                  {formatearDinero(propiedad.precio)} <span class="font-medium text-xs text-slate-500 ml-1">MXN</span>
                </p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>

  <!-- FOOTER -->
  <footer class="bg-slate-50 border-t border-slate-200 py-12 mt-auto">
    <div class="max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        {#if broker.avatar_url}
          <img src={broker.avatar_url} alt={broker.nombre_comercial} class="w-12 h-12 rounded-full object-cover border border-slate-200">
        {/if}
        <div>
          <h3 class="font-bold text-slate-900 text-sm">{broker.nombre_comercial}</h3>
          <p class="text-slate-500 text-xs">{broker.bio || 'Asesoría Inmobiliaria de Confianza'}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-4 text-slate-500">
        <SocialLinks {broker} isDark={false} />
      </div>
    </div>
  </footer>
</main>
