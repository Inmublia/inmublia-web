<script>
  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<!-- ========================================== -->
<!-- ÚNICO LLAMADO A LA ACCIÓN: WHATSAPP FLOTANTE -->
<!-- ========================================== -->
<a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20la%20propiedad:%20{propiedad.titulo}"
   target="_blank"
   class="fixed bottom-8 right-8 md:bottom-24 md:right-8 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.5)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group"
   aria-label="Contactar por WhatsApp">
  <svg class="w-9 h-9" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>

<!-- ========================================== -->
<!-- BARRA INFERIOR SÚPER LIMPIA (SIN BOTÓN)    -->
<!-- ========================================== -->
<div class="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 py-4 px-6 md:px-12 transform translate-y-0 transition-transform duration-500 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
  <div class="max-w-[1400px] mx-auto flex items-center justify-between">
    <div>
      <p class="text-xs font-bold uppercase tracking-widest text-slate-500">{propiedad.operacion}</p>
      <p class="text-lg md:text-xl font-black text-slate-900 leading-none mt-1">{formatearPrecio(propiedad.precio)}</p>
    </div>
    <div class="flex items-center gap-4">
      <div class="w-10 h-10 rounded-full bg-slate-900 overflow-hidden shadow-sm">
        <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
      </div>
      <div class="hidden sm:block text-right">
        <p class="text-xs font-bold text-slate-900 uppercase">{broker.nombre_comercial}</p>
        <p class="text-[10px] text-slate-500 uppercase tracking-widest">Asesor Privado</p>
      </div>
    </div>
  </div>
</div>

{#if broker.template === 'luxury'}
  <main class="min-h-screen bg-white text-slate-900 font-sans pb-32">
    
    <!-- Navbar Premium Transparente -->
    <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/50 to-transparent">
      <div class="max-w-[1400px] mx-auto px-6 h-28 flex justify-between items-center border-b border-white/10">
        <span class="text-sm md:text-base font-bold uppercase tracking-[0.2em] text-white drop-shadow-md">{broker.nombre_comercial}</span>
        <a href="https://{broker.subdominio}.inmublia.com" class="text-white font-medium text-xs uppercase tracking-[0.15em] hover:text-white/70 transition-colors">
          Catálogo Exclusivo
        </a>
      </div>
    </nav>

    <!-- Hero Cinemático 100vh -->
    <div class="relative w-full h-screen min-h-[600px] bg-slate-900">
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-80" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
      
      <div class="absolute bottom-0 w-full">
        <div class="max-w-[1000px] mx-auto px-6 pb-32 text-center">
          <div class="inline-flex items-center gap-3 mb-8">
            <span class="text-white text-xs font-bold uppercase tracking-[0.2em] border border-white/30 px-6 py-2">{propiedad.operacion}</span>
            {#if propiedad.destacada}
              <span class="text-amber-300 text-xs font-bold uppercase tracking-[0.2em] border border-amber-300/30 px-6 py-2">Signature</span>
            {/if}
          </div>
          <h1 class="text-4xl md:text-6xl lg:text-7xl font-light text-white tracking-tight leading-tight drop-shadow-lg mb-6">{propiedad.titulo}</h1>
          <p class="text-2xl md:text-3xl font-light text-white/90 tracking-wide">{formatearPrecio(propiedad.precio)}</p>
        </div>
      </div>
    </div>

    <div class="max-w-[1000px] mx-auto px-6 pt-16 pb-24">
      
      <!-- ========================================== -->
      <!-- GALERÍA DINÁMICA MASONRY PREMIUM           -->
      <!-- ========================================== -->
      {#if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
        <div class="mb-20">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
            
            <!-- Foto Principal de la Galería -->
            <div class="md:col-span-2 md:row-span-2 relative overflow-hidden group rounded-sm bg-slate-100">
              <img src={propiedad.galeria_urls[0]} alt="Vista Principal" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out">
            </div>
            
            <!-- Foto Secundaria -->
            {#if propiedad.galeria_urls[1]}
              <div class="md:col-span-2 relative overflow-hidden group rounded-sm bg-slate-100">
                <img src={propiedad.galeria_urls[1]} alt="Vista Secundaria" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out">
              </div>
            {/if}

            <!-- Foto Terciaria o Relleno si no hay -->
            <div class="md:col-span-2 relative overflow-hidden group rounded-sm bg-slate-100">
              <img src={propiedad.galeria_urls[2] || propiedad.imagen_url} alt="Vista" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out">
              <!-- Overlay para ver más -->
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                <span class="text-white font-bold uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                  +{propiedad.galeria_urls.length} Fotos
                </span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- DATA TYPOGRAPHY (Ficha Técnica) -->
      <div class="flex flex-wrap justify-center gap-x-12 gap-y-10 py-12 border-y border-slate-200 mb-20">
        <div class="text-center">
          <p class="text-4xl font-light text-slate-900">{propiedad.recamaras || '-'}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Recámaras</p>
        </div>
        <div class="w-px bg-slate-200 hidden sm:block"></div>
        
        <div class="text-center">
          <p class="text-4xl font-light text-slate-900">{propiedad.banos || '-'}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Baños</p>
        </div>
        <div class="w-px bg-slate-200 hidden sm:block"></div>

        <div class="text-center">
          <p class="text-4xl font-light text-slate-900">{propiedad.m2_construccion || '-'}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">M² Interiores</p>
        </div>
        <div class="w-px bg-slate-200 hidden sm:block"></div>

        <div class="text-center">
          <p class="text-4xl font-light text-slate-900">{propiedad.m2_terreno || '-'}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">M² Terreno</p>
        </div>
        <div class="w-px bg-slate-200 hidden lg:block"></div>

        <div class="text-center">
          <p class="text-4xl font-light text-slate-900">{propiedad.estacionamientos || '-'}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Autos</p>
        </div>
      </div>

      <!-- DESCRIPCIÓN EDITORIAL -->
      <div class="mb-24">
        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-10 text-center">La Residencia</h2>
        <div class="prose prose-xl prose-slate max-w-none text-slate-600 font-light leading-relaxed whitespace-pre-line text-center md:text-left mx-auto">
          {propiedad.descripcion}
        </div>
      </div>

      <!-- MAPA CUSTOMIZADO -->
      <div class="mb-24">
        <h2 class="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-10 text-center">El Entorno</h2>
        <div class="w-full h-[500px] bg-slate-100 overflow-hidden relative">
          <iframe 
            width="100%" 
            height="100%" 
            frameborder="0" 
            style="border:0; filter: grayscale(100%) contrast(120%) opacity(80%); pointer-events: none;" 
            src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=&z=14&ie=UTF8&iwloc=&output=embed" 
            allowfullscreen>
          </iframe>
          <div class="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-6 max-w-sm">
            <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ubicación</p>
            <p class="text-lg font-bold text-slate-900">{propiedad.ubicacion || 'Ubicación Privada'}</p>
            <p class="text-xs text-slate-500 mt-2">La ubicación exacta se provee a solicitud para garantizar la privacidad.</p>
          </div>
        </div>
      </div>

      <!-- PRESENTADO POR -->
      <div class="bg-slate-50 py-16 px-8 text-center border-y border-slate-200">
        <h2 class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Representación Exclusiva</h2>
        <div class="w-20 h-20 bg-slate-900 rounded-full mx-auto mb-6 overflow-hidden">
          <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff" alt="Avatar" class="w-full h-full object-cover">
        </div>
        <h3 class="text-2xl font-light text-slate-900">{broker.nombre_comercial}</h3>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 mb-8">Asesoría Inmobiliaria</p>
        <p class="max-w-md mx-auto text-slate-500 text-sm leading-relaxed">
          Atención de guante blanco y absoluta discreción. Contáctenos vía WhatsApp para coordinar un recorrido privado o solicitar la ficha extendida de la propiedad.
        </p>
      </div>

    </div>
  </main>
{/if}
