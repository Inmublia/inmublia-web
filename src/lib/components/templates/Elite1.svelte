<script>
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, Sparkles, MapPin, BedDouble, 
    Bath, Maximize, Car, Play, Compass
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

  // INYECCIÓN DE PÍXELES
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

<style>
  .glass-panel {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
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
  <meta property="og:description" content="{propiedad.operacion} en {propiedad.ubicacion} por {formatearPrecio(propiedad.precio, moneda)}." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:type" content="website" />
  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

<BotonWhatsApp {broker} {propiedad} />

{#snippet socialLinks(b)}
  <div class="flex items-center justify-center gap-4 mt-4">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/30 text-white transition-all backdrop-blur-sm" aria-label="Facebook"><Facebook class="w-4 h-4" /></a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/30 text-white transition-all backdrop-blur-sm" aria-label="Instagram"><Instagram class="w-4 h-4" /></a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/30 text-white transition-all backdrop-blur-sm" aria-label="LinkedIn"><Linkedin class="w-4 h-4" /></a>
    {/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/30 text-white transition-all backdrop-blur-sm" aria-label="TikTok">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}>
      <X class="w-8 h-8 pointer-events-none" />
    </button>
    <button aria-label="Imagen anterior" class="absolute left-4 sm:left-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}>
      <ChevronLeft class="w-8 h-8 pointer-events-none" />
    </button>
    <div class="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-opacity duration-500" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 border border-white/10 px-6 py-2 rounded-full text-white text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-md">
        {currentImageIndex + 1} / {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente imagen" class="absolute right-4 sm:right-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/20 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}>
      <ChevronRight class="w-8 h-8 pointer-events-none" />
    </button>
  </div>
{/if}

<div class="fixed inset-0 w-full h-screen z-0 bg-black">
  <img src={propiedad.imagen_url} alt="Fondo" class="w-full h-full object-cover opacity-80 scale-105" />
  <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
</div>

<main class="relative z-10 w-full flex flex-col font-sans">
  
  <nav class="fixed top-0 w-full z-40 bg-gradient-to-b from-black/80 to-transparent pt-8 pb-16 pointer-events-none">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 flex justify-between items-center pointer-events-auto">
      <div class="flex items-center gap-4">
        {#if broker.avatar_url}
          <div class="w-10 h-10 rounded-full border border-white/20 overflow-hidden backdrop-blur-md bg-white/10">
            <img src={broker.avatar_url} alt="Logo" class="w-full h-full object-cover">
          </div>
        {/if}
        <span class="text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow-xl">{broker.nombre_comercial}</span>
      </div>
      <a href="https://{broker.subdominio}.inmublia.com" class="bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-[9px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-full hover:bg-white/20 transition-all shadow-xl">
        Portfolio
      </a>
    </div>
  </nav>

  <div class="w-full h-[85vh] md:h-[90vh] flex items-end pb-12 md:pb-24">
    <div class="max-w-[1400px] w-full mx-auto px-6 md:px-12">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div class="max-w-3xl">
          <div class="flex flex-wrap items-center gap-3 mb-6">
            <span class="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
              {propiedad.operacion}
            </span>
            <span class="text-white/90 text-xs font-semibold uppercase tracking-[0.1em] flex items-center gap-1.5 drop-shadow-md">
              <MapPin class="w-4 h-4" /> {propiedad.ubicacion}
            </span>
          </div>
          <h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.05] drop-shadow-2xl">
            {propiedad.titulo}
          </h1>
        </div>
        <div class="text-left md:text-right">
          <p class="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] mb-2 drop-shadow-md">Inversión Solicitada</p>
          <p class="text-4xl md:text-6xl font-black text-white drop-shadow-2xl">{formatearPrecio(propiedad.precio, moneda)}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="w-full {isNight ? 'bg-zinc-950/80 border-t border-zinc-800' : 'bg-white/85 border-t border-white'} glass-panel shadow-[0_-20px_60px_rgba(0,0,0,0.3)] pb-32">
    <div class="max-w-[1400px] mx-auto px-6 md:px-12 pt-16">
      
      <div class="flex flex-wrap justify-center md:justify-start gap-10 mb-24 border-b {isNight ? 'border-zinc-800/50' : 'border-slate-300/50'} pb-16">
        <div class="flex flex-col gap-2">
          <BedDouble class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.recamaras || '-'}</p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">Habitaciones</p>
        </div>
        <div class="flex flex-col gap-2">
          <Bath class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.banos || '-'}</p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">Baños</p>
        </div>
        {#if propiedad.medio_bano > 0}
          <div class="flex flex-col gap-2">
            <Bath class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
            <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.medio_bano}</p>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">Medio Baño</p>
          </div>
        {/if}
        <div class="flex flex-col gap-2">
          <Maximize class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.m2_construccion || '-'}</p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">M² Interiores</p>
        </div>
        {#if propiedad.m2_terreno > 0}
          <div class="flex flex-col gap-2">
            <Maximize class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
            <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.m2_terreno}</p>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">M² Terreno</p>
          </div>
        {/if}
        <div class="flex flex-col gap-2">
          <Car class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
          <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.estacionamientos || '-'}</p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">Garaje</p>
        </div>
        {#if propiedad.antiguedad}
          <div class="flex flex-col gap-2">
            <Sparkles class="w-6 h-6 {isNight ? 'text-zinc-500' : 'text-slate-400'}" />
            <p class="text-3xl font-black {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.antiguedad}</p>
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] {isNight ? 'text-zinc-500' : 'text-slate-500'}">Antigüedad</p>
          </div>
        {/if}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start mb-24">
        
        <div class="lg:col-span-5">
          <h2 class="text-sm font-black uppercase tracking-[0.2em] mb-8 {isNight ? 'text-white' : 'text-slate-900'}">La Residencia</h2>
          <div class="prose prose-lg max-w-none font-medium leading-relaxed whitespace-pre-line {isNight ? 'text-zinc-300 prose-invert' : 'text-slate-700'}">
            {propiedad.descripcion}
          </div>
        </div>

        <div class="lg:col-span-7 space-y-6">
          <h2 class="text-sm font-black uppercase tracking-[0.2em] mb-8 {isNight ? 'text-white' : 'text-slate-900'}">Archivo Visual</h2>
          {#if allPhotos.length > 1}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              {#each allPhotos.slice(0, 4) as foto, idx}
                <div class="relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg group {idx === 0 ? 'md:col-span-2 md:aspect-video' : ''}" role="button" tabindex="0" onclick={() => openGallery(idx)}>
                  <img src={foto} alt="Gallery" class="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105">
                  {#if idx === 3 && allPhotos.length > 4}
                    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-colors">
                      <span class="text-white font-bold text-sm tracking-[0.2em] uppercase">+{allPhotos.length - 4} Vistas</span>
                    </div>
                  {:else}
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none"></div>
                  {/if}
                </div>
              {/each}
            </div>
            <button onclick={() => openGallery(0)} class="w-full py-5 rounded-2xl border border-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-[0.2em] transition-all {isNight ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-slate-900/5 hover:bg-slate-900/10 text-slate-900 border-slate-900/10'} shadow-sm mt-4">
              Explorar Catálogo Visual Completo
            </button>
          {/if}
        </div>
      </div>

      {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
        <div class="mb-24 space-y-16 border-t {isNight ? 'border-zinc-800/50' : 'border-slate-300/50'} pt-16">
          {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
            <div>
              <h2 class="text-sm font-black uppercase tracking-[0.2em] mb-8 text-center {isNight ? 'text-white' : 'text-slate-900'}">Digital Twin 3D</h2>
              <div class="relative w-full pb-[50%] h-0 rounded-[2rem] overflow-hidden shadow-2xl bg-black border border-white/10">
                <iframe title="Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
              </div>
            </div>
          {/if}
          {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
            <div>
              <h2 class="text-sm font-black uppercase tracking-[0.2em] mb-8 text-center {isNight ? 'text-white' : 'text-slate-900'}">Proyección Cinematográfica</h2>
              <div class="relative w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl bg-black border border-white/10">
                <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0" title="Video" frameborder="0" allowfullscreen></iframe>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="max-w-4xl mx-auto rounded-[2.5rem] p-10 md:p-16 border shadow-2xl {isNight ? 'bg-zinc-900/80 border-zinc-700/50' : 'bg-white/80 border-white'} glass-panel">
        <div class="text-center mb-10">
          <h2 class="text-2xl md:text-3xl font-black tracking-tight mb-3 {isNight ? 'text-white' : 'text-slate-900'}">Acceso Privado</h2>
          <p class="text-sm font-medium {isNight ? 'text-zinc-400' : 'text-slate-500'}">Regístrese para coordinar una inspección presencial y recibir el dossier confidencial.</p>
        </div>

        {#if form?.success}
          <div class="font-bold p-4 rounded-2xl text-sm text-center flex items-center justify-center gap-2 mb-8 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" role="alert"><CheckCircle2 class="w-5 h-5" /> Autorización Procesada Correctamente.</div>
        {:else if form?.error}
          <div class="font-bold p-4 rounded-2xl text-sm text-center flex items-center justify-center gap-2 mb-8 bg-rose-500/10 text-rose-500 border border-rose-500/20" role="alert"><AlertCircle class="w-5 h-5" /> {form.error}</div>
        {/if}

        <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-6">
          <input type="hidden" name="propiedad_id" value={propiedad.id}>
          <input type="hidden" name="broker_id" value={broker.id}>
          <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="text" name="nombre" required class="w-full h-14 rounded-2xl px-6 text-sm font-bold focus:outline-none focus:ring-2 transition-all {isNight ? 'bg-zinc-950/50 border border-zinc-800 focus:border-zinc-500 text-white placeholder:text-zinc-600' : 'bg-slate-100 border-transparent focus:border-slate-300 text-slate-900 placeholder:text-slate-400'}" placeholder="Nombre Completo">
            <input type="tel" name="telefono" required class="w-full h-14 rounded-2xl px-6 text-sm font-bold focus:outline-none focus:ring-2 transition-all {isNight ? 'bg-zinc-950/50 border border-zinc-800 focus:border-zinc-500 text-white placeholder:text-zinc-600' : 'bg-slate-100 border-transparent focus:border-slate-300 text-slate-900 placeholder:text-slate-400'}" placeholder="Línea Directa / Móvil">
          </div>
          <input type="email" name="correo" required class="w-full h-14 rounded-2xl px-6 text-sm font-bold focus:outline-none focus:ring-2 transition-all {isNight ? 'bg-zinc-950/50 border border-zinc-800 focus:border-zinc-500 text-white placeholder:text-zinc-600' : 'bg-slate-100 border-transparent focus:border-slate-300 text-slate-900 placeholder:text-slate-400'}" placeholder="Correo Electrónico Corporativo o Personal">
          
          <button type="submit" disabled={enviando} class="w-full h-16 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-3 {isNight ? 'bg-white text-black hover:bg-zinc-200' : 'bg-slate-900 text-white hover:bg-slate-800'}">
            {#if enviando}
              Autorizando...
            {:else}
              Solicitar Acceso al Inmueble
            {/if}
          </button>
        </form>

        <div class="mt-12 pt-8 border-t flex flex-col items-center {isNight ? 'border-zinc-800' : 'border-slate-300'}">
          <div class="w-16 h-16 rounded-full overflow-hidden shadow-lg mb-4 border-2 {isNight ? 'border-zinc-700 bg-zinc-900' : 'border-white bg-slate-200'}">
            <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=0f172a&color=fff`} alt="Broker" class="w-full h-full object-cover">
          </div>
          <span class="text-[9px] font-black uppercase tracking-[0.2em] mb-1 {isNight ? 'text-zinc-500' : 'text-slate-500'}">Asesoramiento Exclusivo</span>
          <h4 class="text-sm font-black mb-4 {isNight ? 'text-white' : 'text-slate-900'}">{broker.nombre_comercial}</h4>
          {@render socialLinks(broker)}
          
          <button onclick={() => descargarVCardAgente(broker, propiedad.ubicacion)} class="mt-8 text-[9px] font-bold uppercase tracking-[0.2em] border px-6 py-2.5 rounded-full transition-all flex items-center gap-2 {isNight ? 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900'}">
            <Download class="w-3.5 h-3.5" /> Contacto Seguro VCard
          </button>
        </div>
      </div>

    </div>
  </div>
</main>
