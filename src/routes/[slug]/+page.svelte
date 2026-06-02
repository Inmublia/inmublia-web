<script>
  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

<!-- Botón Flotante de WhatsApp Global -->
<a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20coordinar%20un%20recorrido%20para:%20{propiedad.titulo}"
   target="_blank"
   class="fixed bottom-8 right-8 bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_40px_rgba(37,211,102,0.5)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group"
   aria-label="Contactar por WhatsApp">
  <svg class="w-9 h-9" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>

{#if broker.template === 'luxury'}
  <main class="min-h-screen bg-slate-50 text-slate-900 font-sans">
    
    <!-- Navbar Premium Transparente -->
    <nav class="absolute top-0 w-full z-40 bg-gradient-to-b from-black/60 to-transparent">
      <div class="max-w-[1400px] mx-auto px-6 h-24 flex justify-between items-center">
        <span class="text-xl md:text-2xl font-black uppercase tracking-widest text-white drop-shadow-md">{broker.nombre_comercial}</span>
        <a href="https://{broker.subdominio}.inmublia.com" class="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-2.5 px-6 rounded-full transition-all text-sm tracking-wide">
          Ver Catálogo
        </a>
      </div>
    </nav>

    <!-- Hero Cinemático -->
    <div class="relative w-full h-[70vh] bg-slate-900">
      <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-90" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
      
      <div class="absolute bottom-0 w-full">
        <div class="max-w-[1400px] mx-auto px-6 pb-16">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="max-w-3xl">
              <div class="flex items-center gap-3 mb-4">
                <span class="bg-blue-600 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-sm">{propiedad.operacion}</span>
                {#if propiedad.destacada}
                  <span class="bg-amber-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-sm">Premium</span>
                {/if}
              </div>
              <h1 class="text-4xl md:text-6xl font-black text-white tracking-tighter leading-[1.1] drop-shadow-lg">{propiedad.titulo}</h1>
            </div>
            <div class="md:text-right">
              <p class="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">Precio de Lista</p>
              <p class="text-4xl md:text-5xl font-black text-white drop-shadow-lg">{formatearPrecio(propiedad.precio)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Layout Principal -->
    <div class="max-w-[1400px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
      
      <!-- Columna Izquierda: Información (70%) -->
      <div class="lg:col-span-8 space-y-12">
        
        <!-- CUADRÍCULA DE AMENIDADES (FICHA TÉCNICA) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 md:p-10">
          <h2 class="text-xl font-black text-slate-900 mb-8 tracking-tight border-b border-slate-100 pb-4">Ficha Técnica</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-10 gap-x-6">
            
            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.m2_terreno || '0'} m²</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Lote</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.m2_construccion || '0'} m²</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Constr.</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.recamaras || '0'}</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Recámaras</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.banos || '0'}</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Baños</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.medio_bano || '0'}</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Medio Baño</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.estacionamientos || '0'}</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Estacionamiento</span>
            </div>

            <div class="flex flex-col items-center text-center group">
              <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span class="text-lg font-bold text-slate-900">{propiedad.antiguedad || '-'}</span>
              <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Antigüedad</span>
            </div>
          </div>
        </div>

        <!-- Descripción General -->
        <div class="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 mb-6 tracking-tight border-b border-slate-100 pb-4">Acerca de esta propiedad</h2>
          <div class="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line font-medium">
            {propiedad.descripcion}
          </div>
        </div>

        <!-- SECCIÓN DE MAPA -->
        <div class="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm">
          <h2 class="text-xl font-black text-slate-900 mb-6 tracking-tight border-b border-slate-100 pb-4">Ubicación</h2>
          <div class="w-full h-[400px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
            <iframe 
              width="100%" 
              height="100%" 
              frameborder="0" 
              style="border:0" 
              src="https://maps.google.com/maps?q={encodeURIComponent(propiedad.ubicacion || 'Guadalajara, Jalisco')}&t=&z=15&ie=UTF8&iwloc=&output=embed" 
              allowfullscreen>
            </iframe>
          </div>
          <p class="mt-4 text-sm font-bold text-slate-500 flex items-center gap-2">
            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {propiedad.ubicacion || 'Ubicación aproximada'}
          </p>
        </div>

      </div>

      <!-- Columna Derecha: Tarjeta de Presentación (Sticky) (30%) -->
      <div class="lg:col-span-4">
        <div class="sticky top-10 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          
          <div class="text-center pb-8 border-b border-slate-100 mb-8">
            <div class="w-24 h-24 bg-slate-900 rounded-full mx-auto mb-5 overflow-hidden border-4 border-white shadow-lg">
              <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff&size=150" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <h3 class="text-2xl font-black text-slate-900 tracking-tight">{broker.nombre_comercial}</h3>
            <p class="text-sm font-bold text-blue-600 tracking-widest uppercase mt-2">Asesor Inmobiliario</p>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p class="text-sm text-slate-600 text-center font-medium">Atención personalizada y discreción absoluta en su proceso de compra.</p>
            </div>
            
            <a href="https://wa.me/{broker.whatsapp}?text=Me%20gustaría%20coordinar%20un%20recorrido%20privado%20para:%20{propiedad.titulo}" target="_blank" class="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Coordinar Recorrido
            </a>
          </div>

        </div>
      </div>

    </div>
  </main>
{/if}
