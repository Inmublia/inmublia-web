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
    if (hora >= 19 || hora < 6) isNight = true;
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

  let isGalleryOpen = $state(false);
  let currentImageIndex = $state(0);
  let allPhotos = $derived(propiedad.galeria_urls?.length ? [propiedad.imagen_url, ...propiedad.galeria_urls] : [propiedad.imagen_url]);

  function openGallery(index) { currentImageIndex = index; isGalleryOpen = true; document.body.style.overflow = 'hidden'; }
  function closeGallery() { isGalleryOpen = false; document.body.style.overflow = ''; }
  function nextImage(e) { if(e) e.stopPropagation(); currentImageIndex = (currentImageIndex + 1) % allPhotos.length; }
  function prevImage(e) { if(e) e.stopPropagation(); currentImageIndex = (currentImageIndex - 1 + allPhotos.length) % allPhotos.length; }

  // Definimos qué plantilla usar. Si no tiene una válida, cae a 'classic'
  let plantillaActiva = $derived(broker.template_seleccionado || 'classic');
</script>

<svelte:window onkeydown={(e) => { if (isGalleryOpen) { if (e.key === 'Escape') closeGallery(); if (e.key === 'ArrowRight') nextImage(); if (e.key === 'ArrowLeft') prevImage(); } }}/>

<svelte:head>
  <title>{propiedad.titulo} | {broker.nombre_comercial}</title>
</svelte:head>

{#if isGalleryOpen}
  <div class="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center" role="dialog" aria-modal="true" tabindex="-1" onclick={closeGallery}>
    <button aria-label="Cerrar galería" class="absolute top-6 right-6 text-white hover:bg-white/10 p-3 rounded-full z-[210]" onclick={closeGallery}>
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
    <button aria-label="Anterior" class="absolute left-6 text-white hover:bg-white/10 p-4 rounded-full z-[210]" onclick={prevImage}>
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    </button>
    <div class="relative max-w-7xl max-h-[90vh] px-16 flex items-center justify-center w-full h-full" role="document" tabindex="0" onclick={(e) => e.stopPropagation()}>
      <img src={allPhotos[currentImageIndex]} alt="Vista {currentImageIndex + 1}" class="max-w-full max-h-full object-contain rounded-lg">
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-xs font-bold">{currentImageIndex + 1} / {allPhotos.length}</div>
    </div>
    <button aria-label="Siguiente" class="absolute right-6 text-white hover:bg-white/10 p-4 rounded-full z-[210]" onclick={nextImage}>
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
    </button>
  </div>
{/if}

{#snippet classic()}
  <main class="min-h-screen bg-white font-sans text-slate-900 pb-20">
    <nav class="border-b border-slate-100 py-6 px-8 max-w-6xl mx-auto flex justify-between items-center">
      <h2 class="text-xl font-black tracking-tighter">{broker.nombre_comercial}</h2>
      <span class="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">{propiedad.operacion}</span>
    </nav>

    <div class="max-w-6xl mx-auto px-8 pt-8">
      <h1 class="text-3xl md:text-5xl font-black tracking-tight mb-4">{propiedad.titulo}</h1>
      <p class="text-lg text-slate-500 mb-8 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        {propiedad.ubicacion}
      </p>

      <div class="w-full h-[50vh] md:h-[65vh] rounded-3xl overflow-hidden cursor-pointer shadow-lg border border-slate-100 mb-12" role="button" tabindex="0" onclick={() => openGallery(0)}>
        <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover hover:scale-105 transition-transform duration-700">
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div class="lg:col-span-2 space-y-12">
          
          <div class="flex flex-wrap gap-8 py-6 border-y border-slate-100">
            <div><p class="text-2xl font-black">{propiedad.recamaras || '-'}</p><p class="text-[10px] uppercase font-bold text-slate-400 mt-1">Recámaras</p></div>
            <div><p class="text-2xl font-black">{propiedad.banos || '-'}</p><p class="text-[10px] uppercase font-bold text-slate-400 mt-1">Baños</p></div>
            <div><p class="text-2xl font-black">{propiedad.m2_construccion || '-'}</p><p class="text-[10px] uppercase font-bold text-slate-400 mt-1">M² Const.</p></div>
            <div><p class="text-2xl font-black">{propiedad.estacionamientos || '-'}</p><p class="text-[10px] uppercase font-bold text-slate-400 mt-1">Autos</p></div>
          </div>

          <div class="prose max-w-none text-slate-600 leading-relaxed whitespace-pre-line">{propiedad.descripcion}</div>

          {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
            <div class="rounded-2xl overflow-hidden border border-slate-200">
              <iframe title="Recorrido 3D" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="w-full aspect-video" allowfullscreen></iframe>
            </div>
          {/if}
        </div>

        <div class="lg:col-span-1">
          <div class="bg-slate-50 p-8 rounded-3xl border border-slate-100">
            <h2 class="text-3xl font-black text-indigo-600 mb-6">{formatearPrecio(propiedad.precio)}</h2>
            <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update(); }; }} class="space-y-4">
              <input type="hidden" name="propiedad_id" value={propiedad.id}>
              <input type="text" name="nombre" required placeholder="Tu nombre" class="w-full bg-white border border-slate-200 p-4 rounded-xl text-sm">
              <input type="tel" name="telefono" required placeholder="Tu teléfono" class="w-full bg-white border border-slate-200 p-4 rounded-xl text-sm">
              <button type="submit" disabled={enviando} class="w-full bg-slate-900 text-white font-bold py-4 rounded-xl">{enviando ? 'Enviando...' : 'Contactar Asesor'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
{/snippet}


{#snippet modern()}
  <main class="min-h-screen bg-white font-sans pb-32">
    <nav class="max-w-[1400px] mx-auto px-8 py-6 flex justify-between items-center bg-white">
      <h2 class="text-lg font-black text-slate-900">{broker.nombre_comercial}</h2>
      <span class="text-xs font-bold text-slate-500 uppercase">{propiedad.operacion}</span>
    </nav>

    <div class="max-w-[1400px] mx-auto px-8">
      <h1 class="text-3xl md:text-4xl font-bold text-slate-900 mb-2">{propiedad.titulo}</h1>
      <p class="text-sm font-medium text-slate-600 underline mb-8">{propiedad.ubicacion}</p>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-2 h-[50vh] md:h-[60vh] rounded-3xl overflow-hidden cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(0)}>
        <div class="md:col-span-2 relative">
          <img src={propiedad.imagen_url} alt="Principal" class="w-full h-full object-cover hover:opacity-90 transition-opacity">
        </div>
        <div class="hidden md:flex flex-col gap-2">
          <img src={propiedad.galeria_urls?.[0] || propiedad.imagen_url} class="w-full h-1/2 object-cover hover:opacity-90 transition-opacity">
          <img src={propiedad.galeria_urls?.[1] || propiedad.imagen_url} class="w-full h-1/2 object-cover hover:opacity-90 transition-opacity">
        </div>
        <div class="hidden md:flex flex-col gap-2 relative">
          <img src={propiedad.galeria_urls?.[2] || propiedad.imagen_url} class="w-full h-1/2 object-cover hover:opacity-90 transition-opacity">
          <img src={propiedad.galeria_urls?.[3] || propiedad.imagen_url} class="w-full h-1/2 object-cover hover:opacity-90 transition-opacity">
          <div class="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg border border-slate-200">Ver todas las fotos</div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-16 mt-12">
        <div class="flex-1 space-y-12">
          
          <div class="flex justify-between items-center pb-8 border-b border-slate-200">
            <div>
              <h2 class="text-2xl font-bold text-slate-900">{propiedad.tipo} premium</h2>
              <p class="text-slate-600 mt-1">{propiedad.recamaras} huéspedes · {propiedad.banos} baños · {propiedad.estacionamientos} autos</p>
            </div>
            <div class="w-14 h-14 rounded-full overflow-hidden bg-slate-100">
              {#if broker.avatar_url} <img src={broker.avatar_url} alt="Asesor" class="w-full h-full object-cover"> {/if}
            </div>
          </div>

          <div class="prose max-w-none text-slate-700 whitespace-pre-line">{propiedad.descripcion}</div>

          {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
            <div>
              <h3 class="text-xl font-bold mb-6">Recorrido Virtual Matterport</h3>
              <iframe title="3D Tour" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="w-full aspect-[16/9] rounded-2xl" allowfullscreen></iframe>
            </div>
          {/if}
        </div>

        <div class="w-full lg:w-[380px]">
          <div class="sticky top-10 bg-white border border-slate-200 shadow-xl rounded-3xl p-8">
            <h3 class="text-2xl font-black text-slate-900 mb-6">{formatearPrecio(propiedad.precio)}</h3>
            <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update(); }; }} class="space-y-4">
              <input type="hidden" name="propiedad_id" value={propiedad.id}>
              <div class="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 ring-black">
                <input type="text" name="nombre" placeholder="Nombre completo" required class="w-full p-4 text-sm border-b border-slate-300 outline-none">
                <input type="tel" name="telefono" placeholder="Teléfono" required class="w-full p-4 text-sm outline-none">
              </div>
              <button type="submit" disabled={enviando} class="w-full bg-[#E51D53] hover:bg-[#D41648] text-white font-bold py-4 rounded-xl transition-colors text-lg">
                {enviando ? 'Enviando...' : 'Agendar Visita'}
              </button>
            </form>
            <p class="text-center text-xs text-slate-500 mt-4">No se hará ningún cargo al enviar.</p>
          </div>
        </div>
      </div>
    </div>
  </main>
{/snippet}


{#snippet luxury()}
  <main class="min-h-screen {isNight ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} font-sans pb-32 transition-colors duration-1000">
    <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/60 to-transparent">
      <div class="max-w-[1400px] mx-auto px-6 h-28 flex justify-between items-center border-b border-white/10">
        <span class="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white">{broker.nombre_comercial}</span>
      </div>
    </nav>

    <div class="relative w-full h-[85vh] min-h-[500px] bg-black cursor-pointer" role="button" tabindex="0" onclick={() => openGallery(0)}>
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-70 hover:opacity-90 transition-opacity">
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none"></div>
      
      <div class="absolute bottom-0 w-full pointer-events-none">
        <div class="max-w-[1000px] mx-auto px-6 pb-24 text-center">
          <div class="inline-flex items-center gap-3 mb-6">
            <span class="text-white text-[10px] font-bold uppercase tracking-[0.2em] border border-white/30 px-6 py-2 rounded-sm">{propiedad.operacion}</span>
          </div>
          <h1 class="text-4xl md:text-6xl font-light text-white tracking-tight leading-tight mb-4">{propiedad.titulo}</h1>
          <p class="text-2xl font-light text-white/90 tracking-wide">{formatearPrecio(propiedad.precio)}</p>
        </div>
      </div>
    </div>

    <div class="max-w-[1000px] mx-auto px-6 pt-12">
      <div class="flex flex-wrap justify-center gap-12 py-12 border-y {isNight ? 'border-slate-800' : 'border-slate-200'} mb-16">
        <div class="text-center"><p class="text-3xl font-light">{propiedad.recamaras}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Recámaras</p></div>
        <div class="text-center"><p class="text-3xl font-light">{propiedad.banos}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Baños</p></div>
        <div class="text-center"><p class="text-3xl font-light">{propiedad.m2_construccion}</p><p class="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">M² Interiores</p></div>
      </div>

      <div class="mb-20">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">La Residencia</h2>
        <div class="prose prose-lg max-w-none font-light leading-relaxed text-center mx-auto {isNight ? 'text-slate-300' : 'text-slate-600'}">{propiedad.descripcion}</div>
      </div>

      {#if propiedad.recorrido_3d_url && obtenerIdMatterport(propiedad.recorrido_3d_url)}
        <div class="mb-20">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 text-center">Inmersión 3D</h2>
          <div class="relative w-full pb-[56.25%] bg-black rounded-sm overflow-hidden shadow-2xl">
            <iframe title="Matterport" src="https://my.matterport.com/show/?m={obtenerIdMatterport(propiedad.recorrido_3d_url)}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
          </div>
        </div>
      {/if}

      <div class="{isNight ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border rounded-xl p-10 max-w-xl mx-auto shadow-sm text-center mb-24">
        <h2 class="text-xl font-light mb-2">Agendar Recorrido Privado</h2>
        <p class="text-slate-400 text-xs mb-8">El asesor {broker.nombre_comercial} le contactará discretamente.</p>
        <form method="POST" action="?/contacto" use:enhance={() => { enviando = true; return async ({ update }) => { enviando = false; update(); }; }} class="space-y-4 text-left">
          <input type="hidden" name="propiedad_id" value={propiedad.id}>
          <input type="text" name="nombre" required placeholder="Nombre completo" class="w-full bg-transparent border-b {isNight ? 'border-slate-600 focus:border-white' : 'border-slate-300 focus:border-black'} px-2 py-4 text-sm outline-none transition-colors">
          <input type="tel" name="telefono" required placeholder="Teléfono" class="w-full bg-transparent border-b {isNight ? 'border-slate-600 focus:border-white' : 'border-slate-300 focus:border-black'} px-2 py-4 text-sm outline-none transition-colors">
          <button type="submit" disabled={enviando} class="w-full {isNight ? 'bg-white text-black hover:bg-slate-200' : 'bg-black text-white hover:bg-slate-800'} font-bold py-4 mt-4 text-xs uppercase tracking-widest transition-colors">{enviando ? 'Procesando...' : 'Solicitar Información'}</button>
        </form>
      </div>
    </div>
  </main>
{/snippet}


{#if plantillaActiva === 'modern'}
  {@render modern()}
{:else if plantillaActiva === 'luxury'}
  {@render luxury()}
{:else}
  {@render classic()}
{/if}
