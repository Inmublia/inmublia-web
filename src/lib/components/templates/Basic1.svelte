<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, 
    Linkedin, CheckCircle2, AlertCircle, LayoutGrid, Sparkles 
  } from 'lucide-svelte';

  // 🔥 SVELTE 5: Utilidades y Componentes Compartidos
  import { formatearPrecio, obtenerIdYouTube, obtenerIdMatterport, descargarVCardAgente } from '$lib/utils/formatters';
  import BotonWhatsApp from '$lib/components/shared/BotonWhatsApp.svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  let enviando = $state(false);
  let isGalleryOpen = $state(false);
  let currentImageIndex = $state(0);
  
  let moneda = $derived(propiedad.moneda || "MXN");
  let videoId = $derived(obtenerIdYouTube(propiedad.video_url));
  let allPhotos = $derived(propiedad.galeria_urls?.length ? [propiedad.imagen_url, ...propiedad.galeria_urls] : [propiedad.imagen_url]);

  let isNight = $state(false);
  onMount(() => {
    const hora = new Date().getHours();
    if (hora >= 19 || hora < 6) isNight = true;
  });

  // INYECCIÓN DE PÍXELES CON EVENTO DE VISUALIZACIÓN DE PRODUCTO
  const START_SCR = '<scr'+'ipt>';
  const END_SCR = '</scr'+'ipt>';

  let metaPixel = $derived(broker?.pixel_fb ? `
    ${START_SCR}
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${broker.pixel_fb}');
      fbq('track', 'PageView');
      fbq('track', 'ViewContent', { content_name: '${propiedad.titulo}', content_ids: ['${propiedad.id}'], content_type: 'product', value: ${propiedad.precio}, currency: '${moneda}' });
    ${END_SCR}
  ` : '');

  let googlePixel = $derived(broker?.pixel_google ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${broker.pixel_google}"><\/script>
    ${START_SCR}
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${broker.pixel_google}');
      gtag('event', 'view_item', { currency: '${moneda}', value: ${propiedad.precio}, items: [{ item_id: '${propiedad.id}', item_name: '${propiedad.titulo}' }] });
    ${END_SCR}
  ` : '');

  let tiktokPixel = $derived(broker?.pixel_tiktok ? `
    ${START_SCR}
      !function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)}; ttq.load('${broker.pixel_tiktok}'); ttq.page(); ttq.track('ViewContent', { contents: [{ content_id: '${propiedad.id}', content_name: '${propiedad.titulo}', price: ${propiedad.precio}, quantity: 1 }], value: ${propiedad.precio}, currency: '${moneda}' }); }(window, document, 'ttq');
    ${END_SCR}
  ` : '');

  function openGallery(index) { currentImageIndex = index; isGalleryOpen = true; document.body.style.overflow = 'hidden'; }
  function closeGallery() { isGalleryOpen = false; document.body.style.overflow = ''; }
  function nextImage(e) { if(e) e.stopPropagation(); currentImageIndex = (currentImageIndex + 1) % allPhotos.length; }
  function prevImage(e) { if(e) e.stopPropagation(); currentImageIndex = (currentImageIndex - 1 + allPhotos.length) % allPhotos.length; }
</script>

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

<BotonWhatsApp {broker} {propiedad} />

{#snippet socialLinks(b)}
  <div class="flex items-center justify-center gap-5 mb-6">
    {#if b.facebook}<a href={b.facebook} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="Facebook"><Facebook class="w-6 h-6" /></a>{/if}
    {#if b.instagram}<a href={b.instagram} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="Instagram"><Instagram class="w-6 h-6" /></a>{/if}
    {#if b.linkedin}<a href={b.linkedin} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="LinkedIn"><Linkedin class="w-6 h-6" /></a>{/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="{isNight ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'} transition-colors" aria-label="TikTok">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}><X class="w-6 h-6 pointer-events-none" /></button>
    <button aria-label="Imagen anterior" class="absolute left-4 sm:left-10 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 sm:p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}><ChevronLeft class="w-8 h-8 pointer-events-none" /></button>
    <div class="relative max-w-7xl max-h-[90vh] px-16 flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-semibold tracking-widest uppercase backdrop-blur-md">{currentImageIndex + 1} / {allPhotos.length}</div>
    </div>
    <button aria-label="Siguiente imagen" class="absolute right-4 sm:right-10 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 sm:p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}><ChevronRight class="w-8 h-8 pointer-events-none" /></button>
  </div>
{/if}

<main class="min-h-screen {isNight ? 'bg-zinc-950 text-zinc-50' : 'bg-white text-slate-900'} font-sans pb-32 transition-colors duration-1000">
  
  <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/60 to-transparent">
    <div class="max-w-[1400px] mx-auto px-6 h-28 flex justify-between items-center border-b border-white/10">
      <span class="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white drop-shadow-md">{broker.nombre_comercial}</span>
      <a href="https://{broker.subdominio}.inmublia.com" class="text-white/90 font-medium text-xs uppercase tracking-[0.15em] hover:text-white transition-colors flex items-center gap-2">Catálogo Exclusivo</a>
    </div>
  </nav>

  <div class="relative w-full h-[85vh] min-h-[500px] bg-black cursor-pointer overflow-hidden" role="button" tabindex="0" onclick={() => openGallery(0)}>
    <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover {isNight ? 'opacity-50' : 'opacity-70'} hover:scale-105 transition-all duration-[2s] ease-out pointer-events-none" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>
    
    <div class="absolute bottom-0 w-full pointer-events-none">
      <div class="max-w-[1000px] mx-auto px-6 pb-24 text-center">
        <div class="inline-flex items-center justify-center gap-3 mb-6 flex-wrap">
          <span class="text-white text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] border border-white/30 px-6 py-2 rounded-full backdrop-blur-sm bg-white/5">{propiedad.operacion}</span>
          {#if propiedad.destacada}
             <span class="text-amber-300 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] border border-amber-300/30 px-6 py-2 rounded-full backdrop-blur-sm bg-amber-500/10 flex items-center gap-1.5"><Sparkles class="w-3.5 h-3.5" /> Signature</span>
          {/if}
        </div>
        <h1 class="text-4xl md:text-6xl font-semibold text-white tracking-tight leading-tight drop-shadow-lg mb-4 max-w-4xl mx-auto">{propiedad.titulo}</h1>
        <p class="text-2xl font-light text-white/90 tracking-wide">{formatearPrecio(propiedad.precio, moneda)}</p>
      </div>
    </div>
  </div>

  <div class="max-w-[1000px] mx-auto px-6 pt-12 pb-16">
    
    {#if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
      <div class="mb-16">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 auto-rows-[200px] md:auto-rows-[250px]">
          <div class="md:col-span-2 md:row-span-2 relative overflow-hidden group rounded-xl {isNight ? 'bg-zinc-900' : 'bg-slate-100'} cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(1)}>
            <img src={propiedad.galeria_urls[0]} alt="Vista Principal" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''} pointer-events-none">
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
          </div>
          {#if propiedad.galeria_urls[1]}
            <div class="md:col-span-2 relative overflow-hidden group rounded-xl {isNight ? 'bg-zinc-900' : 'bg-slate-100'} cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(2)}>
              <img src={propiedad.galeria_urls[1]} alt="Vista Secundaria" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''} pointer-events-none">
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
            </div>
          {/if}
          <div class="md:col-span-2 relative overflow-hidden group rounded-xl {isNight ? 'bg-zinc-900' : 'bg-slate-100'} cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(3 % allPhotos.length)}>
            <img src={propiedad.galeria_urls[2] || propiedad.imagen_url} alt="Tercera Vista" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''} pointer-events-none">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
              <span class="text-white font-semibold uppercase tracking-[0.2em] text-xs flex items-center gap-2 px-6 py-3 border border-white/30 rounded-full"><LayoutGrid class="w-4 h-4" /> Ver las {allPhotos.length} Fotos</span>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <div class="flex flex-wrap justify-center gap-x-8 lg:gap-x-12 gap-y-8 py-8 border-y {isNight ? 'border-zinc-800' : 'border-slate-200'} mb-16">
      <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.recamaras || '-'}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Recámaras</p></div>
      <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
      <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.banos || '-'}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Baños</p></div>
      
      {#if propiedad.medio_bano > 0}
        <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.medio_bano}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Medios Baños</p></div>
      {/if}
      
      <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
      <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.m2_construccion || '-'}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">M² Inter</p></div>
      
      {#if propiedad.m2_terreno > 0}
        <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.m2_terreno}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">M² Terreno</p></div>
      {/if}

      <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
      <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.estacionamientos || '-'}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Autos</p></div>
      
      {#if propiedad.antiguedad}
        <div class="w-px hidden sm:block {isNight ? 'bg-zinc-800' : 'bg-slate-200'}"></div>
        <div class="text-center"><p class="text-xl font-light mt-1.5 {isNight ? 'text-zinc-100' : 'text-slate-900'}">{propiedad.antiguedad}</p><p class="text-[9px] font-semibold uppercase tracking-[0.2em] mt-2 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Antigüedad</p></div>
      {/if}
    </div>

    <div class="mb-16">
      <h2 class="text-xs font-semibold uppercase tracking-[0.2em] mb-6 text-center {isNight ? 'text-zinc-500' : 'text-slate-400'}">La Residencia</h2>
      <div class="prose prose-lg max-w-none font-light leading-relaxed whitespace-pre-line text-center md:text-left mx-auto {isNight ? 'text-zinc-300' : 'text-slate-600'}">
        {propiedad.descripcion}
      </div>
    </div>

    {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
      <div class="mb-24 space-y-12">
        {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-[0.2em] mb-6 text-center {isNight ? 'text-zinc-500' : 'text-slate-400'}">Experiencia Inmersiva 3D</h2>
            <div class="relative w-full pb-[56.25%] h-0 rounded-2xl overflow-hidden shadow-2xl bg-black {isNight ? 'border border-zinc-800' : 'border border-slate-200'}">
              <iframe title="Recorrido Virtual Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen allow="xr-spatial-tracking"></iframe>
            </div>
          </div>
        {/if}
        {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-[0.2em] mb-6 text-center {isNight ? 'text-zinc-500' : 'text-slate-400'}">Recorrido en Video</h2>
            <div class="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-slate-100 border border-slate-200'}">
              <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0&modestbranding=1" title="Video de la propiedad" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="mb-24">
      <h2 class="text-xs font-semibold uppercase tracking-[0.2em] mb-6 text-center {isNight ? 'text-zinc-500' : 'text-slate-400'}">El Entorno</h2>
      <div class="w-full h-[400px] md:h-[500px] overflow-hidden relative rounded-2xl shadow-inner {isNight ? 'bg-zinc-900 border border-zinc-800' : 'bg-slate-100 border border-slate-200'}">
        <iframe width="100%" height="100%" frameborder="0" style="border:0;" src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=m&z=15&output=embed&iwloc=near" title="Mapa de ubicación" allowfullscreen></iframe>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
      <div class="border rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm {isNight ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200'}">
        <div class="w-24 h-24 rounded-full mb-5 overflow-hidden shadow-md border-2 {isNight ? 'bg-zinc-800 border-zinc-700' : 'bg-slate-100 border-white'}">
          {#if broker.avatar_url}
            <img src={broker.avatar_url} alt="Foto del Asesor" class="w-full h-full object-cover">
          {:else}
            <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
          {/if}
        </div>
        <h3 class="text-2xl font-semibold tracking-tight {isNight ? 'text-zinc-100' : 'text-slate-900'}">{broker.nombre_comercial}</h3>
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] mt-2 mb-3 {isNight ? 'text-zinc-500' : 'text-slate-400'}">Asesoría Inmobiliaria</p>
        {#if broker.bio}<p class="text-sm italic mb-6 max-w-sm {isNight ? 'text-zinc-400' : 'text-slate-500'}">"{broker.bio}"</p>{/if}

        {@render socialLinks(broker)}
        
        <button onclick={() => descargarVCardAgente(broker, propiedad.ubicacion)} aria-label="Descargar tarjeta de contacto" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors h-11 px-8 w-full shadow-sm mt-2 {isNight ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' : 'bg-slate-900 hover:bg-slate-800 text-white'}">
          <Download class="w-4 h-4" /> Guardar Contacto
        </button>
      </div>

      <div class="border rounded-3xl p-8 shadow-sm flex flex-col justify-center {isNight ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50/50 border-slate-200'}">
        <h2 class="text-2xl font-semibold tracking-tight mb-2 {isNight ? 'text-zinc-100' : 'text-slate-900'}">Agendar Recorrido</h2>
        <p class="text-sm mb-8 {isNight ? 'text-zinc-400' : 'text-slate-500'}">Deje sus datos y el asesor le contactará a la brevedad.</p>
        
        {#if form?.success}
          <div class="font-medium p-4 rounded-xl text-sm text-center flex items-center justify-center gap-2 mb-6 {isNight ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'}" role="alert">
            <CheckCircle2 class="w-4 h-4" /> Solicitud enviada con éxito.
          </div>
        {:else if form?.error}
          <div class="font-medium p-4 rounded-xl text-sm text-center flex items-center justify-center gap-2 mb-6 {isNight ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-100 text-red-700'}" role="alert">
            <AlertCircle class="w-4 h-4" /> {form.error}
          </div>
        {/if}

        <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-4">
          <input type="hidden" name="propiedad_id" value={propiedad.id}>
          <input type="hidden" name="broker_id" value={broker.id}>
          <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
          
          <div>
            <label for="nombre" class="sr-only">Nombre completo</label>
            <input type="text" id="nombre" name="nombre" required class="flex h-11 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {isNight ? 'border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Nombre completo">
          </div>
          <div>
            <label for="correo" class="sr-only">Correo electrónico</label>
            <input type="email" id="correo" name="correo" required class="flex h-11 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {isNight ? 'border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Correo electrónico">
          </div>
          <div>
            <label for="telefono" class="sr-only">Teléfono móvil</label>
            <input type="tel" id="telefono" name="telefono" required class="flex h-11 w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 {isNight ? 'border-zinc-800 bg-zinc-950/50 text-white placeholder:text-zinc-600' : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'}" placeholder="Teléfono móvil">
          </div>
          
          <button type="submit" disabled={enviando} class="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 h-11 px-8 w-full mt-2 shadow-sm {isNight ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}">
            {#if enviando}Procesando...{:else}Solicitar Información{/if}
          </button>
        </form>
      </div>
    </div>
  </div>
</main>
