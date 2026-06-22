<script>
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, MapPin, Compass
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
  <meta property="og:description" content="{propiedad.operacion} en {propiedad.ubicacion} por {formatearPrecio(propiedad.precio, moneda)}." />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:type" content="website" />
  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

<BotonWhatsApp {broker} {propiedad} />

{#snippet socialLinks(b)}
  <div class="flex items-center gap-6 mt-2">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-stone-900'} transition-colors" aria-label="Facebook"><Facebook class="w-5 h-5" /></a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-stone-900'} transition-colors" aria-label="Instagram"><Instagram class="w-5 h-5" /></a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-stone-900'} transition-colors" aria-label="LinkedIn"><Linkedin class="w-5 h-5" /></a>
    {/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="{isNight ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-stone-900'} transition-colors" aria-label="TikTok">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-zinc-950/98 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar" class="absolute top-6 right-6 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full transition-all z-[210] cursor-pointer" onclick={closeGallery}><X class="w-6 h-6 pointer-events-none" /></button>
    <button aria-label="Anterior" class="absolute left-4 sm:left-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={prevImage}><ChevronLeft class="w-8 h-8 pointer-events-none" /></button>
    <div class="relative max-w-6xl max-h-[85vh] px-4 flex items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Slide {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded transition-opacity duration-300 shadow-2xl" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-800 px-5 py-1.5 rounded text-white text-[10px] font-bold tracking-widest uppercase">{currentImageIndex + 1} / {allPhotos.length}</div>
    </div>
    <button aria-label="Siguiente" class="absolute right-4 sm:right-10 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-full transition-all z-[210] cursor-pointer" onclick={nextImage}><ChevronRight class="w-8 h-8 pointer-events-none" /></button>
  </div>
{/if}

<main class="min-h-screen font-serif selection:bg-stone-200 {isNight ? 'bg-zinc-950 text-stone-200' : 'bg-[#FCFBF7] text-stone-900'} pb-32 transition-colors duration-1000">
  
  <header class="max-w-6xl mx-auto px-6 pt-12 pb-8 border-b {isNight ? 'border-zinc-800' : 'border-stone-200'}">
    <div class="flex justify-between items-center mb-10">
      <span class="text-xs uppercase tracking-[0.3em] font-sans font-black">{broker.nombre_comercial}</span>
      <a href="https://{broker.subdominio}.inmublia.com" class="text-xs uppercase tracking-widest font-sans font-semibold hover:opacity-70 transition-opacity">Volume Portfolio</a>
    </div>
    
    <div class="text-center md:text-left py-4">
      <p class="text-[11px] font-sans font-bold uppercase tracking-[0.2em] mb-3 text-stone-400">✦ Architectural Feature / {propiedad.operacion}</p>
      <h1 class="text-4xl md:text-6xl lg:text-7xl font-light font-serif tracking-tight leading-[1.05] max-w-5xl mb-6">{propiedad.titulo}</h1>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <p class="text-sm font-sans font-bold uppercase tracking-widest text-stone-400 flex items-center justify-center md:justify-start gap-1.5">
          <MapPin class="w-3.5 h-3.5" /> {propiedad.ubicacion}
        </p>
        <p class="text-3xl font-serif italic">{formatearPrecio(propiedad.precio, moneda)}</p>
      </div>
    </div>
  </header>

  <div class="max-w-6xl mx-auto px-6 py-8">
    <div class="w-full h-[65vh] rounded overflow-hidden shadow-sm cursor-pointer relative group" role="button" tabindex="0" onclick={() => openGallery(0)}>
      <img src={propiedad.imagen_url} alt="Cover" class="w-full h-full object-cover transition-transform duration-[2.5s] group-hover:scale-105">
      <div class="absolute inset-0 bg-black/5 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none"></div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-6 py-12 space-y-24 font-sans">
    
    <div class="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
      <div class="md:col-span-7">
        <h3 class="font-serif text-2xl italic tracking-tight mb-6 {isNight ? 'text-stone-300' : 'text-stone-800'}">El Espacio y su Filosofía</h3>
        <div class="text-base font-light leading-relaxed text-justify whitespace-pre-line {isNight ? 'text-zinc-400' : 'text-stone-600'}">
          {propiedad.descripcion}
        </div>
      </div>
      
      <div class="md:col-span-5 border-t-2 border-stone-900 pt-6 font-sans">
        <h4 class="text-[10px] font-black uppercase tracking-widest mb-6">Especificaciones Editoriales</h4>
        <div class="divide-y {isNight ? 'divide-zinc-800' : 'divide-stone-200'} text-sm font-light">
          <div class="py-3 flex justify-between"><span>Recámaras</span><span class="font-bold">{propiedad.recamaras || '-'}</span></div>
          <div class="py-3 flex justify-between"><span>Baños Completos</span><span class="font-bold">{propiedad.banos || '-'}</span></div>
          {#if propiedad.medio_bano > 0}<div class="py-3 flex justify-between"><span>Medios Baños</span><span class="font-bold">{propiedad.medio_bano}</span></div>{/if}
          <div class="py-3 flex justify-between"><span>Estacionamientos</span><span class="font-bold">{propiedad.estacionamientos || '-'}</span></div>
          <div class="py-3 flex justify-between"><span>Superficie de Interiores</span><span class="font-bold">{propiedad.m2_construccion ? `${propiedad.m2_construccion} M²` : '-'}</span></div>
          {#if propiedad.m2_terreno > 0}<div class="py-3 flex justify-between"><span>Superficie de Terreno</span><span class="font-bold">{propiedad.m2_terreno} M²</span></div>{/if}
          {#if propiedad.antiguedad}<div class="py-3 flex justify-between"><span>Antigüedad</span><span class="font-bold">{propiedad.antiguedad}</span></div>{/if}
        </div>
      </div>
    </div>

    {#if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
      <div class="space-y-12">
        <div class="text-center"><span class="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">Esbozo Fotográfico</span></div>
        
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {#if propiedad.galeria_urls[0]}
            <div class="md:col-span-8 h-[50vh] rounded overflow-hidden cursor-pointer shadow-sm" role="button" tabindex="0" onclick={() => openGallery(1)}>
              <img src={propiedad.galeria_urls[0]} alt="Gallery 1" class="w-full h-full object-cover hover:scale-102 transition-transform duration-700">
            </div>
          {/if}
          {#if propiedad.galeria_urls[1]}
            <div class="md:col-span-4 h-[40vh] rounded overflow-hidden cursor-pointer shadow-sm" role="button" tabindex="0" onclick={() => openGallery(2)}>
              <img src={propiedad.galeria_urls[1]} alt="Gallery 2" class="w-full h-full object-cover hover:scale-102 transition-transform duration-700">
            </div>
          {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {#if propiedad.galeria_urls[2]}
            <div class="md:col-span-5 h-[40vh] rounded overflow-hidden cursor-pointer shadow-sm md:order-2" role="button" tabindex="0" onclick={() => openGallery(3 % allPhotos.length)}>
              <img src={propiedad.galeria_urls[2]} alt="Gallery 3" class="w-full h-full object-cover hover:scale-102 transition-transform duration-700">
            </div>
          {/if}
          <div class="md:col-span-7 flex flex-col justify-center items-center p-8 text-center md:order-1">
            <Compass class="w-8 h-8 text-stone-400 mb-4 font-light" />
            <p class="font-serif text-xl italic max-w-sm">"La arquitectura es la ordenación del espacio a través de la luz y la materia."</p>
            <button onclick={() => openGallery(0)} class="mt-6 text-xs uppercase tracking-widest font-bold underline hover:opacity-70 transition-opacity">Ver Carrete Completo ({allPhotos.length})</button>
          </div>
        </div>
      </div>
    {/if}

    {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
      <div class="space-y-16 pt-6">
        {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
          <div class="border-t {isNight ? 'border-zinc-800' : 'border-stone-200'} pt-12">
            <h2 class="font-serif text-2xl italic tracking-tight text-center mb-8">Espacio Tridimensional</h2>
            <div class="w-full pb-[50%] h-0 rounded bg-stone-900 overflow-hidden shadow-sm relative">
              <iframe title="Matterport Capture" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
        {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
          <div class="border-t {isNight ? 'border-zinc-800' : 'border-stone-200'} pt-12">
            <h2 class="font-serif text-2xl italic tracking-tight text-center mb-8">Proyección Audiovisual</h2>
            <div class="w-full aspect-video rounded bg-stone-900 overflow-hidden shadow-sm relative">
              <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0" title="Video Feature" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <div class="border-t {isNight ? 'border-zinc-800' : 'border-stone-200'} pt-12">
      <h2 class="font-serif text-2xl italic tracking-tight text-center mb-8">Cartografía</h2>
      <div class="w-full h-[350px] rounded overflow-hidden grayscale opacity-90 border shadow-inner {isNight ? 'border-zinc-800 bg-zinc-900' : 'border-stone-200 bg-stone-50'}">
        <iframe width="100%" height="100%" frameborder="0" style="border:0;" src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=m&z=15&output=embed" title="Map" allowfullscreen></iframe>
      </div>
    </div>

    <div class="border-t-2 border-stone-900 pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
      
      <div class="lg:col-span-5 flex flex-col items-center md:items-start text-center md:text-left">
        <div class="w-20 h-20 rounded-full overflow-hidden shadow-inner mb-6 filter grayscale">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=0f172a&color=fff`} alt="Curator" class="w-full h-full object-cover">
        </div>
        <span class="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">Curador de Propiedad</span>
        <h3 class="font-serif text-2xl font-light text-stone-900 dark:text-white">{broker.nombre_comercial}</h3>
        {#if broker.bio}<p class="text-xs italic text-stone-500 mt-4 leading-relaxed max-w-xs">"{broker.bio}"</p>{/if}
        
        {@render socialLinks(broker)}

        <button onclick={() => descargarVCardAgente(broker, propiedad.ubicacion)} class="mt-8 text-[10px] font-bold uppercase tracking-widest border border-stone-400 hover:bg-stone-900 hover:text-white px-6 py-3 rounded transition-all flex items-center gap-2">
          <Download class="w-3.5 h-3.5" /> Digital Business Card
        </button>
      </div>

      <div class="lg:col-span-7 bg-white dark:bg-zinc-900 p-8 rounded-xl border border-stone-200 dark:border-zinc-800 shadow-sm">
        <h3 class="font-serif text-xl tracking-tight mb-2">Solicitud de Dossier Privado</h3>
        <p class="text-xs font-light text-stone-500 mb-6">Ingrese sus credenciales para agendar una visita privada al inmueble.</p>
        
        {#if form?.success}
          <div class="p-4 rounded text-xs text-center font-bold mb-6 bg-emerald-500/10 text-emerald-600"><CheckCircle2 class="w-4 h-4 inline mr-1" /> Registro completado con éxito.</div>
        {:else if form?.error}
          <div class="p-4 rounded text-xs text-center font-bold mb-6 bg-red-500/10 text-red-600"><AlertCircle class="w-4 h-4 inline mr-1" /> {form.error}</div>
        {/if}

        <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-4 font-sans">
          <input type="hidden" name="propiedad_id" value={propiedad.id}>
          <input type="hidden" name="broker_id" value={broker.id}>
          <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
          
          <div class="border-b border-stone-300 dark:border-zinc-700 py-2">
            <input type="text" name="nombre" required class="w-full bg-transparent text-sm focus:outline-none font-medium" placeholder="Nombre completo">
          </div>
          <div class="border-b border-stone-300 dark:border-zinc-700 py-2">
            <input type="email" name="correo" required class="w-full bg-transparent text-sm focus:outline-none font-medium" placeholder="Correo electrónico">
          </div>
          <div class="border-b border-stone-300 dark:border-zinc-700 py-2">
            <input type="tel" name="telefono" required class="w-full bg-transparent text-sm focus:outline-none font-medium" placeholder="Teléfono de contacto">
          </div>
          
          <button type="submit" disabled={enviando} class="w-full py-4 text-center text-xs font-bold uppercase tracking-widest text-white bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors rounded shadow-sm mt-4">
            {#if enviando}Procesando Alta...{:else}Enviar Credenciales{/if}
          </button>
        </form>
      </div>

    </div>

  </div>
</main>
