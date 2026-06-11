<script>
  import { Map, Search } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
  <div>
    <nav class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 sm:px-12 flex justify-between items-center shadow-sm">
      <div class="flex items-center gap-3">
        {#if broker.avatar_url}
          <img src={broker.avatar_url} alt="Logo" class="w-10 h-10 rounded-full object-cover border border-slate-200">
        {/if}
        <span class="text-xl font-black text-slate-900 tracking-tight">{broker.nombre_comercial}</span>
      </div>
    </nav>

    <div class="max-w-5xl mx-auto px-6 py-16">
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 p-2.5 flex flex-col md:flex-row items-center gap-2">
        <div class="flex-1 w-full px-6 py-3 border-b md:border-b-0 md:border-r border-slate-100">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Map class="w-3.5 h-3.5" /> Búsqueda rápida</p>
          <input type="text" placeholder="¿Ciudad, colonia o código?" class="w-full text-slate-900 font-bold focus:outline-none placeholder:text-slate-300 bg-transparent">
        </div>
        <button class="w-full md:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
          <Search class="w-4 h-4" /> Explorar
        </button>
      </div>
    </div>

    <div class="max-w-[1400px] mx-auto px-6 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
            <div class="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5 bg-slate-100">
              <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out">
            </div>
            <div class="px-2">
              <h3 class="font-black text-slate-900 text-lg line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">{propiedad.titulo}</h3>
              <p class="text-xs font-bold text-slate-400 mb-4">{propiedad.ubicacion}</p>
              <div class="flex justify-between items-end border-t border-slate-100 pt-4">
                <p class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{propiedad.recamaras || '-'} rec · {propiedad.banos || '-'} ba</p>
                <p class="font-black text-slate-900 text-xl tracking-tight">{formatearDinero(propiedad.precio)}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </div>

  <footer class="bg-slate-100 border-t border-slate-200 mt-20 py-16 text-center flex flex-col items-center">
    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">{broker.nombre_comercial} © 2026</p>
    <SocialLinks {broker} />
  </footer>
</main>
