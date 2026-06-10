<script>
  import { page } from '$app/stores';
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);

  let previewMode = $derived($page.url.searchParams.get('preview'));
  let plantillaActiva = $derived(previewMode || broker?.template_seleccionado || 'classic');

  // INYECCIÓN SEGURA DE PÍXELES (SaaS Performance)
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
    ${END_SCR}
    <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${broker.pixel_fb}&ev=PageView&noscript=1"/></noscript>
  ` : '');

  let googlePixel = $derived(broker?.pixel_google ? `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${broker.pixel_google}"><\/script>
    ${START_SCR}
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${broker.pixel_google}');
    ${END_SCR}
  ` : '');

  let tiktokPixel = $derived(broker?.pixel_tiktok ? `
    ${START_SCR}
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        ttq.load('${broker.pixel_tiktok}');
        ttq.page();
      }(window, document, 'ttq');
    ${END_SCR}
  ` : '');
</script>

<svelte:head>
  {#if metaPixel} {@html metaPixel} {/if}
  {#if googlePixel} {@html googlePixel} {/if}
  {#if tiktokPixel} {@html tiktokPixel} {/if}
</svelte:head>

{#snippet socialLinks(b)}
  <div class="flex items-center justify-center gap-6 mt-4">
    {#if b.facebook}
      <a href={b.facebook} target="_blank" class="text-current hover:opacity-60 transition-opacity" aria-label="Facebook">
        <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
      </a>
    {/if}
    {#if b.instagram}
      <a href={b.instagram} target="_blank" class="text-current hover:opacity-60 transition-opacity" aria-label="Instagram">
         <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      </a>
    {/if}
    {#if b.linkedin}
      <a href={b.linkedin} target="_blank" class="text-current hover:opacity-60 transition-opacity" aria-label="LinkedIn">
        <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
      </a>
    {/if}
    {#if b.tiktok}
      <a href={b.tiktok} target="_blank" class="text-current hover:opacity-60 transition-opacity" aria-label="TikTok">
        <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
      </a>
    {/if}
  </div>
{/snippet}

{#if previewMode}
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-[fadeIn_0.3s_ease-out]">
    <span class="relative flex h-3 w-3">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
    </span>
    <p class="text-xs font-bold tracking-widest uppercase">Modo Vista Previa: <span class="text-amber-400">{previewMode}</span></p>
    <div class="w-px h-4 bg-slate-700 mx-2"></div>
    <p class="text-[10px] text-slate-300 font-medium">Tus clientes aún ven el diseño original.</p>
  </div>
{/if}

{#if broker}
  {#if broker.whatsapp}
    <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group" aria-label="Contactar por WhatsApp">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
    </a>
  {/if}

  {#snippet classic()}
    <main class="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      <div>
        <div class="relative bg-slate-900 overflow-hidden">
          <div class="absolute inset-0">
            <img class="w-full h-full object-cover opacity-40" src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop" alt="Real Estate Background">
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
          </div>
          <div class="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
            <h1 class="text-4xl font-black text-white tracking-tight sm:text-6xl md:text-7xl uppercase drop-shadow-lg">{broker.nombre_comercial}</h1>
            <p class="mt-6 max-w-3xl mx-auto text-xl text-slate-300 font-medium tracking-wide">Encuentra la propiedad que define tu estilo de vida.</p>
            
            <div class="mt-10 max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-2 sm:p-4 flex flex-col sm:flex-row gap-2">
              <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ubicación</label>
                <input type="text" placeholder="¿Dónde quieres vivir?" class="w-full focus:outline-none text-slate-900 font-medium bg-transparent">
              </div>
              <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
                <select class="w-full focus:outline-none text-slate-900 font-medium bg-transparent appearance-none cursor-pointer">
                  <option>Casa</option><option>Departamento</option><option>Terreno</option>
                </select>
              </div>
              <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-colors sm:w-auto w-full mt-2 sm:mt-0 flex items-center justify-center gap-2">
                Buscar
              </button>
            </div>
          </div>
        </div>

        <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-8">Propiedades Destacadas</h2>
          <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {#each propiedades as propiedad}
              <a href="/{propiedad.slug}" class="group block bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
                <div class="relative h-72 overflow-hidden">
                  <div class="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">En Venta</div>
                  <img class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" src={propiedad.imagen_url} alt={propiedad.titulo} />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  <div class="absolute bottom-4 left-4 right-4 text-white">
                    <p class="text-3xl font-black tracking-tight">${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-sm font-medium uppercase opacity-80">MXN</span></p>
                  </div>
                </div>
                <div class="p-6 flex flex-col flex-1">
                  <h3 class="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{propiedad.titulo}</h3>
                </div>
              </a>
            {/each}
          </div>
        </div>
      </div>

      <div class="bg-slate-900 text-white mt-12 py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div class="flex items-center gap-6">
            <div class="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-600 overflow-hidden shrink-0 shadow-lg">
              {#if broker.avatar_url}
                <img src={broker.avatar_url} alt="Foto del Asesor" class="w-full h-full object-cover">
              {:else}
                <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=1e293b&color=fff&size=150" alt="Avatar Genérico" class="w-full h-full object-cover">
              {/if}
            </div>
            <div>
              <h3 class="text-2xl font-bold">{broker.nombre_comercial}</h3>
              <p class="text-blue-400 font-medium mb-2">{broker.bio || 'Especialista en Bienes Raíces'}</p>
            </div>
          </div>
          <div class="flex flex-col items-center md:items-end mt-4 md:mt-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nuestras Redes</p>
            {@render socialLinks(broker)}
          </div>
        </div>
      </div>
    </main>
  {/snippet}

  {#snippet clean()}
    <main class="min-h-screen bg-white font-sans text-slate-900 flex flex-col justify-between">
      <div>
        <nav class="border-b border-slate-900 py-6 px-8 flex justify-between items-center bg-white sticky top-0 z-40">
          <div class="flex items-center gap-4">
            {#if broker.avatar_url}
              <div class="w-12 h-12 bg-black overflow-hidden"><img src={broker.avatar_url} alt="Logo" class="w-full h-full object-cover"></div>
            {/if}
            <h1 class="text-2xl font-black uppercase tracking-tighter">{broker.nombre_comercial}</h1>
          </div>
          <a href="#catalogo" class="text-sm font-bold border-b-2 border-slate-900 pb-1 uppercase tracking-widest hover:text-blue-600 hover:border-blue-600 transition-colors">Portafolio</a>
        </nav>

        <div class="max-w-7xl mx-auto px-8 py-20 border-b border-slate-200">
          <p class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Agencia Inmobiliaria</p>
          <h2 class="text-5xl md:text-7xl font-black tracking-tighter leading-tight max-w-4xl">{broker.bio || 'Propiedades excepcionales, gestión implacable.'}</h2>
        </div>

        <div id="catalogo" class="max-w-7xl mx-auto px-8 py-20">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            {#each propiedades as propiedad}
              <a href="/{propiedad.slug}" class="group block">
                <div class="aspect-[4/3] bg-slate-100 overflow-hidden mb-6 border border-slate-200">
                  <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out">
                </div>
                <div class="flex justify-between items-start">
                  <div class="pr-6">
                    <h3 class="text-xl font-bold uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{propiedad.titulo}</h3>
                    <p class="text-sm text-slate-500 uppercase tracking-widest">{propiedad.ubicacion}</p>
                  </div>
                  <p class="text-xl font-black">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
                </div>
              </a>
            {/each}
          </div>
        </div>
      </div>
      
      <footer class="max-w-7xl mx-auto px-8 py-12 border-t border-slate-200 w-full flex flex-col sm:flex-row items-center justify-between gap-6 mt-12">
        <p class="text-slate-500 text-sm font-medium">{broker.nombre_comercial} © 2026</p>
        {@render socialLinks(broker)}
      </footer>
    </main>
  {/snippet}

  {#snippet modern()}
    <main class="min-h-screen bg-white font-sans flex flex-col justify-between">
      <div>
        <nav class="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-6 flex justify-between items-center">
          <div class="flex items-center gap-3">
            {#if broker.avatar_url}<img src={broker.avatar_url} alt="Logo" class="w-10 h-10 rounded-full object-cover shadow-sm">{/if}
            <span class="text-xl font-black text-slate-900 tracking-tight">{broker.nombre_comercial}</span>
          </div>
        </nav>

        <div class="max-w-5xl mx-auto px-6 py-12">
          <div class="bg-white rounded-full shadow-lg border border-slate-200 p-2 flex flex-col md:flex-row items-center gap-2">
            <div class="flex-1 w-full px-6 py-3 border-b md:border-b-0 md:border-r border-slate-200">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Búsqueda rápida</p>
              <input type="text" placeholder="Ciudad o colonia" class="w-full text-slate-900 font-bold focus:outline-none placeholder:text-slate-300">
            </div>
            <button class="w-full md:w-auto bg-rose-500 hover:bg-rose-600 text-white font-bold px-8 py-4 rounded-full transition-colors flex items-center justify-center gap-2">
              Explorar
            </button>
          </div>
        </div>

        <div class="max-w-7xl mx-auto px-6 py-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {#each propiedades as propiedad}
              <a href="/{propiedad.slug}" class="group block">
                <div class="relative aspect-[4/3] rounded-3xl overflow-hidden mb-4 bg-slate-100">
                  <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-bold text-slate-900 text-lg line-clamp-1">{propiedad.titulo}</h3>
                    <p class="text-sm text-slate-500">{propiedad.ubicacion}</p>
                  </div>
                  <p class="font-black text-slate-900 text-lg whitespace-nowrap ml-4">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
                </div>
                <p class="text-sm text-slate-400 mt-1">{propiedad.recamaras || '-'} rec · {propiedad.banos || '-'} baños · {propiedad.m2_construccion || '-'} m²</p>
              </a>
            {/each}
          </div>
        </div>
      </div>

      <footer class="bg-slate-50 border-t border-slate-200 mt-20 py-16 text-center flex flex-col items-center">
        <p class="text-slate-500 font-medium mb-6">{broker.nombre_comercial} © 2026</p>
        <div class="text-slate-600">{@render socialLinks(broker)}</div>
      </footer>
    </main>
  {/snippet}

  {#snippet editorial()}
    <main class="min-h-screen bg-[#FDFBF7] font-serif text-[#2C2C2C] flex flex-col justify-between">
      <div>
        <header class="max-w-5xl mx-auto px-6 pt-20 pb-12 border-b border-[#2C2C2C]/10 text-center">
          <p class="text-xs font-sans tracking-[0.2em] uppercase text-[#2C2C2C]/50 mb-6">Firma Inmobiliaria</p>
          <h1 class="text-5xl md:text-7xl font-normal tracking-tight mb-8 leading-tight">{broker.nombre_comercial}</h1>
          {#if broker.avatar_url}
            <img src={broker.avatar_url} alt="Director" class="w-20 h-20 rounded-full object-cover mx-auto shadow-md mb-6 grayscale hover:grayscale-0 transition-all duration-500">
          {/if}
          <p class="max-w-2xl mx-auto text-lg font-light italic leading-relaxed text-[#2C2C2C]/80 mt-6">"{broker.bio || 'La curaduría perfecta de espacios para habitar.'}"</p>
        </header>

        <div class="max-w-7xl mx-auto px-6 py-20">
          <div class="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
            {#each propiedades as propiedad}
              <a href="/{propiedad.slug}" class="group block break-inside-avoid bg-white p-4 shadow-sm hover:shadow-xl transition-all duration-500 border border-[#2C2C2C]/5">
                <div class="overflow-hidden mb-6">
                  <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full object-cover group-hover:scale-[1.02] transition-transform duration-700">
                </div>
                <p class="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-[#2C2C2C]/50 mb-2">{propiedad.ubicacion}</p>
                <h3 class="text-2xl font-normal leading-snug mb-4">{propiedad.titulo}</h3>
                <p class="text-lg italic text-[#2C2C2C]/80">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
              </a>
            {/each}
          </div>
        </div>
      </div>

      <footer class="max-w-7xl mx-auto px-6 py-16 border-t border-[#2C2C2C]/10 mt-12 w-full flex flex-col items-center">
        <p class="text-[#2C2C2C]/60 text-sm font-medium mb-6">{broker.nombre_comercial} © 2026</p>
        {@render socialLinks(broker)}
      </footer>
    </main>
  {/snippet}

  {#snippet luxury()}
    <main class="min-h-screen bg-[#0a0a0a] font-serif text-slate-200 selection:bg-amber-900 selection:text-white">
      <nav class="absolute top-0 w-full z-40 py-8 px-8 flex justify-between items-center border-b border-white/10">
        <span class="text-2xl font-light tracking-[0.2em] text-white uppercase">{broker.nombre_comercial}</span>
      </nav>

      <div class="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <div class="absolute inset-0 bg-black/40 z-10"></div>
        <img src={propiedades[0]?.imagen_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000'} alt="Luxury Real Estate" class="absolute inset-0 w-full h-full object-cover scale-105 animate-[slowZoom_20s_ease-in-out_infinite_alternate]">
        <div class="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
          <p class="text-amber-500/80 text-sm tracking-[0.3em] uppercase mb-6">Colección Privada</p>
          <h1 class="text-5xl md:text-7xl font-light text-white leading-tight mb-8">Arquitectura que <br><span class="italic font-serif text-white/90">trasciende el tiempo.</span></h1>
        </div>
      </div>

      <div class="py-32">
        {#each propiedades as propiedad, index}
          <a href="/{propiedad.slug}" class="group block relative w-full h-[60vh] md:h-[80vh] overflow-hidden mb-1 {index % 2 === 0 ? 'bg-[#111]' : 'bg-[#0f0f0f]'}">
            <div class="absolute inset-0 w-full h-full md:w-3/5 {index % 2 === 0 ? 'right-0' : 'left-0'}">
              <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-1000 ease-out">
            </div>
            <div class="absolute inset-0 flex flex-col justify-center px-8 md:px-24 {index % 2 === 0 ? 'items-start text-left' : 'items-end text-right'} z-20 pointer-events-none">
              <span class="text-amber-500/80 text-xs tracking-[0.3em] uppercase mb-4">{propiedad.ubicacion}</span>
              <h2 class="text-3xl md:text-5xl font-light text-white mb-6 max-w-2xl leading-tight">{propiedad.titulo}</h2>
              <p class="text-xl text-white/70 font-light tracking-widest">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
            </div>
            <div class="absolute inset-0 bg-gradient-to-r {index % 2 === 0 ? 'from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent' : 'from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]'} z-10"></div>
          </a>
        {/each}
      </div>

      <footer class="border-t border-white/10 py-20 flex flex-col items-center">
        <p class="text-xl font-light text-white mb-8">{broker.nombre_comercial}</p>
        <div class="text-white/60">{@render socialLinks(broker)}</div>
      </footer>
    </main>
  {/snippet}

  {#snippet cinematic()}
    <main class="min-h-screen bg-black font-sans text-white">
      <nav class="fixed top-0 w-full z-50 py-6 px-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <h1 class="text-xl font-bold tracking-widest uppercase drop-shadow-md">{broker.nombre_comercial}</h1>
        {#if broker.avatar_url}
          <img src={broker.avatar_url} alt="Logo" class="w-12 h-12 rounded-full object-cover shadow-2xl border border-white/20">
        {/if}
      </nav>

      <div class="flex flex-col snap-y snap-mandatory h-screen overflow-y-scroll scroll-smooth">
        
        <div class="snap-start w-full h-screen relative flex items-center justify-center shrink-0">
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20 z-10 pointer-events-none"></div>
          
          <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover opacity-90">
            <source src="https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-of-a-luxury-house-41133-large.mp4" type="video/mp4">
          </video>
          
          <div class="relative z-20 text-center flex flex-col items-center">
            <h2 class="text-6xl md:text-8xl font-black uppercase tracking-tighter mix-blend-overlay opacity-90 drop-shadow-2xl">{broker.nombre_comercial}</h2>
            <div class="mt-16 animate-bounce">
              <svg class="w-6 h-6 mx-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </div>
          </div>
        </div>

        {#each propiedades as propiedad}
          <div class="snap-start w-full h-screen relative flex items-end shrink-0 group">
            <div class="absolute inset-0 bg-black z-0">
              <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-1000">
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10 pointer-events-none"></div>
            
            <div class="relative z-20 w-full max-w-7xl mx-auto px-10 pb-24 md:pb-32 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div class="max-w-3xl">
                <p class="text-blue-500 font-bold tracking-[0.2em] uppercase text-xs mb-4">{propiedad.ubicacion}</p>
                <h3 class="text-4xl md:text-6xl font-black leading-tight mb-4 drop-shadow-lg">{propiedad.titulo}</h3>
                <p class="text-2xl font-light text-white/90">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
              </div>
              
              <a href="/{propiedad.slug}" class="bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/20 font-bold py-4 px-10 rounded-full transition-all duration-300 backdrop-saturate-150 uppercase tracking-widest text-xs text-center shrink-0">
                Adentrarse
              </a>
            </div>
          </div>
        {/each}

        <div class="snap-start w-full h-screen relative flex items-center justify-center shrink-0 bg-black">
          <div class="text-center flex flex-col items-center">
            <h2 class="text-4xl md:text-6xl font-black uppercase tracking-widest text-white/90 mb-8">{broker.nombre_comercial}</h2>
            <div class="text-white/60">{@render socialLinks(broker)}</div>
          </div>
        </div>
        
      </div>
    </main>
  {/snippet}

{#if plantillaActiva === 'modern'}
  {@render modern()}
{:else if plantillaActiva === 'luxury'}
  {@render luxury()}
{:else if plantillaActiva === 'clean'}
  {@render clean()}
{:else if plantillaActiva === 'editorial'}
  {@render editorial()}
{:else if plantillaActiva === 'cinematic'}
  {@render cinematic()}
{:else}
  {@render classic()}
{/if}

{:else}
  <main class="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
    <nav class="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="Inmublia Icon" class="h-10 w-auto">
            <span class="text-2xl font-black text-slate-900 tracking-tighter">Inmublia</span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#soluciones" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Soluciones para Brokers</a>
            <div class="h-5 w-px bg-slate-200"></div>
            <a href="/login" class="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">Ingresar a mi Consola</a>
            <button class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-full transition-all duration-300 shadow-lg shadow-blue-600/30">
              Crear mi Agencia
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div class="absolute inset-0 bg-slate-50/50"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-sm font-bold mb-8">
          La infraestructura definitiva para profesionales
        </div>
        
        <h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-8">
          Independiza tu<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Negocio Inmobiliario.</span>
        </h1>
        
        <p class="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-12 font-medium leading-relaxed">
          Inmublia te proporciona tu propio ecosistema digital. Deja de publicar en portales donde compites contra miles. Obtén tu propia marca, landing pages de alto impacto y una consola de gestión profesional.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#planes" class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg shadow-xl shadow-slate-900/20">
            Comenzar mi Agencia
          </a>
        </div>
      </div>
    </div>
  </main>
{/if}
