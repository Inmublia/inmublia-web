<script>
  import SocialLinks from '$lib/components/SocialLinks.svelte';
  import { UserPlus } from 'lucide-svelte';
  let { broker, propiedades } = $props();
  
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: 'MXN', 
    maximumFractionDigits: 0 
  }).format(valor);
</script>

<main class="min-h-screen bg-[#0a0a0a] font-serif text-slate-200 selection:bg-amber-900 selection:text-white">
  
  <!-- NAVEGACIÓN -->
  <nav class="absolute top-0 w-full z-40 py-8 px-6 md:px-12 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
    <span class="text-lg md:text-xl font-light tracking-[0.2em] text-white uppercase drop-shadow-md">
      {broker.nombre_comercial}
    </span>
    <!-- Avatar pequeño en el header como detalle Premium -->
    {#if broker.avatar_url}
      <img src={broker.avatar_url} alt="Broker" class="w-10 h-10 rounded-full border border-white/20 object-cover shadow-lg">
    {/if}
  </nav>

  <!-- HERO SECTION (Iluminado) -->
  <div class="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
    <!-- 🚀 FIX: Bajamos la opacidad del negro de 50% a 20% para que la imagen respire -->
    <div class="absolute inset-0 bg-black/20 z-10"></div> 
    
    <img 
      src={propiedades[0]?.imagen_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000'} 
      alt="Luxury Real Estate" 
      class="absolute inset-0 w-full h-full object-cover scale-105 animate-[slowZoom_20s_ease-in-out_infinite_alternate] brightness-110"
    >
    
    <div class="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
      <p class="text-amber-500 text-xs font-sans font-bold tracking-[0.4em] uppercase mb-6 flex items-center justify-center gap-4 drop-shadow-lg">
        <span class="w-12 h-px bg-amber-500/60"></span> Colección Privada <span class="w-12 h-px bg-amber-500/60"></span>
      </p>
      <h1 class="text-5xl md:text-7xl font-light text-white leading-tight mb-8 drop-shadow-2xl">
        Arquitectura que <br><span class="italic font-serif text-white/90">trasciende el tiempo.</span>
      </h1>
    </div>
    <div class="absolute bottom-0 w-full h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10"></div>
  </div>

  <!-- PORTAFOLIO DE PROPIEDADES (Vibrante) -->
  <div class="py-24 max-w-[1600px] mx-auto px-4 md:px-8">
    {#each propiedades as propiedad, index}
      <a href="/{propiedad.slug}" class="group block relative w-full h-[55vh] md:h-[70vh] overflow-hidden mb-12 md:mb-20 rounded-2xl bg-[#111] shadow-2xl border border-white/5">
        
        <!-- 🚀 FIX: Imagen al 90% de opacidad (antes 50%). Ahora la foto es la estrella. -->
        <div class="absolute inset-0 w-full h-full">
          <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1.5s] ease-out">
        </div>
        
        <!-- 🚀 FIX: Gradientes direccionales sutiles que NO tapan el centro de la imagen -->
        <div class="absolute inset-0 bg-gradient-to-r {index % 2 === 0 ? 'from-black/90 via-black/40 to-transparent' : 'from-transparent via-black/40 to-black/90'} z-10"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10"></div>

        <div class="absolute inset-0 flex flex-col justify-end px-6 md:px-20 py-16 {index % 2 === 0 ? 'items-start text-left' : 'items-end text-right'} z-20 pointer-events-none">
          <span class="text-amber-500 text-[10px] font-sans font-black tracking-[0.3em] uppercase mb-4 drop-shadow-md">
            {propiedad.ubicacion}
          </span>
          <h2 class="text-3xl md:text-5xl font-light text-white mb-4 max-w-2xl leading-tight group-hover:text-amber-100 transition-colors drop-shadow-lg">
            {propiedad.titulo}
          </h2>
          <p class="text-xl md:text-2xl text-white/90 font-light tracking-widest drop-shadow-md">
            {formatearDinero(propiedad.precio)}
          </p>
        </div>
      </a>
    {/each}
  </div>

  <!-- 🚀 NUEVA SECCIÓN: IDENTIDAD DEL BROKER Y VCF -->
  <section class="border-t border-white/10 bg-zinc-950 py-32 px-6 relative overflow-hidden">
    <!-- Efecto de luz de fondo cinematográfica -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-900/10 blur-[120px] rounded-full pointer-events-none"></div>

    <div class="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center">
      
      {#if broker.avatar_url}
        <!-- Anillo de marca alrededor de la foto -->
        <div class="p-1 rounded-full bg-gradient-to-b from-amber-500 to-zinc-900 mb-8 shadow-2xl">
          <img src={broker.avatar_url} alt={broker.nombre_comercial} class="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-zinc-950 bg-zinc-900">
        </div>
      {/if}
      
      <h2 class="text-3xl md:text-5xl font-light text-white mb-4 tracking-wide">{broker.nombre_comercial}</h2>
      <p class="text-zinc-400 font-sans text-xs md:text-sm tracking-[0.3em] uppercase mb-12">
        Asesoría Inmobiliaria de Alta Gama
      </p>
      
      <!-- Botón de Tarjeta de Contacto (VCF) -->
      <div class="flex flex-col sm:flex-row gap-6 mb-16 items-center">
        <!-- Asumiendo que tu endpoint es /api/vcf o /api/vcard -->
        <a href="/api/vcf?broker_id={broker.id}" class="group relative px-8 py-4 bg-white text-black font-sans text-xs tracking-[0.2em] font-bold uppercase rounded-sm transition-all hover:scale-105 hover:bg-amber-50 flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95">
          <UserPlus class="w-4 h-4" />
          Guardar Contacto
        </a>
      </div>

      <!-- Redes Sociales escaladas y centradas -->
      <div class="scale-110">
        <SocialLinks {broker} isDark={true} />
      </div>

    </div>
  </section>

  <footer class="py-12 flex flex-col items-center bg-black border-t border-white/5">
    <p class="text-[10px] font-sans font-light tracking-[0.4em] text-white/30 uppercase">
      &copy; {new Date().getFullYear()} {broker.nombre_comercial}
    </p>
  </footer>

</main>
