<script>
  // Recibimos los datos del servidor de forma reactiva
  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  // Formateador de moneda integrado
  const formatearPrecio = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);
</script>

{#if broker.template === 'luxury'}
  <main class="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
    <nav class="sticky top-0 w-full bg-white/80 backdrop-blur-md z-40 border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        <span class="text-xl font-black uppercase tracking-wider text-slate-900">{broker.nombre_comercial}</span>
        <a href="https://wa.me/{broker.whatsapp}?text=Hola,%20me%20interesa%20la%20propiedad:%20{propiedad.titulo}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md text-sm">
          Contactar Agente
        </a>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-5 gap-12">
      <div class="lg:col-span-3 space-y-8">
        <div class="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 bg-slate-100 aspect-[16/10]">
          <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover" />
          {#if propiedad.destacada}
            <span class="absolute top-6 left-6 bg-amber-500 text-white text-xs font-black uppercase px-4 py-2 rounded-full tracking-wider shadow-md">Colección Exclusiva</span>
          {/if}
        </div>
        
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <span class="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">{propiedad.operacion}</span>
            <span class="bg-slate-50 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">{propiedad.tipo}</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">{propiedad.titulo}</h1>
          <p class="text-3xl font-black text-blue-600 font-mono">{formatearPrecio(propiedad.precio)} <span class="text-xs text-slate-400 font-medium">MXN</span></p>
        </div>

        <div class="prose prose-slate max-w-none pt-6 border-t border-slate-100">
          <h3 class="text-lg font-bold text-slate-900 mb-3">Descripción General</h3>
          <p class="text-slate-600 leading-relaxed text-base whitespace-pre-line">{propiedad.descripcion || 'Sin descripción disponible.'}</p>
        </div>
      </div>

      <div class="lg:col-span-2">
        <div class="sticky top-32 bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div class="text-center pb-6 border-b border-slate-200 mb-6">
            <div class="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 overflow-hidden border-2 border-white shadow-md">
              <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=0f172a&color=fff&size=128" alt="Broker Avatar" class="w-full h-full object-cover">
            </div>
            <h3 class="text-xl font-bold text-slate-900">{broker.nombre_comercial}</h3>
            <p class="text-sm font-medium text-slate-400 mt-1">Asesor Inmobiliario Certificado</p>
          </div>

          <div class="space-y-4">
            <p class="text-sm text-slate-500 text-center leading-normal">¿Deseas agendar una visita guiada o recibir más información sobre este inmueble?</p>
            
            <a href="https://wa.me/{broker.whatsapp}?text=Me%20gustaría%20coordinar%20una%20cita%20para:%20{propiedad.titulo}" target="_blank" class="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-green-500/20 text-base">
              <svg class="w-5 h-5 fill-currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Enviar Mensaje directo
            </a>
          </div>
        </div>
      </div>
    </div>
  </main>

{:else if broker.template === 'minimal'}
  <main class="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500">
    <div class="max-w-6xl mx-auto px-6 py-12 space-y-10">
      
      <div class="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <p class="text-sm font-bold text-blue-400 uppercase tracking-widest">{broker.nombre_comercial}</p>
          <h1 class="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">{propiedad.titulo}</h1>
        </div>
        <div class="text-right">
          <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">{propiedad.operacion} • {propiedad.tipo}</p>
          <p class="text-2xl font-black text-white mt-1">{formatearPrecio(propiedad.precio)}</p>
        </div>
      </div>

      <div class="w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 aspect-[21/9]">
        <img src={propiedad.imagen_url} alt={propiedad.titulo} class="w-full h-full object-cover opacity-90" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
        <div class="md:col-span-2 space-y-4">
          <h3 class="text-sm font-bold uppercase tracking-widest text-slate-400">Resumen Ejecutivo</h3>
          <p class="text-slate-400 text-base leading-relaxed whitespace-pre-line font-light">{propiedad.descripcion}</p>
        </div>
        
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit text-center space-y-6">
          <div>
            <p class="text-xs text-slate-500 uppercase tracking-widest font-bold">Asesor Responsable</p>
            <p class="text-lg font-bold text-white mt-1">{broker.nombre_comercial}</p>
          </div>
          <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="block w-full bg-white hover:bg-slate-200 text-slate-950 font-bold py-3 px-4 rounded-xl text-center transition-colors text-sm">
            Contactar vía WhatsApp
          </a>
        </div>
      </div>

    </div>
  </main>
{/if}
