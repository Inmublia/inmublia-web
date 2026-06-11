<script>
  import { Sparkles } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-[#FDFBF7] font-serif text-[#2C2C2C] flex flex-col justify-between selection:bg-[#2c2c2c] selection:text-white">
  <div>
    <header class="max-w-5xl mx-auto px-6 pt-24 pb-16 border-b border-[#2C2C2C]/10 text-center">
      <p class="text-[9px] font-sans font-bold tracking-[0.3em] uppercase text-[#2C2C2C]/40 mb-6 flex items-center justify-center gap-2">
        <Sparkles class="w-3.5 h-3.5" /> Firma Inmobiliaria
      </p>
      <h1 class="text-5xl md:text-7xl font-normal tracking-tight mb-10 leading-tight">{broker.nombre_comercial}</h1>
      {#if broker.avatar_url}
        <img src={broker.avatar_url} alt="Director" class="w-20 h-20 rounded-full object-cover mx-auto shadow-sm mb-6 grayscale hover:grayscale-0 transition-all duration-500 border border-[#2C2C2C]/20">
      {/if}
      <p class="max-w-2xl mx-auto text-xl font-light italic leading-relaxed text-[#2C2C2C]/70 mt-6">"{broker.bio || 'La curaduría perfecta de espacios para habitar.'}"</p>
    </header>

    <div class="max-w-[1400px] mx-auto px-6 py-20">
      <div class="columns-1 md:columns-2 lg:columns-3 gap-10 space-y-10">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block break-inside-avoid bg-white p-5 shadow-sm hover:shadow-2xl transition-all duration-500 border border-[#2C2C2C]/10">
            <div class="overflow-hidden mb-6 border border-[#2c2c2c]/5">
              <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out">
            </div>
            <p class="text-[9px] font-sans font-bold tracking-[0.2em] uppercase text-[#2C2C2C]/40 mb-2">{propiedad.ubicacion}</p>
            <h3 class="text-2xl font-normal leading-snug mb-4 text-[#2c2c2c]">{propiedad.titulo}</h3>
            <p class="text-lg italic text-[#2C2C2C]/60">{formatearDinero(propiedad.precio)}</p>
          </a>
        {/each}
      </div>
    </div>
  </div>

  <footer class="max-w-5xl mx-auto px-6 py-16 border-t border-[#2C2C2C]/10 mt-12 w-full flex flex-col items-center">
    <p class="text-[#2C2C2C]/40 text-[9px] tracking-widest uppercase font-sans font-bold mb-6">{broker.nombre_comercial} © 2026</p>
    <SocialLinks {broker} />
  </footer>
</main>
