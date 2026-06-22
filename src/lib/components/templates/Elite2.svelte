<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, LayoutGrid, MapPin, BedDouble, 
    Bath, Maximize, Car, Compass, Play, 
    MessageCircle, Send
  } from 'lucide-svelte';
  
  import Tiktok from '$lib/components/icons/Tiktok.svelte'; 

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  let urlPideBrochure = $derived($page.url.searchParams.get('brochure') === 'true');
  let tienePlanPremium = $derived(broker?.plan_suscripcion === 'pro' || broker?.plan_suscripcion === 'elite');
  let isBrochure = $derived(urlPideBrochure && tienePlanPremium);

  let enviando = $state(false);

  // Formateador de moneda dinámico (Usando la lógica que definimos en el SEO)
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

  // INYECCIÓN DE PÍXELES CON EVENTO DE VISUALIZACIÓN DE PRODUCTO (CORREGIDA)
  const START_SCR = '<scr'+'ipt>';
  const END_SCR = '</scr'+'ipt>';

  let metaPixel = $derived(broker?.pixel_fb ? `
    ${START_SCR}
      fbq('track', 'PageView');
      fbq('track', 'ViewContent', {
        content_name: '${propiedad.titulo}',
        content_ids: ['${propiedad.id}'],
        content_type: 'product',
        value: ${propiedad.precio},
        currency: '${moneda}'
      });
    ${END_SCR}
  ` : '');

  let googlePixel = $derived(broker?.pixel_google ? `
    ${START_SCR}
      gtag('event', 'view_item', {
        currency: '${moneda}',
        value: ${propiedad.precio},
        items: [{ item_id: '${propiedad.id}', item_name: '${propiedad.titulo}' }]
      });
    ${END_SCR}
  ` : '');

  let tiktokPixel = $derived(broker?.pixel_tiktok ? `
    ${START_SCR}
        ttq.track('ViewContent', {
          contents: [{ content_id: '${propiedad.id}', content_name: '${propiedad.titulo}', price: ${propiedad.precio}, quantity: 1 }],
          value: ${propiedad.precio},
          currency: '${moneda}'
        });
    ${END_SCR}
  ` : '');

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
  /* Efecto de máscara de cristal ahumado para secciones inferiores - OSCURO */
  .cinematic-glass {
    background: rgba(10, 10, 12, 0.7);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
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
</style>

<svelte:window onkeydown={(e) => {
  if (isGalleryOpen) {
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  }
}}/>

<svelte:head>
  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200">
    <button class="absolute top-6 right-6 text-white bg-slate-900 p-4 rounded-full z-[210]" onclick={closeGallery}>
      <X class="w-6 h-6" />
    </button>
    <button class="absolute left-6 text-white bg-slate-900 p-4 rounded-full z-[210]" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8" />
    </button>
    <div class="relative max-w-[90vw] max-h-[85vh]">
      <img src={allPhotos[currentImageIndex]} alt="Vista" class="max-w-full max-h-full object-contain rounded-2xl shadow-2xl">
    </div>
    <button class="absolute right-6 text-white bg-slate-900 p-4 rounded-full z-[210]" onclick={nextImage}>
      <ChevronRight class="w-8 h-8" />
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20una%20visita%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-8 right-8 bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-[100] flex items-center gap-2 px-4 shadow-lg shadow-black/30">
    <MessageCircle class="w-5 h-5" /> <span class="font-bold text-sm">WhatsApp</span>
  </a>
{/if}

<main class="relative w-full bg-[#0a0a0c] font-sans text-white overflow-x-hidden selection:bg-indigo-600 selection:text-white">
  
  <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent pt-8 pb-16">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-center">
      <span class="text-[10px] font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-md">{broker.nombre_comercial}</span>
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
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black"></div>
    {:else}
      <img src={propiedad.imagen_url} alt="Fondo" class="w-full h-full object-cover opacity-50 scale-105" />
      <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black"></div>
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

  <div class="relative z-10 w-full cinematic-glass shadow-[0_-30px_100px_rgba(0,0,0,0.5)] border-t border-white/5 pb-32">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 pt-20">
      
      <div class="flex flex-wrap justify-between gap-8 mb-24 border-b border-white/10 pb-16">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center"><BedDouble class="w-5 h-5 text-slate-600" /></div>
          <div><p class="text-2xl font-bold">{propiedad.recamaras || '0'}</p><p class="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Habitaciones</p></div>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center"><Bath class="w-5 h-5 text-slate-600" /></div>
          <div><p class="text-2xl font-bold">{propiedad.banos || '0'}</p><p class="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Baños</p></div>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center"><Maximize class="w-5 h-5 text-slate-600" /></div>
          <div><p class="text-2xl font-bold">{propiedad.m2_construccion || '0'}</p><p class="text-[10px] uppercase font-bold text-slate-600 tracking-widest">M² Const.</p></div>
        </div>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-slate-900/50 border border-white/5 flex items-center justify-center"><Car class="w-5 h-5 text-slate-600" /></div>
          <div><p class="text-2xl font-bold">{propiedad.estacionamientos || '0'}</p><p class="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Garaje</p></div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-32 mb-24">
        <div class="lg:col-span-5">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-10 text-slate-600">Descripción</h2>
          <div class="text-lg font-light leading-relaxed text-slate-300 whitespace-pre-line">
            {propiedad.descripcion}
          </div>
        </div>

        <div class="lg:col-span-7">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-10 text-slate-600">Galería de Escenas</h2>
          <div class="grid grid-cols-2 gap-4">
            {#each allPhotos.slice(0, 4) as foto, idx}
              <button class="relative overflow-hidden rounded-3xl group {idx === 0 ? 'col-span-2 aspect-[21/9]' : 'aspect-square'}" onclick={() => openGallery(idx)}>
                <img src={foto} alt="Escena" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 filter grayscale-[20%] group-hover:grayscale-0">
                <div class="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-all"></div>
                {#if idx === 3 && allPhotos.length > 4}
                  <div class="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center">
                    <span class="text-white font-black text-xs tracking-widest">+ {allPhotos.length - 4} FOTOS</span>
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      </div>

      {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
        <div class="mb-32 bg-[#1a1a1e] rounded-[3rem] p-8 md:p-16 shadow-xl shadow-slate-900/50 border border-white/5">
          <h2 class="text-[11px] font-black uppercase tracking-[0.4em] mb-12 text-center text-slate-600 hover:text-white transition-colors">Experiencia Virtual Interactiva</h2>
          <div class="relative w-full pb-[50%] h-0 rounded-[2rem] overflow-hidden border-8 border-slate-900">
            <iframe title="3D Tour" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700" allowfullscreen></iframe>
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

      <div class="mt-40 pt-20 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-12">
        <div class="flex items-center gap-8">
          <div class="w-20 h-20 rounded-3xl overflow-hidden shadow-lg shadow-slate-900 border border-white/5 grayscale hover:grayscale-0 transition-all duration-700">
            <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=1a1a1e&color=fff`} alt="Agente" class="w-full h-full object-cover">
          </div>
          <div>
            <p class="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Asesor Responsable</p>
            <h4 class="text-xl font-bold text-white">{broker.nombre_comercial}</h4>
            <p class="text-slate-400 text-sm mt-1">Inmublia Certified Partner</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          {#if broker.facebook}
            <a href={broker.facebook} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all"><Facebook class="w-5 h-5" /></a>
          {/if}
          {#if broker.instagram}
            <a href={broker.instagram} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all"><Instagram class="w-5 h-5" /></a>
          {/if}
          {#if broker.linkedin}
            <a href={broker.linkedin} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all"><Linkedin class="w-4 h-4" /></a>
          {/if}
          {#if broker.tiktok}
            <a href={broker.tiktok} target="_blank" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900/50 border border-white/5 text-slate-500 hover:bg-indigo-600 hover:text-white transition-all">
              <Tiktok class="w-5 h-5" />
            </a>
          {/if}
        </div>
      </div>

    </div>
  </div>
</main>
