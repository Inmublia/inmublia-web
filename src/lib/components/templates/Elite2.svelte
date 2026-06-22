<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, LayoutGrid, MapPin, 
    Compass, Play, Send, Download
  } from 'lucide-svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  // 🔥 CANDADO DE NEGOCIO: Validamos el Plan para el Smart Brochure
  let urlPideBrochure = $derived($page.url.searchParams.get('brochure') === 'true');
  let tienePlanPremium = $derived(broker?.plan_suscripcion === 'pro' || broker?.plan_suscripcion === 'elite');
  let isBrochure = $derived(urlPideBrochure && tienePlanPremium);

  let enviando = $state(false);

  // Formateador de moneda dinámico
  const moneda = $derived(propiedad.moneda || "MXN");
  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { 
    style: 'currency', 
    currency: moneda, 
    maximumFractionDigits: 0 
  }).format(valor);

  const obtenerIdYouTube = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return match ? match[1] : null;
  };

  const obtenerIdMatterport = (url) => {
    if (!url) return null;
    const match = url?.trim().match(/(?:\/show\/\?m=|\/space\/|m=)([a-zA-Z0-9]{11})/);
    return match ? match[1] : null;
  };

  let videoId = $derived(obtenerIdYouTube(propiedad.video_url));

  // 🔥 RESTAURAR VCARD
  function descargarVCardAgente() {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${broker.nombre_comercial}\nORG:Inmublia Certified Broker\nTITLE:Asesor Inmobiliario\nTEL;TYPE=CELL:${broker.whatsapp}\nNOTE:Especialista en ${propiedad.ubicacion}\nURL:https://${broker.subdominio}.inmublia.com\nEND:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${broker.nombre_comercial.replace(/\s+/g, '_')}_Contacto.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let isGalleryOpen = $state(false);
  let currentImageIndex = $state(0);
  
  let allPhotos = $derived(
    propiedad.galeria_urls?.length 
      ? [propiedad.imagen_url, ...propiedad.galeria_urls] 
      : [propiedad.imagen_url]
  );

  function openGallery(index) {
    currentImageIndex = index;
    isGalleryOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeGallery() {
    isGalleryOpen = false;
    document.body.style.overflow = '';
  }

  function nextImage() { currentImageIndex = (currentImageIndex + 1) % allPhotos.length; }
  function prevImage() { currentImageIndex = (currentImageIndex - 1 + allPhotos.length) % allPhotos.length; }
</script>

<style>
  /* Efecto de máscara de cristal ahumado para secciones inferiores */
  .cinematic-glass {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
  }
  
  .video-bg {
    width: 100vw;
    height: 56.25vw;
    min-height: 100vh;
    min-width: 177.77vh;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .video-overlay {
    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(255,255,255,0.1) 70%, #f8fafc 100%);
  }
</style>

<svelte:window onkeydown={(e) => {
  if (isGalleryOpen) {
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  }
}}/>

<svelte:head></svelte:head>

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-white/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-300">
    <button class="absolute top-6 right-6 text-slate-900 bg-slate-100 p-4 rounded-full z-[210]" onclick={closeGallery}>
      <X class="w-6 h-6" />
    </button>
    <button class="absolute left-6 text-slate-900 bg-slate-100 p-4 rounded-full z-[210]" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8" />
    </button>
    <div class="relative max-w-[90vw] max-h-[85vh]">
      <img src={allPhotos[currentImageIndex]} alt="Vista" class="max-w-full max-h-full object-contain rounded-2xl shadow-2xl">
    </div>
    <button class="absolute right-6 text-slate-900 bg-slate-100 p-4 rounded-full z-[210]" onclick={nextImage}>
      <ChevronRight class="w-8 h-8" />
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20un%20recorrido%20cinematográfico%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-8 right-8 bg-white/5 backdrop-blur-md border border-white/20 text-white p-4 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.8)] hover:scale-110 hover:bg-white/10 transition-all duration-500 z-[100] flex items-center justify-center group" aria-label="Contactar por WhatsApp">
    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>
{/if}

<main class="relative w-full bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-indigo-600 selection:text-white">
  
  <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent pt-8 pb-16">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-center">
      <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white drop-shadow-md">{broker.nombre_comercial}</span>
      <a href="https://{broker.subdominio}.inmublia.com" class="bg-white/10 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-[0.3em] px-4 py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all">
        Ver Catálogo
      </a>
    </div>
  </nav>

  <div class="fixed inset-0 w-full h-screen z-0 bg-black pointer-events-none">
    {#if videoId}
      <div class="absolute inset-0 w-full h-full overflow-hidden opacity-70">
        <iframe
          src="https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist={videoId}&modestbranding=1&iv_load_policy=3"
          class="video-bg"
          frameborder="0"
          allow="autoplay; encrypted-media">
        </iframe>
      </div>
      <div class="absolute inset-0 video-overlay"></div>
    {:else}
      <img src={propiedad.imagen_url} alt="Fondo" class="w-full h-full object-cover opacity-50 scale-105" />
      <div class="absolute inset-0 video-overlay"></div>
    {/if}
  </div>

  <div class="relative z-10 w-full h-screen flex flex-col justify-end pb-24 md:pb-32">
    <div class="max-w-[1400px] w-full mx-auto px-6 md:px-12">
      <div class="max-w-4xl text-center flex flex-col items-center">
        <span class="text-white drop-shadow-md text-[10px] font-bold uppercase tracking-[0.5em] mb-6 flex items-center gap-2">
          <MapPin class="w-4 h-4" /> {propiedad.ubicacion}
        </span>
        <h1 class="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl mb-8">
          {propiedad.titulo}
        </h1>
        <p class="text-3xl md:text-5xl font-light text-white/90 drop-shadow-xl">{formatearPrecio(propiedad.precio)}</p>
      </div>
    </div>
  </div>

  <div class="relative z-10 w-full cinematic-glass shadow-[0_-30px_100px_rgba(0,0,0,0.1)] border-t border-white pb-32 rounded-t-[3rem]">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 pt-20">
      
      <div class="flex flex-wrap justify-center gap-8 md:gap-16 mb-24 border-b border-slate-200 pb-16">
        <div class="text-center">
          <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.recamaras || '0'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Hab.</p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.banos || '0'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Baños</p>
        </div>
        {#if propiedad.medio_bano > 0}
          <div class="text-center">
            <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.medio_bano}</p>
            <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Medios Baños</p>
          </div>
        {/if}
        <div class="text-center">
          <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.m2_construccion ? `${propiedad.m2_construccion}` : '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">M² Const.</p>
        </div>
        {#if propiedad.m2_terreno > 0}
          <div class="text-center">
            <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.m2_terreno}</p>
            <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">M² Terreno</p>
          </div>
        {/if}
        <div class="text-center">
          <p class="text-3xl font-light text-slate-800 mb-2">{propiedad.estacionamientos || '0'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Garaje</p>
        </div>
        {#if propiedad.antiguedad}
          <div class="text-center">
            <p class="text-xl font-light text-slate-800 mb-2">{propiedad.antiguedad}</p>
            <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-slate-400">Antigüedad</p>
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-32 mb-24">
        <div class="lg:col-span-5">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-10 text-indigo-600">Descripción</h2>
          <div class="text-lg font-light leading-relaxed text-slate-600 whitespace-pre-line">
            {propiedad.descripcion}
          </div>
        </div>

        <div class="lg:col-span-7">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-10 text-slate-400">Galería de Escenas</h2>
          <div class="grid grid-cols-2 gap-4">
            {#each allPhotos.slice(0, 4) as foto, idx}
              <button class="relative overflow-hidden rounded-3xl group {idx === 0 ? 'col-span-2 aspect-[21/9]' : 'aspect-square'}" onclick={() => openGallery(idx)}>
                <img src={foto} alt="Escena" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105">
                <div class="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all"></div>
                {#if idx === 3 && allPhotos.length > 4}
                  <div class="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center">
                    <span class="text-slate-900 font-black text-xs tracking-widest">+ {allPhotos.length - 4} FOTOS</span>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
        <div class="mb-32 bg-white rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-200/50">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-12 text-center text-indigo-600">Experiencia Virtual Interactiva</h2>
          <div class="relative w-full pb-[50%] h-0 rounded-[2rem] overflow-hidden border-8 border-slate-50">
            <iframe title="3D Tour" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
          </div>
        </div>
      {/if}

      {#if !isBrochure}
        <div class="max-w-2xl mx-auto mt-40">
          <div class="bg-[#1a1a1e] rounded-[3rem] p-12 md:p-20 shadow-2xl shadow-slate-900/50 border border-white/5 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
            <Compass class="w-10 h-10 text-white/30 mx-auto mb-8" />
            <h3 class="text-3xl font-black mb-4 text-white">¿Te gustaría conocerla?</h3>
            <p class="text-slate-500 mb-12">Agenda un recorrido presencial o solicita más información.</p>
            
            {#if form?.success}
              <div class="bg-emerald-950/50 text-emerald-400 p-6 rounded-2xl font-bold mb-8 flex items-center justify-center gap-3 animate-bounce border border-emerald-500/30">
                <CheckCircle2 class="w-5 h-5" /> ¡Solicitud enviada! Te contactaremos pronto.
              </div>
            {:else if form?.error}
              <div class="bg-rose-950/50 text-rose-400 p-6 rounded-2xl font-bold mb-8 flex items-center justify-center gap-3 border border-rose-500/30">
                <AlertCircle class="w-5 h-5" /> {form.error}
              </div>
            {/if}

            <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update(); }; }} class="space-y-6">
              <input type="hidden" name="propiedad_id" value={propiedad.id}>
              <input type="hidden" name="broker_id" value={broker.id}>
              
              <div class="space-y-4">
                <input type="text" name="nombre" required class="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl py-5 px-8 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-700" placeholder="Nombre completo">
                <input type="tel" name="telefono" required class="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl py-5 px-8 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-700" placeholder="WhatsApp / Teléfono">
                <input type="email" name="correo" required class="w-full bg-[#0a0a0c] border border-white/5 rounded-2xl py-5 px-8 text-sm focus:ring-2 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-700" placeholder="Correo electrónico">
              </div>
              
              <button type="submit" disabled={enviando} class="w-full mt-8 bg-white text-black py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-white/80 transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 disabled:opacity-50 disabled:shadow-none">
                {#if enviando}ENVIANDO SOLICITUD...{:else}AGENDAR RECORRIDO <Send class="w-4 h-4" />{/if}
              </button>
            </form>
          </div>
        </div>
      {/if}

      <div class="mt-40 pt-20 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-12 bg-[#1a1a1e] rounded-[3rem] p-16 shadow-lg shadow-slate-900 border border-white/5">
        <div class="flex items-center gap-8">
          <div class="w-20 h-20 rounded-3xl overflow-hidden shadow-lg shadow-black border border-white/5 grayscale hover:grayscale-0 transition-all duration-700">
            <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=1a1a1e&color=fff`} alt="Agente" class="w-full h-full object-cover">
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Asesor Responsable</p>
            <h4 class="text-xl font-bold text-white tracking-widest uppercase">{broker.nombre_comercial}</h4>
            <p class="text-slate-400 text-sm mt-1">Inmublia Certified Partner</p>
            <button onclick={descargarVCardAgente} class="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2">
              <Download class="w-4 h-4" /> Descargar vCard
            </button>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          {#if broker.facebook}
            <a href={broker.facebook} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"><Facebook class="w-5 h-5" /></a>
          {/if}
          {#if broker.instagram}
            <a href={broker.instagram} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"><Instagram class="w-5 h-5" /></a>
          {/if}
          {#if broker.linkedin}
            <a href={broker.linkedin} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"><Linkedin class="w-4 h-4" /></a>
          {/if}
          {#if broker.tiktok}
            <a href={broker.tiktok} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.525.02c1.31 0 2.591.21 3.794.602V4.62a7.1 7.1 0 0 1-2.903-.613v9.077a5.534 5.534 0 0 1-5.533 5.533 5.534 5.534 0 0 1-5.534-5.533 5.534 5.534 0 0 1 5.534-5.533c.12 0 .239.008.356.023V3.68c-.118-.008-.236-.012-.356-.012C3.541 3.668 0 7.209 0 11.579c0 4.37 3.541 7.911 7.911 7.911 4.37 0 7.911-3.541 7.911-7.911V6.162a8.88 8.88 0 0 0 5.867 2.187V4.555a5.535 5.535 0 0 1-3.664-1.921V.02h-5.5zm0 0"/>
              </svg>
            </a>
          {/if}
        </div>
      </div>

    </div>
  </div>
</main>
