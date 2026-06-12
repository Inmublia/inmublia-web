<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, LayoutGrid, Sparkles, MapPin, BedDouble, 
    Bath, Maximize, Car, Compass, Play
  } from 'lucide-svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  // 🔥 CANDADO DE NEGOCIO: Validamos el Plan para el Smart Brochure
  let urlPideBrochure = $derived($page.url.searchParams.get('brochure') === 'true');
  let tienePlanPremium = $derived(broker?.plan_suscripcion === 'pro' || broker?.plan_suscripcion === 'elite');
  let isBrochure = $derived(urlPideBrochure && tienePlanPremium);

  let enviando = $state(false);

  // INYECCIÓN DE PÍXELES CON EVENTO DE VISUALIZACIÓN DE PRODUCTO
  const START_SCR = '<scr'+'ipt>';
  const END_SCR = '</scr'+'ipt>';

  let metaPixel = $derived(broker?.pixel_fb ? `
    ${START_SCR}
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${broker.pixel_fb}');
      fbq('track', 'PageView');
      fbq('track', 'ViewContent', {
        content_name: '${propiedad.titulo}',
        content_ids: ['${propiedad.id}'],
        content_type: 'product',
        value: ${propiedad.precio},
        currency: 'MXN'
      });
    ${END_SCR}
  ` : '');

  let googlePixel = $derived(broker?.pixel_google ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${broker.pixel_google}"><\/script>
    ${START_SCR}
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${broker.pixel_google}');
      gtag('event', 'view_item', {
        currency: 'MXN',
        value: ${propiedad.precio},
        items: [{ item_id: '${propiedad.id}', item_name: '${propiedad.titulo}' }]
      });
    ${END_SCR}
  ` : '');

  let tiktokPixel = $derived(broker?.pixel_tiktok ? `
    ${START_SCR}
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${broker.pixel_tiktok}');
        ttq.page();
        ttq.track('ViewContent', {
          contents: [{ content_id: '${propiedad.id}', content_name: '${propiedad.titulo}', price: ${propiedad.precio}, quantity: 1 }],
          value: ${propiedad.precio},
          currency: 'MXN'
        });
      }(window, document, 'ttq');
    ${END_SCR}
  ` : '');

  let isNight = $state(true); // Cinematic siempre es oscuro por inmersión

  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  const obtenerIdYouTube = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
    return match ? match[1] : null;
  };

  const obtenerIdMatterport = (url) => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9]{11}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/(?:\/show\/\?m=|\/space\/|m=)([a-zA-Z0-9]{11})/);
    return match ? match[1] : null;
  };

  let videoId = $derived(obtenerIdYouTube(propiedad.video_url));

  function descargarVCard() {
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${broker.nombre_comercial}\nORG:Inmublia Exclusivas\nTITLE:Asesor Inmobiliario\nTEL;TYPE=CELL:${broker.whatsapp}\nNOTE:Especialista en ${propiedad.ubicacion}\nURL:https://${broker.subdominio}.inmublia.com\nEND:VCARD`;
    const blob = new Blob([vcard], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${broker.nombre_comercial.replace(/\s+/g, '_')}_Contacto.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let schemaData = $derived({
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": propiedad.titulo,
    "description": propiedad.descripcion,
    "image": propiedad.imagen_url,
    "offers": { "@type": "Offer", "price": propiedad.precio, "priceCurrency": "MXN" },
    "accommodationCategory": propiedad.tipo,
    "numberOfRooms": propiedad.recamaras,
    "numberOfBathroomsTotal": propiedad.banos,
    "floorSize": { "@type": "QuantitativeValue", "value": propiedad.m2_construccion, "unitCode": "MTK" }
  });

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

  function nextImage(e) {
    if(e) e.stopPropagation();
    currentImageIndex = (currentImageIndex + 1) % allPhotos.length;
  }

  function prevImage(e) {
    if(e) e.stopPropagation();
    currentImageIndex = (currentImageIndex - 1 + allPhotos.length) % allPhotos.length;
  }
</script>

<style>
  /* Efecto de máscara de cristal ahumado para secciones inferiores */
  .cinematic-glass {
    background: rgba(10, 10, 12, 0.7);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
  }
  
  /* Escalado de Iframe para cubrir toda la pantalla sin bordes negros */
  .video-bg {
    width: 100vw;
    height: 56.25vw; /* 16:9 Aspect Ratio */
    min-height: 100vh;
    min-width: 177.77vh; /* 16:9 Aspect Ratio */
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
  <title>{propiedad.titulo} | {broker.nombre_comercial}</title>
  <meta property="og:title" content="{propiedad.titulo} | Exclusiva" />
  <meta property="og:description" content="{propiedad.operacion} en {propiedad.ubicacion} por {formatearPrecio(propiedad.precio)}." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:type" content="website" />
  <script type="application/ld+json">{@html JSON.stringify(schemaData)}</script>

  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

{#snippet socialLinks(b)}
  <div class="flex items-center gap-5 mt-4">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black transition-all" aria-label="Facebook"><Facebook class="w-4 h-4" /></a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black transition-all" aria-label="Instagram"><Instagram class="w-4 h-4" /></a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center border border-white/20 text-white hover:bg-white hover:text-black transition-all" aria-label="LinkedIn"><Linkedin class="w-4 h-4" /></a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar" class="absolute top-6 right-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}>
      <X class="w-6 h-6 pointer-events-none" />
    </button>
    <button aria-label="Anterior" class="absolute left-4 sm:left-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8 pointer-events-none" />
    </button>
    <div class="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-[10px] font-bold tracking-[0.3em] uppercase">
        Escena {currentImageIndex + 1} de {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente" class="absolute right-4 sm:right-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}>
      <ChevronRight class="w-8 h-8 pointer-events-none" />
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20un%20recorrido%20cinematográfico%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-8 right-8 bg-white/5 backdrop-blur-md border border-white/20 text-white p-4 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.8)] hover:scale-110 hover:bg-white/10 transition-all duration-500 z-[100] flex items-center justify-center group" aria-label="Contactar por WhatsApp">
    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>
{/if}

<main class="relative w-full bg-zinc-950 font-sans text-white overflow-x-hidden">
  
  <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent pt-8 pb-16 pointer-events-none">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-center pointer-events-auto">
      <span class="text-xs font-bold uppercase tracking-[0.3em] text-white/90">{broker.nombre_comercial}</span>
      
      {#if isBrochure}
        <span class="bg-black/50 backdrop-blur-md text-white/70 text-[9px] font-bold uppercase tracking-[0.3em] px-5 py-2 border border-white/10 flex items-center gap-2">
          <Play class="w-3 h-3" /> Cinematic Edition
        </span>
      {:else}
        <a href="https://{broker.subdominio}.inmublia.com" class="text-white/60 hover:text-white text-[9px] font-bold uppercase tracking-[0.3em] transition-colors flex items-center gap-2">
          <LayoutGrid class="w-3 h-3" /> Regresar al Catálogo
        </a>
      {/if}
    </div>
  </nav>

  <div class="fixed inset-0 w-full h-screen z-0 bg-black pointer-events-none">
    {#if videoId}
      <div class="absolute inset-0 w-full h-full overflow-hidden opacity-70">
        <iframe
          src="https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=1&playlist={videoId}&modestbranding=1&playsinline=1"
          class="video-bg"
          frameborder="0"
          allow="autoplay; encrypted-media"
          allowfullscreen>
        </iframe>
      </div>
      <div class="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-zinc-950"></div>
    {:else}
      <img src={propiedad.imagen_url} alt="Fondo" class="w-full h-full object-cover opacity-50 scale-105" />
      <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-zinc-950"></div>
    {/if}
  </div>

  <div class="relative z-10 w-full h-screen flex flex-col justify-end pb-12 md:pb-24">
    <div class="max-w-[1400px] w-full mx-auto px-6 md:px-12 flex flex-col items-center text-center">
      <span class="text-white/70 text-[10px] font-bold uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
        <MapPin class="w-3.5 h-3.5" /> {propiedad.ubicacion}
      </span>
      <h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none drop-shadow-2xl mb-8">
        {propiedad.titulo}
      </h1>
      <p class="text-3xl md:text-4xl font-light text-white/90 drop-shadow-xl">{formatearPrecio(propiedad.precio)}</p>
      
      <div class="mt-16 animate-bounce">
        <span class="block w-px h-12 bg-gradient-to-b from-white to-transparent mx-auto"></span>
      </div>
    </div>
  </div>

  <div class="relative z-10 w-full cinematic-glass shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border-t border-white/5 pb-32">
    
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 pt-20">
      
      <div class="flex flex-wrap justify-center gap-12 md:gap-24 mb-24 border-b border-white/10 pb-16">
        <div class="text-center">
          <p class="text-3xl font-light text-white mb-2">{propiedad.recamaras || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">Habitaciones</p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-light text-white mb-2">{propiedad.banos || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">Baños</p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-light text-white mb-2">{propiedad.m2_construccion ? `${propiedad.m2_construccion}` : '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">M² Cubiertos</p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-light text-white mb-2">{propiedad.estacionamientos || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-[0.3em] text-white/50">Garaje</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-24">
        
        <div class="lg:col-span-5">
          <h2 class="text-[10px] font-bold uppercase tracking-[0.4em] mb-8 text-white/50">Sinopsis del Espacio</h2>
          <div class="prose prose-lg max-w-none font-light leading-relaxed whitespace-pre-line text-zinc-300">
            {propiedad.descripcion}
          </div>
        </div>

        <div class="lg:col-span-7">
          <h2 class="text-[10px] font-bold uppercase tracking-[0.4em] mb-8 text-white/50">Escenas Destacadas</h2>
          {#if allPhotos.length > 1}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {#each allPhotos.slice(0, 4) as foto, idx}
                <div class="relative overflow-hidden cursor-pointer group {idx === 0 ? 'sm:col-span-2 aspect-[21/9]' : 'aspect-square'}" role="button" tabindex="0" onclick={() => openGallery(idx)}>
                  <img src={foto} alt="Escena" class="w-full h-full object-cover transition-transform duration-[3s] ease-out group-hover:scale-110 filter grayscale-[20%] group-hover:grayscale-0">
                  <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  
                  {#if idx === 3 && allPhotos.length > 4}
                    <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
                      <span class="text-white font-bold text-[10px] tracking-[0.3em] uppercase border border-white/20 px-6 py-2">
                        Desbloquear +{allPhotos.length - 4} Vistas
                      </span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
        <div class="mb-24 border-t border-white/10 pt-16">
          <h2 class="text-[10px] font-bold uppercase tracking-[0.4em] mb-8 text-center text-white/50">Exploración 3D (Interactive)</h2>
          <div class="relative w-full pb-[45%] h-0 bg-black border border-white/5">
            <iframe title="Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-700" allowfullscreen></iframe>
          </div>
        </div>
      {/if}

      {#if !isBrochure}
        <div class="max-w-3xl mx-auto mt-32">
          <div class="bg-black/60 border border-white/10 p-12 md:p-16 text-center backdrop-blur-xl">
            <Compass class="w-8 h-8 text-white/30 mx-auto mb-6" />
            <h3 class="text-2xl font-light tracking-widest uppercase mb-4 text-white">Proyección Privada</h3>
            <p class="text-xs font-light text-white/50 mb-10 tracking-widest uppercase">Autorización requerida para dossier financiero</p>
            
            {#if form?.success}
              <div class="font-bold p-4 text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2 mb-8 border border-emerald-500/30 text-emerald-400" role="alert"><CheckCircle2 class="w-4 h-4" /> Autorizado. En breve le contactaremos.</div>
            {:else if form?.error}
              <div class="font-bold p-4 text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2 mb-8 border border-rose-500/30 text-rose-400" role="alert"><AlertCircle class="w-4 h-4" /> {form.error}</div>
            {/if}

            <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-6">
              <input type="hidden" name="propiedad_id" value={propiedad.id}>
              <input type="hidden" name="broker_id" value={broker.id}>
              <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input type="text" name="nombre" required class="w-full bg-transparent border-b border-white/20 text-white px-0 py-4 text-xs font-light tracking-widest uppercase focus:outline-none focus:border-white transition-colors placeholder:text-white/30" placeholder="Nombre de Registro">
                <input type="tel" name="telefono" required class="w-full bg-transparent border-b border-white/20 text-white px-0 py-4 text-xs font-light tracking-widest uppercase focus:outline-none focus:border-white transition-colors placeholder:text-white/30" placeholder="Línea Directa">
              </div>
              <input type="email" name="correo" required class="w-full bg-transparent border-b border-white/20 text-white px-0 py-4 text-xs font-light tracking-widest uppercase focus:outline-none focus:border-white transition-colors placeholder:text-white/30" placeholder="Dirección Corporativa o Privada">
              
              <button type="submit" disabled={enviando} class="w-full mt-10 bg-white text-black py-5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/80 transition-colors disabled:opacity-50">
                {#if enviando}Procesando Alta...{:else}Solicitar Acreditación{/if}
              </button>
            </form>
          </div>
        </div>
      {/if}

      <div class="mt-32 border-t border-white/10 pt-16 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="flex items-center gap-6">
          <div class="w-14 h-14 rounded-full overflow-hidden grayscale">
            <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=0f172a&color=fff`} alt="Director" class="w-full h-full object-cover">
          </div>
          <div>
            <p class="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] mb-1">Director de Ventas</p>
            <h4 class="text-sm font-light text-white tracking-widest uppercase">{broker.nombre_comercial}</h4>
          </div>
        </div>
        
        {@render socialLinks(broker)}
      </div>

    </div>
  </div>
</main>
