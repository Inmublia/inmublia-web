<script>
  import { ArrowRight, MapPin } from 'lucide-svelte';
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  import videoFondo from '$lib/luxury.mp4'; 
  
  let { broker, propiedades } = $props();
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<main class="min-h-screen bg-black font-sans text-white selection:bg-white selection:text-black">
  <nav class="fixed top-0 w-full z-50 py-6 px-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
    <h1 class="text-xl font-bold tracking-[0.2em] uppercase drop-shadow-md text-white/90">{broker.nombre_comercial}</h1>
    {#if broker.avatar_url}
      <img src={broker.avatar_url} alt="Logo" class="w-12 h-12 rounded-full object-cover shadow-2xl border border-white/10">
    {/if}
  </nav>

  <div class="flex flex-col snap-y snap-mandatory h-screen overflow-y-scroll scroll-smooth">
    
    <div class="snap-start w-full h-screen relative flex items-center justify-center shrink-0 overflow-hidden">
      <div class="absolute inset-0 bg-black z-0">
        <video autoplay muted playsinline loop class="absolute inset-0 w-full h-full object-cover opacity-70">
          <source src={videoFondo} type="video/mp4">
        </video>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10 pointer-events-none"></div>
      
      <div class="relative z-20 text-center flex flex-col items-center">
        <h2 class="text-5xl md:text-8xl font-black uppercase tracking-tighter mix-blend-overlay opacity-90 drop-shadow-2xl text-white">{broker.nombre_comercial}</h2>
        <div class="mt-16 animate-bounce">
          <ArrowRight class="w-6 h-6 mx-auto text-white/50 rotate-90" />
        </div>
      </div>
    </div>

    {#each propiedades as propiedad}
      <div class="snap-start w-full h-screen relative flex items-end shrink-0 group">
        <div class="absolute inset-0 bg-black z-0">
          <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none"></div>
        
        <div class="relative z-20 w-full max-w-[1400px] mx-auto px-8 pb-24 md:pb-32 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div class="max-w-4xl">
            <p class="text-blue-500 font-bold tracking-[0.3em] uppercase text-[10px] mb-4 flex items-center gap-2"><MapPin class="w-3.5 h-3.5" /> {propiedad.ubicacion}</p>
            <h3 class="text-5xl md:text-7xl font-black leading-tight mb-4 drop-shadow-2xl tracking-tighter">{propiedad.titulo}</h3>
            <p class="text-2xl font-medium text-white/80">{formatearDinero(propiedad.precio)}</p>
          </div>
          
          <a href="/{propiedad.slug}" class="bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 font-bold py-4 px-10 rounded-full transition-all duration-300 uppercase tracking-widest text-[10px] text-center shrink-0 flex items-center gap-2">
            Adentrarse <ArrowRight class="w-4 h-4" />
          </a>
        </div>
      </div>
    {/each}

    <div class="snap-start w-full h-screen relative flex items-center justify-center shrink-0 bg-[#050505]">
      <div class="text-center flex flex-col items-center">
        <h2 class="text-4xl md:text-6xl font-black uppercase tracking-widest text-white/90 mb-8">{broker.nombre_comercial}</h2>
        <SocialLinks {broker} isDark={true} />
      </div>
    </div>
    
  </div>
</main>
