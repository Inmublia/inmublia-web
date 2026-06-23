<script>
  import { enhance } from '$app/forms';
  import { 
    X, ChevronLeft, ChevronRight, Download, Facebook, Instagram, Linkedin, 
    CheckCircle2, AlertCircle, Sparkles, MapPin, Compass, ArrowUpRight
  } from 'lucide-svelte';

  // 🔥 SVELTE 5: Utilidades y Componentes Compartidos
  import { formatearPrecio, obtenerIdYouTube, obtenerIdMatterport, descargarVCardAgente } from '$lib/utils/formatters';
  import BotonWhatsApp from '$lib/components/shared/BotonWhatsApp.svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  let enviando = $state(false);
  let isNight = true; // Prestige Dark siempre es oscuro
  
  let moneda = $derived(propiedad.moneda || "MXN");
  let allPhotos = $derived(propiedad.galeria_urls?.length ? [propiedad.imagen_url, ...propiedad.galeria_urls] : [propiedad.imagen_url]);

  let isGalleryOpen = $state(false);
  let currentImageIndex = $state(0);

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
  :root {
    --bronze-light: #D4AF37;
    --bronze-mid: #9E812A;
    --bronze-dark: #665217;
  }
  .text-bronze { color: var(--bronze-light); }
  .border-bronze { border-color: var(--bronze-dark); }
  .bg-bronze { background-color: var(--bronze-mid); }
  .hover-bronze:hover { color: var(--bronze-light); border-color: var(--bronze-light); }
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
  <div class="flex items-center gap-6 mt-4">
    {#if b.facebook}<a href={b.facebook} target="_blank" class="text-zinc-600 hover-bronze transition-colors" aria-label="Facebook"><Facebook class="w-4 h-4" /></a>{/if}
    {#if b.instagram}<a href={b.instagram} target="_blank" class="text-zinc-600 hover-bronze transition-colors" aria-label="Instagram"><Instagram class="w-4 h-4" /></a>{/if}
    {#if b.linkedin}<a href={b.linkedin} target="_blank" class="text-zinc-600 hover-bronze transition-colors" aria-label="LinkedIn"><Linkedin class="w-4 h-4" /></a>{/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="text-zinc-600 hover-bronze transition-colors" aria-label="TikTok">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31 0 2.591.21 3.794.602V4.62a7.1 7.1 0 0 1-2.903-.613v9.077a5.534 5.534 0 0 1-5.533 5.533 5.534 5.534 0 0 1-5.534-5.533 5.534 5.534 0 0 1 5.534-5.533c.12 0 .239.008.356.023V3.68c-.118-.008-.236-.012-.356-.012C3.541 3.668 0 7.209 0 11.579c0 4.37 3.541 7.911 7.911 7.911 4.37 0 7.911-3.541 7.911-7.911V6.162a8.88 8.88 0 0 0 5.867 2.187V4.555a5.535 5.535 0 0 1-3.664-1.921V.02h-5.5zm0 0"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black flex items-center justify-center animate-in fade-in duration-200" role="dialog" aria-modal="true" tabindex="-1">
    <button aria-label="Cerrar" class="absolute top-8 right-8 text-zinc-500 hover:text-white transition-all z-[210] cursor-pointer" onclick={closeGallery}><X class="w-8 h-8 pointer-events-none" /></button>
    <button aria-label="Anterior" class="absolute left-4 sm:left-12 text-zinc-600 hover:text-white transition-all z-[210] cursor-pointer" onclick={prevImage}><ChevronLeft class="w-10 h-10 pointer-events-none" /></button>
    <div class="relative max-w-7xl max-h-[90vh] px-12 flex flex-col items-center justify-center w-full h-full" onclick={closeGallery}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain transition-opacity duration-300" onclick={(e) => e.stopPropagation()}>
      <div class="absolute bottom-0 text-bronze text-[9px] font-medium tracking-[0.4em] uppercase pt-6">EXPOSICIÓN {currentImageIndex + 1} / {allPhotos.length}</div>
    </div>
    <button aria-label="Siguiente" class="absolute right-4 sm:right-12 text-zinc-600 hover:text-white transition-all z-[210] cursor-pointer" onclick={nextImage}><ChevronRight class="w-10 h-10 pointer-events-none" /></button>
  </div>
{/if}

<main class="min-h-screen bg-black font-sans text-zinc-300 selection:bg-zinc-800 pb-32">
  
  <nav class="absolute top-0 w-full z-40 bg-transparent pt-10">
    <div class="max-w-7xl mx-auto px-8 flex justify-between items-center border-b border-zinc-900 pb-6">
      <span class="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.4em]">{broker.nombre_comercial}</span>
      <a href="https://{broker.subdominio}.inmublia.com" class="text-zinc-600 hover:text-white text-[9px] font-bold uppercase tracking-[0.3em] transition-colors">Portafolio</a>
    </div>
  </nav>

  <div class="max-w-7xl mx-auto px-8 pt-36">
    <div class="relative w-full h-[70vh] bg-zinc-900 overflow-hidden cursor-pointer group border border-zinc-900" role="button" tabindex="0" onclick={() => openGallery(0)}>
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-80 filter contrast-125 saturate-50 transition-transform duration-[3s] group-hover:scale-105" />
      <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none"></div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-8 pt-16 pb-24 border-b border-zinc-900">
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
      <div class="max-w-4xl">
        <div class="flex items-center gap-4 mb-8">
          <span class="text-bronze text-[10px] border border-bronze px-4 py-1 font-bold uppercase tracking-[0.3em]">{propiedad.operacion}</span>
          <span class="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2"><MapPin class="w-3 h-3" /> {propiedad.ubicacion}</span>
        </div>
        <h1 class="text-4xl md:text-6xl font-light text-white tracking-tight leading-[1.1]">{propiedad.titulo}</h1>
      </div>
      <div class="lg:text-right">
        <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em] mb-3">Valor de Mercado</p>
        <p class="text-3xl md:text-4xl font-light text-white">{formatearPrecio(propiedad.precio, moneda)}</p>
      </div>
    </div>
  </div>

  <div class="max-w-7xl mx-auto px-8 py-16 border-b border-zinc-900">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 md:divide-x divide-zinc-900">
      <div class="md:px-8 first:pl-0 flex flex-col justify-center">
        <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">Habitaciones</p>
        <p class="text-4xl font-light text-white">{propiedad.recamaras || '-'}</p>
      </div>
      <div class="md:px-8 flex flex-col justify-center">
        <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">Baños</p>
        <p class="text-4xl font-light text-white">{propiedad.banos || '-'}</p>
      </div>
      <div class="md:px-8 flex flex-col justify-center">
        <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">Interiores</p>
        <p class="text-4xl font-light text-white">{propiedad.m2_construccion ? `${propiedad.m2_construccion} M²` : '-'}</p>
      </div>
      <div class="md:px-8 flex flex-col justify-center">
        <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-4">Garaje</p>
        <p class="text-4xl font-light text-white">{propiedad.estacionamientos || '-'}</p>
      </div>
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-8 py-24 space-y-24 font-sans">
    <div class="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
      <div class="md:col-span-7">
        <h3 class="font-serif text-2xl italic tracking-tight mb-6 text-stone-300">El Espacio y su Filosofía</h3>
        <div class="text-base font-light leading-relaxed text-justify whitespace-pre-line text-zinc-400">
          {propiedad.descripcion}
        </div>
      </div>
      
      <div class="md:col-span-5 border-t-2 border-zinc-800 pt-6 font-sans">
        <h4 class="text-[10px] font-black uppercase tracking-widest mb-6 text-white">Especificaciones Editoriales</h4>
        <div class="divide-y divide-zinc-800 text-sm font-light">
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
  </div>

  {#if allPhotos.length > 1}
    <div class="max-w-7xl mx-auto px-8 pb-32">
      <div class="flex items-center justify-between mb-12 border-b border-zinc-900 pb-4">
        <h2 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Anexos Visuales</h2>
        <button onclick={() => openGallery(0)} class="text-[9px] font-bold text-bronze uppercase tracking-[0.3em] hover:text-white transition-colors flex items-center gap-2">
          Ver Todo <ArrowUpRight class="w-3 h-3" />
        </button>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {#each allPhotos.slice(1, 4) as foto, idx}
          <div class="relative aspect-[3/4] bg-zinc-900 cursor-pointer overflow-hidden group border border-zinc-900" role="button" tabindex="0" onclick={() => openGallery(idx + 1)}>
            <img src={foto} alt="Anexo {idx + 1}" class="w-full h-full object-cover opacity-60 filter contrast-125 saturate-50 transition-all duration-[2s] group-hover:scale-105 group-hover:opacity-100 group-hover:saturate-100">
            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
    <div class="w-full bg-zinc-950 border-y border-zinc-900 py-24 mb-32">
      <div class="max-w-7xl mx-auto px-8 space-y-24">
        {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
          <div>
            <h2 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mb-8 text-center">Modelo Tridimensional Digital</h2>
            <div class="relative w-full pb-[45%] h-0 bg-black border border-zinc-900 filter grayscale hover:grayscale-0 transition-all duration-1000">
              <iframe title="Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
        {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
          <div>
            <h2 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mb-8 text-center">Registro Cinematográfico</h2>
            <div class="relative w-full aspect-video bg-black border border-zinc-900 filter grayscale hover:grayscale-0 transition-all duration-1000">
              <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0" title="Video" frameborder="0" allowfullscreen></iframe>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div class="max-w-7xl mx-auto px-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 border-t border-zinc-900 pt-16">
      
      <div class="flex flex-col">
        <h2 class="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] mb-8">Cartografía</h2>
        <div class="flex-1 min-h-[400px] w-full bg-zinc-900 border border-zinc-900 filter grayscale opacity-70">
          <iframe width="100%" height="100%" frameborder="0" style="border:0;" src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=m&z=15&output=embed" title="Map" allowfullscreen></iframe>
        </div>
      </div>

      <div class="flex flex-col bg-zinc-950 border border-zinc-900 p-10 md:p-12">
        <h3 class="text-xl font-light text-white mb-2">Solicitud de Inspección</h3>
        <p class="text-xs font-light text-zinc-500 mb-10">Requisito obligatorio para agendar recorrido o recibir anexos financieros confidenciales.</p>
        
        {#if form?.success}
          <div class="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-8 border-b border-emerald-500/20 pb-4"><CheckCircle2 class="w-4 h-4 inline mr-2" /> Credenciales recibidas.</div>
        {:else if form?.error}
          <div class="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-8 border-b border-rose-500/20 pb-4"><AlertCircle class="w-4 h-4 inline mr-2" /> {form.error}</div>
        {/if}

        <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-6 mt-auto">
          <input type="hidden" name="propiedad_id" value={propiedad.id}>
          <input type="hidden" name="broker_id" value={broker.id}>
          <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
          
          <div class="border-b border-zinc-800 focus-within:border-bronze transition-colors">
            <input type="text" name="nombre" required class="w-full bg-transparent text-sm text-white px-0 py-3 outline-none placeholder:text-zinc-700" placeholder="Nombre completo del inversor">
          </div>
          <div class="border-b border-zinc-800 focus-within:border-bronze transition-colors">
            <input type="email" name="correo" required class="w-full bg-transparent text-sm text-white px-0 py-3 outline-none placeholder:text-zinc-700" placeholder="Correo electrónico institucional">
          </div>
          <div class="border-b border-zinc-800 focus-within:border-bronze transition-colors">
            <input type="tel" name="telefono" required class="w-full bg-transparent text-sm text-white px-0 py-3 outline-none placeholder:text-zinc-700" placeholder="Línea de contacto directo">
          </div>
          
          <button type="submit" disabled={enviando} class="w-full text-left pt-8 text-[10px] font-bold uppercase tracking-[0.4em] text-bronze hover:text-white transition-colors disabled:opacity-50 flex items-center justify-between group">
            <span>{#if enviando}Procesando Alta...{:else}Emitir Solicitud{/if}</span>
            <ArrowUpRight class="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </form>
      </div>

    </div>

    <div class="mt-32 border-t border-zinc-900 py-12 flex flex-col md:flex-row items-center justify-between gap-8">
      <div class="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
        <div class="w-16 h-16 bg-zinc-900 border border-zinc-800 overflow-hidden filter grayscale contrast-125">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}&background=0f172a&color=fff`} alt="Representante" class="w-full h-full object-cover">
        </div>
        <div>
          <p class="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.4em] mb-2">Representante Exclusivo</p>
          <h4 class="text-sm font-light text-white uppercase tracking-widest">{broker.nombre_comercial}</h4>
        </div>
      </div>
      
      <div class="flex items-center gap-8">
        {@render socialLinks(broker)}
        <div class="w-px h-8 bg-zinc-800 hidden md:block"></div>
        <button onclick={() => descargarVCardAgente(broker, propiedad.ubicacion)} class="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
          VCard <Download class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</main>
