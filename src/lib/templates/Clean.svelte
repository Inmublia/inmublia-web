<script>
  import { MapPin, Home } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-white font-sans text-slate-900 flex flex-col justify-between">
  <div>
    <nav class="border-b border-slate-100 py-6 px-8 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-40">
      <div class="flex items-center gap-4">
        {#if broker.avatar_url}
          <div class="w-10 h-10 bg-slate-100 overflow-hidden rounded-full border border-slate-200">
            <img src={broker.avatar_url} alt="Logo" class="w-full h-full object-cover">
          </div>
        {/if}
        <h1 class="text-lg font-black tracking-tight">{broker.nombre_comercial}</h1>
      </div>
      <a href="#catalogo" class="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">Ver Portafolio</a>
    </nav>

    <div class="max-w-[1400px] mx-auto px-8 py-32 border-b border-slate-100 bg-slate-50/50">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Home class="w-4 h-4" /> Agencia Inmobiliaria</p>
      <h2 class="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] max-w-5xl text-slate-900">
        {broker.bio || 'Propiedades excepcionales, gestión implacable.'}
      </h2>
    </div>

    <div id="catalogo" class="max-w-[1400px] mx-auto px-8 py-20">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block">
            <div class="aspect-[4/3] bg-slate-100 overflow-hidden mb-6 rounded-2xl shadow-sm border border-slate-200/60 group-hover:shadow-xl group-hover:border-slate-300 transition-all duration-500">
              <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out">
            </div>
            <div class="flex justify-between items-start">
              <div class="pr-6">
                <h3 class="text-lg font-black tracking-tight mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{propiedad.titulo}</h3>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin class="w-3 h-3" /> {propiedad.ubicacion}</p>
              </div>
              <p class="text-xl font-black text-slate-900">{formatearDinero(propiedad.precio)}</p>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </div>
  
  <footer class="max-w-[1400px] mx-auto px-8 py-12 border-t border-slate-100 w-full flex flex-col sm:flex-row items-center justify-between gap-6 mt-12 bg-white">
    <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{broker.nombre_comercial} © 2026</p>
    <SocialLinks {broker} />
  </footer>
</main>
