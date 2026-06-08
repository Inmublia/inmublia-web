<script>
  import { page } from '$app/stores';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  let isBrochure = $derived($page.url.searchParams.get('brochure') === 'true');
  let enviando = $state(false);

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

  // 🛡️ PARSER INTELIGENTE: Extrae el ID de Matterport de cualquier formato para evitar fallos de conexión
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
</svelte:head>

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center" role="dialog" aria-modal="true" tabindex="-1" onclick={closeGallery}>
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-3 rounded-full transition-all z-[210]" onclick={closeGallery}>
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
    <button aria-label="Imagen anterior" class="absolute left-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-4 rounded-full transition-all z-[210]" onclick={prevImage}>
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    </button>
    <div class="relative max-w-7xl max-h-[90vh] px-16 flex items-center justify-center w-full h-full" role="document" tabindex="0" onclick={(e) => e.stopPropagation()}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1} de {allPhotos.length}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300">
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-bold tracking-widest uppercase backdrop-blur-md">
        {currentImageIndex + 1} / {allPhotos.length}
      </div>
    </div>
    <button aria-label="Siguiente imagen" class="absolute right-6 text-white/70 hover:text-white bg-black/50 hover:bg-white/10 p-4 rounded-full transition-all z-[210]" onclick={nextImage}>
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </button>
  </div>
{/if}

{#if !isBrochure}
  <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20agendar%20un%20recorrido%20para:%20{propiedad.titulo}" target="_blank" class="fixed bottom-8 right-8 md:bottom-28 md:right-8 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.5)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group" aria-label="Contactar por WhatsApp">
    <svg class="w-9 h-9" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>

  <div class="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 py-3 px-6 md:px-12 transform translate-y-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
    <div class="max-w-[1400px] mx-auto flex items-center justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">{propiedad.operacion}</p>
        <p class="text-base md:text-xl font-black text-slate-900 leading-none mt-1">{formatearPrecio(propiedad.precio)}</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-slate-900 overflow-hidden shadow-sm shrink-0 border border-slate-200">
          {#if broker.avatar_url}
            <img src={broker.avatar_url} alt="Asesor" class="w-full h-full object-cover">
          {:else}
            <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
          {/if}
        </div>
        <div class="hidden sm:block text-right">
          <p class="text-xs font-bold text-slate-900 uppercase">{broker.nombre_comercial}</p>
          <p class="text-[9px] text-slate-500 uppercase tracking-widest">Asesor Privado</p>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if broker.template === 'luxury'}
  <main class="min-h-screen {isNight ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} font-sans pb-32 transition-colors duration-1000">
    
    <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/50 to-transparent">
      <div class="max-w-[1400px] mx-auto px-6 h-28 flex justify-between items-center border-b border-white/10">
        <span class="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white drop-shadow-md">{broker.nombre_comercial}</span>
        
        {#if isBrochure}
          <span class="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-white/30">Smart Brochure</span>
        {:else}
          <a href="https://{broker.subdominio}.inmublia.com" class="text-white font-medium text-xs uppercase tracking-[0.15em] hover:text-white/70 transition-colors">Catálogo Exclusivo</a>
        {/if}
      </div>
    </nav>

    <div class="relative w-full h-[85vh] min-h-[500px] bg-black cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(0)}>
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover {isNight ? 'opacity-60' : 'opacity-80'} hover:opacity-90 transition-opacity" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
      
      <div class="absolute bottom-0 w-full pointer-events-none">
        <div class="max-w-[1000px] mx-auto px-6 pb-24 text-center">
          <div class="inline-flex items-center gap-3 mb-6">
            <span class="text-white text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border border-white/30 px-6 py-2 rounded-sm">{propiedad.operacion}</span>
            {#if propiedad.destacada}
               <span class="text-amber-300 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] border border-amber-300/30 px-6 py-2 rounded-sm">Signature</span>
            {/if}
          </div>
          <h1 class="text-4xl md:text-6xl font-light text-white tracking-tight leading-tight drop-shadow-lg mb-4">{propiedad.titulo}</h1>
          <p class="text-2xl font-light text-white/90 tracking-wide">{formatearPrecio(propiedad.precio)}</p>
        </div>
      </div>
    </div>

    <div class="max-w-[1000px] mx-auto px-6 pt-12">
      
      {#if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
        <div class="mb-16">
          {#if isBrochure}
            <div class="flex flex-col gap-10 md:gap-16">
              {#each propiedad.galeria_urls as foto, idx}
                <div class="w-full rounded-sm overflow-hidden shadow-xl {isNight ? 'bg-slate-800 shadow-black/50' : 'bg-slate-100 shadow-slate-200/50'} relative group cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(idx + 1)}>
                  <img src={foto} alt="Detalle de la propiedad {idx + 1}" class="w-full h-auto max-h-[80vh] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" loading="lazy">
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 auto-rows-[200px] md:auto-rows-[250px]">
              <div class="md:col-span-2 md:row-span-2 relative overflow-hidden group rounded-sm bg-slate-800 cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(1)}>
                <img src={propiedad.galeria_urls[0]} alt="Vista Principal de la Galería" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''}">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
              </div>
              {#if propiedad.galeria_urls[1]}
                <div class="md:col-span-2 relative overflow-hidden group rounded-sm bg-slate-800 cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(2)}>
                  <img src={propiedad.galeria_urls[1]} alt="Vista Secundaria de la Galería" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''}">
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>
              {/if}
              <div class="md:col-span-2 relative overflow-hidden group rounded-sm bg-slate-800 cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(3 % allPhotos.length)}>
                <img src={propiedad.galeria_urls[2] || propiedad.imagen_url} alt="Tercera Vista de la Galería" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out {isNight ? 'opacity-80' : ''}">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span class="text-white font-bold uppercase tracking-[0.2em] text-xs flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                     Ver las {allPhotos.length} Fotos
                  </span>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <div class="flex flex-wrap justify-center gap-x-12 gap-y-8 py-8 border-y {isNight ? 'border-slate-800' : 'border-slate-200'} mb-16">
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.recamaras || '-'}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Recámaras</p></div>
        <div class="w-px {isNight ? 'bg-slate-800' : 'bg-slate-200'} hidden sm:block"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.banos || '-'}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Baños</p></div>
        <div class="w-px {isNight ? 'bg-slate-800' : 'bg-slate-200'} hidden sm:block"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.m2_construccion || '-'}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">M² Inter</p></div>
        <div class="w-px {isNight ? 'bg-slate-800' : 'bg-slate-200'} hidden sm:block"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.m2_terreno || '-'}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">M² Terreno</p></div>
        <div class="w-px {isNight ? 'bg-slate-800' : 'bg-slate-200'} hidden lg:block"></div>
        <div class="text-center"><p class="text-3xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{propiedad.estacionamientos || '-'}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Autos</p></div>
      </div>

      <div class="mb-16">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">La Residencia</h2>
        <div class="prose prose-lg max-w-none font-light leading-relaxed whitespace-pre-line text-center md:text-left mx-auto {isNight ? 'text-slate-300' : 'text-slate-600'}">
          {propiedad.descripcion}
        </div>
      </div>

      {#if (propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)) || (propiedad.video_url && obtenerIdYouTube(propiedad.video_url))}
        <div class="mb-16 space-y-16">
          
          {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
            <div>
              <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Experiencia Inmersiva 3D</h2>
              <div class="relative w-full pb-[56.25%] h-0 rounded-sm overflow-hidden shadow-xl border border-slate-100 bg-black">
                <iframe 
                  title="Recorrido Virtual Matterport de la propiedad"
                  src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" 
                  class="absolute top-0 left-0 w-full h-full border-0"
                  allowfullscreen 
                  allow="xr-spatial-tracking">
                </iframe>
              </div>
            </div>
          {/if}

          {#if propiedad.video_url && obtenerIdYouTube(propiedad.video_url)}
            <div>
              <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Recorrido en Video</h2>
              <div class="relative w-full aspect-video rounded-sm overflow-hidden shadow-xl {isNight ? 'bg-slate-800' : 'bg-slate-100'}">
                <iframe class="absolute top-0 left-0 w-full h-full" src="https://www.youtube.com/embed/{obtenerIdYouTube(propiedad.video_url)}?autoplay=0&controls=1&rel=0&modestbranding=1" title="Video de recorrido de la propiedad" frameborder="0" allowfullscreen></iframe>
              </div>
            </div>
          {/if}

        </div>
      {/if}

      <div class="mb-24">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">El Entorno</h2>
        <div class="w-full h-[500px] {isNight ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden relative rounded-sm shadow-inner">
          <iframe width="100%" height="100%" frameborder="0" style="border:0;" src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=m&z=15&output=embed&iwloc=near" title="Mapa de ubicación de la zona" allowfullscreen></iframe>
        </div>
      </div>

      {#if !isBrochure}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-24">
          
          <div class="{isNight ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
            <div class="w-20 h-20 bg-slate-900 rounded-full mb-4 overflow-hidden shadow-md">
              {#if broker.avatar_url}
                <img src={broker.avatar_url} alt="Foto de perfil del Asesor" class="w-full h-full object-cover">
              {:else}
                <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar por defecto del Asesor" class="w-full h-full object-cover">
              {/if}
            </div>
            <h3 class="text-xl font-light {isNight ? 'text-white' : 'text-slate-900'}">{broker.nombre_comercial}</h3>
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 mb-2">Asesoría Inmobiliaria</p>
            {#if broker.bio}
              <p class="text-xs text-slate-500 italic mb-6">"{broker.bio}"</p>
            {/if}
            
            <button onclick={descargarVCard} aria-label="Descargar tarjeta de contacto digital vCard" class="inline-flex items-center gap-2 px-6 py-3 {isNight ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 hover:bg-slate-800'} text-white text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors shadow-sm w-full justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Guardar Contacto
            </button>
          </div>

          <div class="{isNight ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-8 shadow-sm flex flex-col justify-center">
            <h2 class="text-xl font-light {isNight ? 'text-white' : 'text-slate-900'} mb-2">Agendar Recorrido</h2>
            <p class="text-slate-400 text-xs mb-6">Deje sus datos y el asesor le contactará.</p>
            
            {#if form?.success}
              <div class="bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold p-4 rounded-xl text-sm text-center" role="alert">
                Solicitud enviada con éxito. El asesor se comunicará pronto.
              </div>
            {:else if form?.error}
              <div class="mb-4 bg-red-50 text-red-700 font-bold p-3 rounded-lg text-sm border border-red-200 text-center" role="alert">
                {form.error}
              </div>
            {/if}

            <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update({ reset: form?.success }); }; }} class="space-y-4">
              <input type="hidden" name="propiedad_id" value={propiedad.id}>
              <input type="hidden" name="broker_id" value={broker.id}>
              <input type="hidden" name="propiedad_titulo" value={propiedad.titulo}>
              
              <div>
                <label for="nombre" class="sr-only">Nombre completo</label>
                <input type="text" id="nombre" name="nombre" required class="w-full {isNight ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nombre completo">
              </div>
              <div>
                <label for="correo" class="sr-only">Correo electrónico</label>
                <input type="email" id="correo" name="correo" required class="w-full {isNight ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Correo electrónico">
              </div>
              <div>
                <label for="telefono" class="sr-only">Teléfono móvil</label>
                <input type="tel" id="telefono" name="telefono" required class="w-full {isNight ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Teléfono móvil">
              </div>
              
              <button type="submit" disabled={enviando} class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-sm transition-all disabled:opacity-50">
                {enviando ? 'Enviando...' : 'Solicitar Información'}
              </button>
            </form>
          </div>

        </div>
      {/if}

    </div>
  </main>
{/if}
