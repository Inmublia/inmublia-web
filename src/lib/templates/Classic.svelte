<script>
  import { MapPin, Building2, ArrowRight, Sparkles } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
  <div>
    <div class="relative bg-zinc-950 overflow-hidden">
      <div class="absolute inset-0">
        <img class="w-full h-full object-cover opacity-30 mix-blend-luminosity" src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop" alt="Background">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950"></div>
      </div>
      <div class="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl font-black text-white tracking-tight sm:text-6xl md:text-7xl uppercase drop-shadow-2xl">{broker.nombre_comercial}</h1>
        <p class="mt-6 max-w-3xl mx-auto text-lg text-zinc-400 font-medium tracking-wide">Encuentra la propiedad que define tu estilo de vida.</p>
        
        <div class="mt-12 max-w-4xl mx-auto bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 sm:p-3 flex flex-col sm:flex-row gap-2">
          <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-white/10">
            <label class="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MapPin class="w-3 h-3" /> Ubicación</label>
            <input type="text" placeholder="¿Dónde quieres vivir?" class="w-full focus:outline-none text-white font-medium bg-transparent placeholder:text-zinc-600">
          </div>
          <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-white/10">
            <label class="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Building2 class="w-3 h-3" /> Tipo</label>
            <select class="w-full focus:outline-none text-white font-medium bg-transparent appearance-none cursor-pointer">
              <option class="text-black">Casa</option>
              <option class="text-black">Departamento</option>
              <option class="text-black">Terreno</option>
            </select>
          </div>
          <button class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-xl transition-colors sm:w-auto w-full mt-2 sm:mt-0 flex items-center justify-center gap-2 shadow-lg">
            Explorar <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="max-w-[1400px] mx-auto py-20 px-6 sm:px-12">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight mb-10 flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-indigo-500" /> Exclusivas
      </h2>
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white rounded-3xl shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col h-full hover:-translate-y-1">
            <div class="relative h-64 overflow-hidden bg-slate-100">
              <div class="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-widest shadow-sm">En Venta</div>
              <img class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out" src={propiedad.imagen_url} alt={propiedad.titulo} />
            </div>
            <div class="p-6 flex flex-col flex-1 justify-between">
              <div>
                <h3 class="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 line-clamp-2">{propiedad.titulo}</h3>
                <p class="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mb-6 uppercase tracking-wider"><MapPin class="w-3.5 h-3.5 text-slate-400" /> {propiedad.ubicacion}</p>
              </div>
              <p class="text-2xl font-black tracking-tight text-slate-900">{formatearDinero(propiedad.precio)} <span class="text-[10px] font-bold text-slate-400 uppercase">MXN</span></p>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </div>

  <footer class="bg-zinc-950 text-white mt-12 py-16 border-t border-zinc-900">
    <div class="max-w-[1400px] mx-auto px-6 sm:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex items-center gap-6">
        <div class="w-20 h-20 rounded-2xl bg-zinc-800 overflow-hidden shrink-0 shadow-lg border border-zinc-700">
          {#if broker.avatar_url}
            <img src={broker.avatar_url} alt="Foto del Asesor" class="w-full h-full object-cover">
          {:else}
            <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=18181b&color=fff&size=150" alt="Avatar" class="w-full h-full object-cover">
          {/if}
        </div>
        <div>
          <h3 class="text-xl font-bold">{broker.nombre_comercial}</h3>
          <p class="text-indigo-400 font-medium text-sm mt-1">{broker.bio || 'Gestión Inmobiliaria de Alto Nivel'}</p>
        </div>
      </div>
      <div class="flex flex-col items-center md:items-end mt-4 md:mt-0">
        <SocialLinks {broker} isDark={true} />
      </div>
    </div>
  </footer>
</main>
