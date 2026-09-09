<script>
  // Recibimos la data del broker desde el Layout Maestro
  let { broker } = $props();

  // Desestructuramos los IDs si existen en la BD
  let fbPixel = $derived(broker?.pixel_fb?.trim());
  let ga4Pixel = $derived(broker?.pixel_google?.trim());
  let tiktokPixel = $derived(broker?.pixel_tiktok?.trim());
</script>

<svelte:head>
  <!-- ============================================== -->
  <!-- 1. GOOGLE ANALYTICS (GA4) -->
  <!-- ============================================== -->
  {#if ga4Pixel}
    <script async src="https://www.googletagmanager.com/gtag/js?id={ga4Pixel}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '{ga4Pixel}');
    </script>
  {/if}

  <!-- ============================================== -->
  <!-- 2. META (FACEBOOK) PIXEL -->
  <!-- ============================================== -->
  {#if fbPixel}
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '{fbPixel}');
      fbq('track', 'PageView');
    </script>
    <noscript>
      <img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id={fbPixel}&ev=PageView&noscript=1"
      />
    </noscript>
  {/if}

  <!-- ============================================== -->
  <!-- 3. TIKTOK PIXEL -->
  <!-- ============================================== -->
  {#if tiktokPixel}
    <script>
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
        ttq.load('{tiktokPixel}');
        ttq.page();
      }(window, document, 'ttq');
    </script>
  {/if}
</svelte:head>
