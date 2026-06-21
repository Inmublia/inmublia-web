<script>
  // Svelte 5 syntax para recibir props
  let { propiedad, agencia, urlActual } = $props();

  // 1. Construimos el JSON-LD para los Motores Generativos (GEO/AEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": `${propiedad.tipo_inmueble} en Venta - ${propiedad.colonia}, ${propiedad.ciudad}`,
    "description": propiedad.descripcion_corta || `Excelente ${propiedad.tipo_inmueble} en ${propiedad.colonia} comercializado por ${agencia.nombre_comercial}.`,
    "image": propiedad.imagen_principal,
    "url": urlActual,
    "datePosted": propiedad.fecha_publicacion,
    "offers": {
      "@type": "Offer",
      "price": propiedad.precio,
      "priceCurrency": propiedad.moneda || "MXN",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "RealEstateAgent",
        "name": agencia.nombre_comercial,
        "image": agencia.avatar_url,
        "telephone": agencia.whatsapp
      }
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": propiedad.ciudad,
      "addressRegion": propiedad.estado,
      "addressCountry": "MX"
    },
    "numberOfRooms": propiedad.recamaras,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": propiedad.metros_construccion,
      "unitCode": "MTK" // Código estándar para metros cuadrados
    }
  };
</script>

<svelte:head>
  <title>{propiedad.tipo_inmueble} en {propiedad.colonia} | {agencia.nombre_comercial}</title>
  <meta name="description" content={propiedad.descripcion_corta} />
  <link rel="canonical" href={urlActual} />

  <meta property="og:site_name" content={agencia.nombre_comercial} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={urlActual} />
  <meta property="og:title" content="{propiedad.tipo_inmueble} en {propiedad.colonia}" />
  <meta property="og:description" content={propiedad.descripcion_corta} />
  <meta property="og:image" content={propiedad.imagen_principal} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{propiedad.tipo_inmueble} en {propiedad.colonia}" />
  <meta name="twitter:description" content={propiedad.descripcion_corta} />
  <meta name="twitter:image" content={propiedad.imagen_principal} />

  <script type="application/ld+json">
    {@html JSON.stringify(jsonLd)}
  </script>
</svelte:head>
