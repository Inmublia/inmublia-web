<script>
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-[#0a0a0a] font-serif text-slate-200 selection:bg-amber-900 selection:text-white">
  <nav class="absolute top-0 w-full z-40 py-8 px-8 flex justify-between items-center border-b border-white/10 bg-gradient-to-b from-black/80 to-transparent">
    <span class="text-xl font-light tracking-[0.2em] text-white uppercase">{broker.nombre_comercial}</span>
  </nav>

  <div class="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
    <div class="absolute inset-0 bg-black/50 z-10"></div>
    <img src={propiedades[0]?.imagen_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000'} alt="Luxury Real Estate" class="absolute inset-0 w-full h-full object-cover scale-105 animate-[slowZoom_20s_ease-in-out_infinite_alternate]">
    <div class="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
      <p class="text-amber-500/80 text-xs tracking-[0.4em] uppercase mb-6 flex items-center justify-center gap-3"><span class="w-8 h-px bg-amber-500/50"></span> Colección Privada <span class="w-8 h-px bg-amber-500/50"></span></p>
      <h1 class="text-5xl md:text-7xl font-light text-white leading-tight mb-8">Arquitectura que <br><span class="italic font-serif text-white/80">trasciende el tiempo.</span></h1>
    </div>
    <div class="absolute bottom-0 w-full h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent z-10"></div>
  </div>

  <div class="py-20 max-w-[1600px] mx-auto">
    {#each propiedades as propiedad, index}
      <a href="/{propiedad.slug}" class="group block relative w-full h-[60vh] md:h-[70vh] overflow-hidden mb-4 rounded-sm {index % 2 === 0 ? 'bg-[#111]' : 'bg-[#0f0f0f]'}">
        <div class="absolute inset-0 w-full h-full md:w-3/5 {index % 2 === 0 ? 'right-0' : 'left-0'}">
          <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-50 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-1000 ease-out">
        </div>
        <div class="absolute inset-0 flex flex-col justify-center px-8 md:px-32 {index % 2 === 0 ? 'items-start text-left' : 'items-end text-right'} z-20 pointer-events-none">
          <span class="text-amber-500/80 text-[10px] font-sans font-bold tracking-[0.3em] uppercase mb-4">{propiedad.ubicacion}</span>
          <h2 class="text-3xl md:text-5xl font-light text-white mb-6 max-w-2xl leading-tight group-hover:text-amber-50 transition-colors">{propiedad.titulo}</h2>
          <p class="text-xl text-white/50 font-light tracking-widest">{formatearDinero(propiedad.precio)}</p>
        </div>
        <div class="absolute inset-0 bg-gradient-to-r {index % 2 === 0 ? 'from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent' : 'from-transparent via-[#0a0a0a]/90 to-[#0a0a0a]'} z-10"></div>
      </a>
    {/each}
  </div>

  <footer class="border-t border-white/10 py-24 flex flex-col items-center bg-black">
    <p class="text-sm font-light tracking-[0.3em] text-white/50 uppercase mb-8">{broker.nombre_comercial}</p>
    <SocialLinks {broker} isDark={true} />
  </footer>
</main>
