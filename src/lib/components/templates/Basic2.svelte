<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, 
    ChevronLeft, 
    ChevronRight, 
    Download, 
    Facebook, 
    Instagram, 
    Linkedin, 
    CheckCircle2, 
    AlertCircle,
    Sparkles,
    BedDouble,
    Bath,
    Maximize,
    Car,
    MapPin
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

  let isNight = $state(false);
  onMount(() => {
    const hora = new Date().getHours();
    if (hora >= 19 || hora < 6) {
      isNight = true;
    }
  });

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
  /* Ocultar barra de scroll para el carrusel horizontal */
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
  <meta property="og:description" content="{propiedad.operacion} en {propiedad.ubicacion} por {formatearPrecio(propiedad.precio)}. Contáctanos para un recorrido privado." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <script type="application/ld+json">{@html JSON.stringify(schemaData)}</script>

  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

{#snippet socialLinks(b)}
  <div class="flex items-center justify-center gap-5 mb-6">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="Facebook">
        <Facebook class="w-6 h-6" />
      </a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="Instagram">
        <Instagram class="w-6 h-6" />
      </a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="LinkedIn">
        <Linkedin class="w-6 h-6" />
      </a>
    {/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="TikTok">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}>
      <X class="w-6 h-6 pointer-events-none" />
    </button>
    <button aria-label="Imagen anterior" class="absolute left-4 sm:left-10 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 sm:p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8 pointer-events-none" />
    </button>
    <div class="relative max-w-7xl max-h-[90vh] px-16 flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1} de {allPhotos.length}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-semibold tracking-widest uppercase backdrop-blur-md">
        {currentImageIndex + 1} / {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente imagen" class="absolute right-4 sm:right-10 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 sm:p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}>
      <ChevronRight class="w-8 h-8 pointer-events-none" />
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20un%20recorrido%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-8 right-8 md:bottom-28 md:right-8 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.5)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group" aria-label="Contactar por WhatsApp">
    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>

  <div class="fixed bottom-0 left-0 w-full z-50 bg-background/90 backdrop-blur-xl border-t border-border py-3 px-6 md:px-12 transform translate-y-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] {isNight ? 'bg-zinc-950/90 border-zinc-800' : 'bg-white/90 border-slate-200'}">
    <div class="max-w-[1400px] mx-auto flex items-center justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-500'}">{propiedad.operacion}</p>
        <p class="text-base md:text-xl font-bold leading-none mt-1 {isNight ? 'text-zinc-100' : 'text-slate-900'}">{formatearPrecio(propiedad.precio)}</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full overflow-hidden shadow-sm shrink-0 border {isNight ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-100 border-slate-200'}">
          {#if broker.avatar_url}
            <img src={broker.avatar_url} alt="Asesor" class="w-full h-full object-cover">
          {:else}
            <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
          {/if}
        </div>
        <div class="hidden sm:block text-right">
          <p class="text-xs font-semibold uppercase {isNight ? 'text-zinc-100' : 'text-slate-900'}">{broker.nombre_comercial}</p>
          <p class="text-[9px] uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-500'}">Asesor Privado</p>
        </div>
      </div>
    </div>
  </div>
{/if}

<main class="min-h-screen {isNight ? 'bg-zinc-950 text-zinc-50' : 'bg-slate-50 text-slate-900'} font-sans pb-32 transition-colors duration-1000">
  
  <nav class="fixed top-0 w-full z-40 backdrop-blur-xl border-b {isNight ? 'bg-zinc-950/80 border-zinc-800' : 'bg-white/80 border-slate-200'}">
    <div class="max-w-[1400px] mx-auto px-6 h-20 flex justify-between items-center">
      <span class="text-sm font-black uppercase tracking-[0.1em] {isNight ? 'text-white' : 'text-slate-900'}">{broker.nombre_comercial}</span>
      
      {#if isBrochure}
        <span class="bg-indigo-600/10 text-indigo-600 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-indigo-600/20 shadow-sm flex items-center gap-1.5">
          <Sparkles class="w-3.5 h-3.5" />
          Smart Brochure
        </span>
      {:else}
        <a href="https://{broker.subdominio}.inmublia.com" class="font-bold text-xs uppercase tracking-widest {isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors flex items-center gap-2">
          Catálogo Exclusivo
        </a>
      {/if}
    </div>
  </nav>

  <div class="w-full pt-20">
    <div class="w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 px-4 md:px-8 py-6">
      {#each allPhotos as foto, idx}
        <div 
          class="shrink-0 w-[85vw] md:w-[65vw] lg:w-[55vw] h-[45vh] md:h-[60vh] snap-center relative rounded-[2rem] overflow-hidden cursor-pointer shadow-lg {isNight ? 'border border-zinc-800 bg-zinc-900' : 'border border-slate-200 bg-white'} group" 
          role="button" 
          tabindex="0" 
          onclick={() => openGallery(idx)}
        >
          <img src={foto} alt="Vista de la propiedad {idx + 1}" class="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" loading={idx === 0 ? "eager" : "lazy"} />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
        </div>
      {/each}
    </div>
  </div>

  <div class="max-w-[1200px] mx-auto px-6 pt-10 pb-16">
    
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md {isNight ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'}">
            {propiedad.operacion}
          </span>
          {#if propiedad.destacada}
            <span class="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
              <Sparkles class="w-3 h-3" /> Exclusiva
            </span>
          {/if}
          <span class="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">
            <MapPin class="w-3 h-3" /> {propiedad.ubicacion}
          </span>
        </div>
        <h1 class="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2 {isNight ? 'text-white' : 'text-slate-900'}">
          {propiedad.titulo}
        </h1>
      </div>
      <div class="text-left md:text-right shrink-0">
        <p class="text-sm font-semibold uppercase tracking-widest mb-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Precio de Mercado</p>
        <p class="text-3xl md:text-4xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{formatearPrecio(propiedad.precio)}</p>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
      <div class="flex flex-col items-center justify-center p-6 rounded-3xl shadow-sm transition-transform hover:-translate-y-1 {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
        <BedDouble class="w-6 h-6 mb-3 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
        <span class="text-2xl font-semibold {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.recamaras || '-'}</span>
        <span class="text-[9px] font-bold uppercase tracking-widest mt-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Recámaras</span>
      </div>
      <div class="flex flex-col items-center justify-center p-6 rounded-3xl shadow-sm transition-transform hover:-translate-y-1 {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
        <Bath class="w-6 h-6 mb-3 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
        <span class="text-2xl font-semibold {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.banos || '-'}</span>
        <span class="text-[9px] font-bold uppercase tracking-widest mt-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Baños</span>
      </div>
      <div class="flex flex-col items-center justify-center p-6 rounded-3xl shadow-sm transition-transform hover:-translate-y-1 {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
        <Maximize class="w-6 h-6 mb-3 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
        <span class="text-2xl font-semibold {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.m2_construccion || '-'}</span>
        <span class="text-[9px] font-bold uppercase tracking-widest mt-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">M² Interiores</span>
      </div>
      <div class="flex flex-col items-center justify-center p-6 rounded-3xl shadow-sm transition-transform hover:-translate-y-1 {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
        <Car class="w-6 h-6 mb-3 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
        <span class="text-2xl font-semibold {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.estacionamientos || '-'}</span>
        <span class="text-[9px] font-bold uppercase tracking-widest mt-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Autos</span>
      </div>
    </div>

    <div class="max-w-4xl mx-auto mb-20 bg-transparent">
      <h2 class="text-sm font-black uppercase tracking-widest mb-6 {isNight ? 'text-zinc-100' : 'text-slate-900'}">Sobre la Propiedad</h2>
      <div class="prose prose-lg max-w-none font-medium leading-relaxed whitespace-pre-line {isNight ? 'text-zinc-400 prose-invert' : 'text-slate-600'}">
        {propiedad.descripcion}
      </div>
    </div>

    {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
      <div class="mb-20 space-y-10">
        {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
          <div>
            <h2 class="text-sm font-black uppercase tracking-widest mb-6 {isNight ? 'text-zinc-100' : 'text-slate-900'}">Tour Virtual 3D</h2>
            <div class="relative w-full pb-[56.25%] h-0 rounded-3xl overflow-hidden shadow-xl bg-black {isNight ? 'border border-zinc-800' : 'border border-slate-200'}">
              <iframe title="Recorrido Virtual Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen allow="xr-spatial-tracking"></iframe>
            </div>
          </div>
        {/if}
        {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
          <div>
            <h2 class="text-sm font-black uppercase tracking-widest mb-6 {isNight ? 'text-zinc-100' : 'text-slate-900'}">Video Recorrido</h2>
            <div class="relative w-full aspect-video rounded-3xl overflow-hidden shadow-xl {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
              <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0&modestbranding=1" title="Video de la propiedad" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="mb-24">
      <h2 class="text-sm font-black uppercase tracking-widest mb-6 {isNight ? 'text-zinc-100' : 'text-slate-900'}">Ubicación</h2>
      <div class="w-full h-[400px] overflow-hidden relative rounded-3xl shadow-sm {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
        <iframe width="100%" height="100%" frameborder="0" style="border:0;" src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=m&z=15&output=embed&iwloc=near" title="Mapa de ubicación" allowfullscreen></iframe>
      </div>
    </div>

    {#if !isBrochure}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        
        <div class="lg:col-span-4 rounded-3xl p-8 flex flex-col items-center text-center shadow-sm transition-colors {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
          <div class="w-28 h-28 rounded-full mb-6 overflow-hidden shadow-md {isNight ? 'bg-zinc-800 border-2 border-zinc-700' : 'bg-slate-100 border-2 border-white'}">
            {#if broker.avatar_url}
              <img src={broker.avatar_url} alt="Foto del Asesor" class="w-full h-full object-cover">
            {:else}
              <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
            {/if}
          </div>
          <h3 class="text-xl font-bold tracking-tight mb-1 {isNight ? 'text-white' : 'text-slate-900'}">{broker.nombre_comercial}</h3>
          <p class="text-[10px] font-bold uppercase tracking-widest mb-4 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Broker Inmobiliario</p>
          {#if broker.bio}
            <p class="text-sm font-medium mb-8 leading-relaxed {isNight ? 'text-zinc-400' : 'text-slate-500'}">"{broker.bio}"</p>
          {/if}

          {@render socialLinks(broker)}
          
          <button onclick={descargarVCard} aria-label="Descargar tarjeta de contacto" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all h-12 px-6 w-full shadow-sm {isNight ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}">
            <Download class="w-4 h-4" /> Guardar VCard
          </button>
        </div>

        <div class="lg:col-span-8 rounded-3xl p-8 lg:p-10 shadow-sm {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}">
          <div class="mb-8">
            <h2 class="text-2xl font-black tracking-tight mb-2 {isNight ? 'text-white' : 'text-slate-900'}">Solicitar Información</h2>
            <p class="text-sm font-medium {isNight ? 'text-zinc-400' : 'text-slate-500'}">Completa tus datos para recibir el dossier completo y agendar un recorrido privado.</p>
          </div>
          
          {#if form?.success}
            <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-3 mb-8 {isNight ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'}" role="alert">
              <CheckCircle2 class="w-5 h-5 shrink-0" /> Su solicitud ha sido enviada exitosamente.
            </div>
          {:else if form?.error}
            <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-3 mb-8 {isNight ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-100 text-red-700'}" role="alert">
              <AlertCircle class="w-5 h-5 shrink-0" /> {form.error}
            </div>
          {/if}

          <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-5">
            <input type="hidden" name="propiedad_id" value={propiedad.id}>
            <input type="hidden" name="broker_id" value={broker.id}>
            <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label for="nombre" class="block text-[10px] font-bold uppercase tracking-widest mb-2 {isNight ? 'text-zinc-500' : 'text-slate-500'}">Nombre Completo</label>
                <input type="text" id="nombre" name="nombre" required class="flex h-12 w-full rounded-xl border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white focus:border-indigo-500' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500'}" placeholder="Ej. Carlos Mendoza">
              </div>
              <div>
                <label for="telefono" class="block text-[10px] font-bold uppercase tracking-widest mb-2 {isNight ? 'text-zinc-500' : 'text-slate-500'}">Teléfono / WhatsApp</label>
                <input type="tel" id="telefono" name="telefono" required class="flex h-12 w-full rounded-xl border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white focus:border-indigo-500' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500'}" placeholder="Ej. 33 1234 5678">
              </div>
            </div>
            
            <div>
              <label for="correo" class="block text-[10px] font-bold uppercase tracking-widest mb-2 {isNight ? 'text-zinc-500' : 'text-slate-500'}">Correo Electrónico</label>
              <input type="email" id="correo" name="correo" required class="flex h-12 w-full rounded-xl border px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white focus:border-indigo-500' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-indigo-500'}" placeholder="correo@ejemplo.com">
            </div>
            
            <button type="submit" disabled={enviando} class="flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 h-14 w-full mt-4 shadow-sm active:scale-95 {isNight ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}">
              {#if enviando}
                 Enviando Datos...
              {:else}
                 Agendar Recorrido
              {/if}
            </button>
          </form>
        </div>

      </div>
    {/if}

  </div>
</main>
