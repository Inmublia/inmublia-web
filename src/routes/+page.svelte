<script>
  import { page } from '$app/stores';
  import videoFondo from '$lib/luxury.mp4'; 
  
  // Importación de Plantillas (Componentes Aislados)
  import Classic from '$lib/templates/Classic.svelte';
  import Luxury from '$lib/templates/Luxury.svelte';
  // Importa aquí el resto de tus plantillas (Modern, Clean, Editorial, Cinematic) y la Landing general.
  
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);

  let previewMode = $derived($page.url.searchParams.get('preview'));
  let plantillaActiva = $derived(previewMode || broker?.template_seleccionado || 'classic');

  // INYECCIÓN DE PÍXELES (Lógica centralizada)
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
  <link rel="preload" as="video" href={videoFondo} type="video/mp4" />
</svelte:head>

{#if previewMode}
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900/90 backdrop-blur-md border border-zinc-700 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
    <span class="relative flex h-2.5 w-2.5">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
    </span>
    <p class="text-[10px] font-bold tracking-widest uppercase">Modo Previsualización: <span class="text-amber-400">{previewMode}</span></p>
  </div>
{/if}

{#if broker && broker.whatsapp}
  <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group" aria-label="Contactar por WhatsApp">
    <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
  </a>
{/if}

{#if broker}
  {#if plantillaActiva === 'modern'}
    {:else if plantillaActiva === 'luxury'}
    <Luxury {propiedades} {broker} />
  {:else}
    <Classic {propiedades} {broker} />
  {/if}
{:else}
  {/if}
