<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, LayoutGrid, Sparkles, MapPin, BedDouble, 
    Bath, Maximize, Car, Compass, Play, Layers
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

  let matterportId = $derived(obtenerIdMatterport(propiedad.recorrido_3d_url));
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
  }

  function closeGallery() {
    isGalleryOpen = false;
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
  /* Scrollbar oculta para el panel lateral */
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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
  <div class="flex items-center gap-4">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-indigo-500 text-white transition-all" aria-label="Facebook"><Facebook class="w-3.5 h-3.5" /></a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-indigo-500 text-white transition-all" aria-label="Instagram"><Instagram class="w-3.5 h-3.5" /></a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-indigo-500 text-white transition-all" aria-label="LinkedIn"><Linkedin class="w-3.5 h-3.5" /></a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/98 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar" class="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-rose-500 p-3 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}>
      <X class="w-6 h-6 pointer-events-none" />
    </button>
    <button aria-label="Anterior" class="absolute left-4 sm:left-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8 pointer-events-none" />
    </button>
    <div class="relative max-w-6xl max-h-[90vh] flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 px-6 py-2 rounded-full text-white text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-md">
        {currentImageIndex + 1} / {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente" class="absolute right-4 sm:right-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}>
      <ChevronRight class="w-8 h-8 pointer-events-none" />
    </button>
  </div>
{/if}

<div class="flex flex-col lg:flex-row w-full h-screen overflow-hidden bg-black font-sans text-white">
  
  <aside class="w-full lg:w-[480px] xl:w-[550px] h-[50vh] lg:h-screen overflow-y-auto hide-scrollbar bg-zinc-950/95 backdrop-blur-3xl border-r border-white/10 flex flex-col z-20 order-2 lg:order-1 relative shadow-[20px_0_60px_rgba(0,0,0,0.5)]">
    
    <div class="p-8 border-b border-white/10 sticky top-0 bg-zinc-950/90 backdrop-blur-xl z-10 flex justify-between items-center">
      <div class="flex items-center gap-3">
        {#if broker.avatar_url}
          <img src={broker.avatar_url} alt="Logo" class="w-8 h-8 rounded-full border border-white/20 object-cover">
        {/if}
        <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/90">{broker.nombre_comercial}</span>
      </div>
      
      {#if !isBrochure}
        <a href="https://{broker.subdominio}.inmublia.com" class="text-white/40 hover:text-white transition-colors p-2" aria-label="Cerrar">
          <X class="w-5 h-5" />
        </a>
      {/if}
    </div>

    <div class="p-8 lg:p-12 flex-1 flex flex-col">
      
      <div class="flex items-center gap-3 mb-6">
        <span class="bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded">
          {propiedad.operacion}
        </span>
        <span class="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
          <MapPin class="w-3.5 h-3.5" /> {propiedad.ubicacion}
        </span>
      </div>

      <h1 class="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] mb-6">
        {propiedad.titulo}
      </h1>

      <div class="mb-10">
        <p class="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-1">Precio de Inversión</p>
        <p class="text-3xl font-light text-white">{formatearPrecio(propiedad.precio)}</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-12">
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
          <BedDouble class="w-5 h-5 text-zinc-500 mb-2" />
          <p class="text-xl font-black">{propiedad.recamaras || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Recámaras</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Bath class="w-5 h-5 text-zinc-500 mb-2" />
          <p class="text-xl font-black">{propiedad.banos || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Baños</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Maximize class="w-5 h-5 text-zinc-500 mb-2" />
          <p class="text-xl font-black">{propiedad.m2_construccion || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">M² Interiores</p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Car class="w-5 h-5 text-zinc-500 mb-2" />
          <p class="text-xl font-black">{propiedad.estacionamientos || '-'}</p>
          <p class="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Garaje</p>
        </div>
      </div>

      <div class="mb-12">
        <h2 class="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-zinc-500">Ficha Descriptiva</h2>
        <div class="prose prose-sm prose-invert max-w-none font-medium leading-relaxed whitespace-pre-line text-zinc-300">
          {propiedad.descripcion}
        </div>
      </div>

      <button onclick={() => openGallery(0)} class="w-full py-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-widest mb-12">
        <LayoutGrid class="w-4 h-4" /> Visualizar {allPhotos.length} Fotografías
      </button>

      {#if !isBrochure}
        <div class="mt-auto pt-8 border-t border-white/10">
          <h3 class="text-lg font-black mb-2 text-white">Solicitar Recorrido</h3>
          <p class="text-[11px] font-medium text-zinc-500 mb-6 leading-relaxed">Conecte directamente con {broker.nombre_comercial} para acceso privado o información financiera.</p>
          
          {#if form?.success}
            <div class="p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 class="w-4 h-4" /> Solicitud Procesada</div>
          {:else if form?.error}
            <div class="p-3 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-6 bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle class="w-4 h-4" /> {form.error}</div>
          {/if}

          <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-4">
            <input type="hidden" name="propiedad_id" value={propiedad.id}>
            <input type="hidden" name="broker_id" value={broker.id}>
            <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
            
            <input type="text" name="nombre" required class="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-indigo-500 px-4 text-xs font-medium text-white placeholder:text-zinc-600 outline-none transition-colors" placeholder="Nombre completo">
            <input type="email" name="correo" required class="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-indigo-500 px-4 text-xs font-medium text-white placeholder:text-zinc-600 outline-none transition-colors" placeholder="Correo electrónico">
            <input type="tel" name="telefono" required class="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-indigo-500 px-4 text-xs font-medium text-white placeholder:text-zinc-600 outline-none transition-colors" placeholder="WhatsApp / Celular">
            
            <button type="submit" disabled={enviando} class="w-full h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors mt-2">
              {#if enviando}Procesando...{:else}Agendar Visita{/if}
            </button>
            
            <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20la%20propiedad:%20{propiedad.titulo}" target="_blank" class="w-full h-14 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-white bg-[#25D366]/20 border border-[#25D366]/30 hover:bg-[#25D366]/30 transition-colors flex items-center justify-center gap-2 mt-3">
              Contactar vía WhatsApp
            </a>
          </form>
        </div>
      {/if}

    </div>
  </aside>

  <div class="flex-1 relative h-[50vh] lg:h-screen bg-black z-10 order-1 lg:order-2">
    
    {#if isBrochure}
      <div class="absolute top-6 right-6 z-30 pointer-events-none">
        <span class="bg-black/60 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest px-4 py-2 rounded border border-white/10 shadow-lg flex items-center gap-2">
          <Layers class="w-3.5 h-3.5 text-indigo-400" /> Panoramic 3D
        </span>
      </div>
    {/if}

    {#if matterportId}
      <iframe title="Recorrido 3D Interactivo" src="https://my.matterport.com/show/?m={matterportId}&play=1&qs=1" class="absolute inset-0 w-full h-full border-0" allowfullscreen allow="xr-spatial-tracking"></iframe>
    {:else if videoId}
      <iframe class="absolute inset-0 w-full h-full border-0" src="https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist={videoId}&modestbranding=1" title="Video Background" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      <div class="absolute inset-0 bg-black/20 pointer-events-none"></div>
    {:else}
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="absolute inset-0 w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent pointer-events-none"></div>
    {/if}

  </div>

</div>
