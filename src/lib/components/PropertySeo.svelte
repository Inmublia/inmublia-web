<script>
  let { propiedad, broker, urlActual } = $props();

  // Resolución Dinámica de Moneda (Preparado para expansión LATAM)
  // Verifica si la propiedad tiene una moneda asignada; si no, asume MXN.
  const monedaDinamica = propiedad.moneda || "MXN";

  // Resolución del país basado en la moneda para el esquema
  const countryCode = monedaDinamica === "MXN" ? "MX" : (monedaDinamica === "COP" ? "CO" : "LATAM");

  // Construcción del Esquema JSON-LD para ChatGPT, Gemini y Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": propiedad.titulo,
    "description": propiedad.descripcion,
    "image": propiedad.imagen_url,
    "url": urlActual,
    "datePosted": propiedad.creado_en,
    "offers": {
      "@type": "Offer",
      "price": propiedad.precio,
      "priceCurrency": monedaDinamica,
      "availability": propiedad.estatus === 'Activa' ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      "seller": {
        "@type": "RealEstateAgent",
        "name": broker.nombre_comercial,
        "image": broker.avatar_url || broker.logo_url,
        "telephone": broker.whatsapp
      }
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": propiedad.ubicacion,
      "addressCountry": countryCode
    },
    "numberOfRooms": propiedad.recamaras,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": propiedad.m2_construccion,
      "unitCode": "MTK" // Standard Unit Code para Metros Cuadrados
    }
  };
</script>

<svelte:head>
  <title>{propiedad.titulo} | {broker.nombre_comercial}</title>
  <meta name="description" content={propiedad.descripcion?.substring(0, 155) + '...'} />
  <link rel="canonical" href={urlActual} />

  <meta property="og:site_name" content={broker.nombre_comercial} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={urlActual} />
  <meta property="og:title" content={propiedad.titulo} />
  <meta property="og:description" content={propiedad.descripcion?.substring(0, 155)} />
  <meta property="og:image" content={propiedad.imagen_url} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={propiedad.titulo} />
  <meta name="twitter:description" content={propiedad.descripcion?.substring(0, 155)} />
  <meta name="twitter:image" content={propiedad.imagen_url} />

  <script type="application/ld+json">
    {@html JSON.stringify(jsonLd)}
  </script>
</svelte:head>
