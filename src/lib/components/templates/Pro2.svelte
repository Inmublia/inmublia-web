<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, LayoutGrid, Sparkles, MapPin, BedDouble, 
    Bath, Maximize, Car, Play, Cuboid
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
  /* Ocultar scrollbar en el panel derecho asimétrico */
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
      <a href={b.facebook} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="Facebook"><Facebook class="w-4 h-4" /></a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="Instagram"><Instagram class="w-4 h-4" /></a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'} transition-colors" aria-label="LinkedIn"><Linkedin class="w-4 h-4" /></a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/98 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-rose-500 p-3 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}>
      <X class="w-6 h-6 pointer-events-none" />
    </button>
    <button aria-label="Imagen anterior" class="absolute left-4 sm:left-10 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8 pointer-events-none" />
    </button>
    <div class="relative max-w-7xl max-h-[90vh] px-16 flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1} de {allPhotos.length}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 border border-white/10 px-6 py-2 rounded-full text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md">
        {currentImageIndex + 1} / {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente imagen" class="absolute right-4 sm:right-10 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}>
      <ChevronRight class="w-8 h-8 pointer-events-none" />
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20un%20recorrido%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group lg:hidden" aria-label="Contactar por WhatsApp">
    <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>
{/if}

<main class="flex flex-col lg:flex-row min-h-screen {isNight ? 'bg-zinc-950 text-white' : 'bg-white text-slate-900'} font-sans transition-colors duration-1000">

  <div class="w-full lg:w-[55%] flex flex-col p-2 gap-2 bg-black">
    
    <div class="absolute top-0 left-0 w-full lg:w-[55%] p-6 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
      <span class="text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow-md">{broker.nombre_comercial}</span>
      {#if isBrochure}
        <span class="bg-indigo-600/90 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border border-white/20 shadow-sm flex items-center gap-1.5">
          <Sparkles class="w-3 h-3" /> Asymmetric
        </span>
      {:else}
        <a href="https://{broker.subdominio}.inmublia.com" class="pointer-events-auto bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-[9px] uppercase tracking-widest px-4 py-2 rounded-full hover:bg-white/20 transition-colors">
          Catálogo
        </a>
      {/if}
    </div>

    {#each allPhotos as foto, idx}
      <div class="relative w-full overflow-hidden cursor-pointer group rounded-xl {idx === 0 ? 'h-[75vh]' : 'h-[50vh] md:h-[60vh]'}" role="button" tabindex="0" onclick={() => openGallery(idx)}>
        <img src={foto} alt="Vista {idx + 1}" class="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" loading={idx === 0 ? "eager" : "lazy"}>
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
      </div>
    {/each}
  </div>

  <div class="w-full lg:w-[45%] lg:sticky lg:top-0 lg:h-screen overflow-y-auto hide-scrollbar relative">
    <div class="p-8 lg:p-12 xl:p-16 flex flex-col min-h-full">
      
      <div class="flex items-center gap-3 mb-6">
        <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-600 text-white rounded">
          {propiedad.operacion}
        </span>
        {#if propiedad.destacada}
          <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded flex items-center gap-1">
            <Sparkles class="w-3 h-3" /> VIP
          </span>
        {/if}
      </div>

      <h1 class="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] mb-6">
        {propiedad.titulo}
      </h1>
      
      <div class="mb-10">
        <p class="text-[10px] font-bold uppercase tracking-widest mb-1 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Precio de Mercado</p>
        <p class="text-4xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{formatearPrecio(propiedad.precio)}</p>
      </div>

      <div class="grid grid-cols-2 gap-6 mb-12">
        <div class="flex items-center gap-4">
          <BedDouble class="w-5 h-5 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <div><p class="text-lg font-black leading-none">{propiedad.recamaras || '-'}</p><p class="text-[9px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Recámaras</p></div>
        </div>
        <div class="flex items-center gap-4">
          <Bath class="w-5 h-5 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <div><p class="text-lg font-black leading-none">{propiedad.banos || '-'}</p><p class="text-[9px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Baños</p></div>
        </div>
        <div class="flex items-center gap-4">
          <Maximize class="w-5 h-5 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <div><p class="text-lg font-black leading-none">{propiedad.m2_construccion || '-'}</p><p class="text-[9px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">M² Interiores</p></div>
        </div>
        <div class="flex items-center gap-4">
          <Car class="w-5 h-5 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <div><p class="text-lg font-black leading-none">{propiedad.estacionamientos || '-'}</p><p class="text-[9px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Autos</p></div>
        </div>
      </div>

      <hr class="w-full border-t {isNight ? 'border-zinc-800' : 'border-slate-100'} mb-12" />

      <div class="mb-12">
        <h2 class="text-[10px] font-black uppercase tracking-widest mb-4 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Detalles del Inmueble</h2>
        <div class="prose prose-sm font-medium leading-relaxed whitespace-pre-line {isNight ? 'text-zinc-300 prose-invert' : 'text-slate-600'}">
          {propiedad.descripcion}
        </div>
      </div>

      {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
        <div class="flex flex-col gap-3 mb-12">
          {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
            <a href={propiedad.recorrido_3d_url} target="_blank" class="flex items-center gap-3 p-4 rounded-xl border transition-all {isNight ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}">
              <div class="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-500 shrink-0"><Cuboid class="w-5 h-5" /></div>
              <div>
                <p class="text-sm font-bold {isNight ? 'text-white' : 'text-slate-900'}">Tour Virtual Matterport</p>
                <p class="text-[10px] font-semibold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Navegación 3D Inmersiva</p>
              </div>
            </a>
          {/if}
          {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
            <a href={propiedad.video_url} target="_blank" class="flex items-center gap-3 p-4 rounded-xl border transition-all {isNight ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}">
              <div class="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0"><Play class="w-5 h-5" /></div>
              <div>
                <p class="text-sm font-bold {isNight ? 'text-white' : 'text-slate-900'}">Recorrido en Video</p>
                <p class="text-[10px] font-semibold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Cinematic Tour</p>
              </div>
            </a>
          {/if}
        </div>
      {/if}

      {#if !isBrochure}
        <div class="p-8 rounded-2xl mb-12 {isNight ? 'bg-zinc-900' : 'bg-slate-50'}">
          <h3 class="text-lg font-black mb-1 {isNight ? 'text-white' : 'text-slate-900'}">Agenda Privada</h3>
          <p class="text-xs font-medium mb-6 {isNight ? 'text-zinc-400' : 'text-slate-500'}">Solicita el dossier o coordina una visita directa con el asesor.</p>
          
          {#if form?.success}
            <div class="font-bold p-3 rounded-lg text-xs flex items-center justify-center gap-2 mb-6 bg-emerald-500/10 text-emerald-600" role="alert"><CheckCircle2 class="w-4 h-4" /> Solicitud enviada con éxito.</div>
          {:else if form?.error}
            <div class="font-bold p-3 rounded-lg text-xs flex items-center justify-center gap-2 mb-6 bg-red-500/10 text-red-600" role="alert"><AlertCircle class="w-4 h-4" /> {form.error}</div>
          {/if}

          <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-4">
            <input type="hidden" name="propiedad_id" value={propiedad.id}>
            <input type="hidden" name="broker_id" value={broker.id}>
            <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
            
            <input type="text" name="nombre" required class="w-full h-11 rounded-lg border px-4 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Nombre y Apellido">
            <input type="email" name="correo" required class="w-full h-11 rounded-lg border px-4 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Correo Electrónico">
            <input type="tel" name="telefono" required class="w-full h-11 rounded-lg border px-4 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-colors {isNight ? 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Número Móvil">
            
            <button type="submit" disabled={enviando} class="w-full h-12 rounded-lg text-xs font-black uppercase tracking-widest text-white shadow-md transition-all active:scale-95 disabled:opacity-50 mt-2 bg-indigo-600 hover:bg-indigo-500">
              {#if enviando}Procesando...{:else}Solicitar Información{/if}
            </button>
          </form>
        </div>
      {/if}

      <div class="mt-auto border-t pt-8 flex items-center justify-between {isNight ? 'border-zinc-800' : 'border-slate-200'}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full overflow-hidden shadow-sm {isNight ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-slate-200'}">
            <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=0f172a&color=fff`} alt="Asesor" class="w-full h-full object-cover">
          </div>
          <div>
            <h4 class="text-xs font-black {isNight ? 'text-white' : 'text-slate-900'}">{broker.nombre_comercial}</h4>
            <p class="text-[9px] font-bold uppercase tracking-widest {isNight ? 'text-zinc-500' : 'text-slate-400'}">Exclusivas</p>
          </div>
        </div>
        {@render socialLinks(broker)}
      </div>

    </div>
  </div>
</main>
