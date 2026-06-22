<script>
  import { MapPin, Phone, Mail } from 'lucide-svelte';
  import { formatearPrecio } from '$lib/utils/formatters';

  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(data.broker);

  let allPhotos = $derived(propiedad.galeria_urls?.length ? [propiedad.imagen_url, ...propiedad.galeria_urls] : [propiedad.imagen_url]);
  let moneda = $derived(propiedad.moneda || "MXN");
</script>

<style>
  @media print {
    .no-print { display: none !important; }
    .page-break { page-break-inside: avoid; margin-bottom: 2rem; }
  }
</style>

<main class="w-full min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white pb-20">
  <div class="w-full bg-slate-900 text-white p-6 flex justify-between items-center shadow-md">
    <span class="text-xs font-black uppercase tracking-[0.4em]">{broker.nombre_comercial}</span>
    <div class="flex items-center gap-3">
      <span class="text-[9px] uppercase tracking-widest text-slate-400 hidden md:inline-block">Dossier Confidencial</span>
      <button onclick={() => window.print()} class="no-print bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors flex items-center gap-2">
        Imprimir PDF
      </button>
    </div>
  </div>

  <div class="relative w-full h-[70vh] md:h-[85vh]">
    <img src={propiedad.imagen_url} alt="Portada" class="w-full h-full object-cover">
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
    <div class="absolute bottom-0 left-0 w-full p-8 md:p-16 max-w-6xl mx-auto text-white">
      <p class="text-xs md:text-sm uppercase tracking-[0.3em] font-bold text-slate-300 mb-4 flex items-center gap-2">
        <MapPin class="w-4 h-4"/> {propiedad.ubicacion}
      </p>
      <h1 class="text-4xl md:text-7xl font-black mb-6 leading-[1.1]">{propiedad.titulo}</h1>
      <p class="text-3xl md:text-5xl font-light text-slate-200">{formatearPrecio(propiedad.precio, moneda)}</p>
    </div>
  </div>

  <div class="max-w-6xl mx-auto px-8 py-16 border-b border-slate-200">
    <div class="flex flex-wrap justify-center gap-12 md:gap-24">
      <div class="text-center">
        <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.recamaras || '0'}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Habitaciones</p>
      </div>
      <div class="text-center">
        <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.banos || '0'}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Baños</p>
      </div>
      {#if propiedad.medio_bano > 0}
        <div class="text-center">
          <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.medio_bano}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Medios Baños</p>
        </div>
      {/if}
      <div class="text-center">
        <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.m2_construccion ? `${propiedad.m2_construccion}` : '-'}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">M² Const.</p>
      </div>
      {#if propiedad.m2_terreno > 0}
        <div class="text-center">
          <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.m2_terreno}</p>
          <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">M² Terreno</p>
        </div>
      {/if}
      <div class="text-center">
        <p class="text-4xl font-light text-slate-900 mb-2">{propiedad.estacionamientos || '0'}</p>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Garaje</p>
      </div>
    </div>
  </div>

  <div class="max-w-4xl mx-auto px-8 py-20">
    <h2 class="text-xs font-black uppercase tracking-[0.4em] mb-12 text-indigo-600 text-center">Acerca de la Propiedad</h2>
    <div class="text-xl md:text-2xl font-light leading-relaxed text-slate-700 whitespace-pre-line text-justify">
      {propiedad.descripcion}
    </div>
  </div>

  <div class="max-w-5xl mx-auto px-8 py-16">
    <h2 class="text-xs font-black uppercase tracking-[0.4em] mb-16 text-slate-400 text-center">Colección Visual</h2>
    <div class="flex flex-col gap-12 md:gap-24">
      {#each allPhotos as foto, idx}
        <div class="w-full page-break">
          <img src={foto} alt="Escena {idx + 1}" class="w-full h-auto object-cover rounded-xl shadow-lg border border-slate-100" loading="lazy">
        </div>
      {/each}
    </div>
  </div>

  <div class="max-w-4xl mx-auto mt-20 px-8">
    <div class="bg-slate-50 border border-slate-200 rounded-3xl p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12">
      <div class="flex items-center gap-8">
        <div class="w-24 h-24 rounded-full overflow-hidden shadow-md bg-slate-200 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial}`} alt="Agente" class="w-full h-full object-cover">
        </div>
        <div>
          <p class="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Asesor Responsable</p>
          <h4 class="text-2xl font-bold text-slate-900">{broker.nombre_comercial}</h4>
          <p class="text-slate-500 text-sm mt-1">Inmublia Certified Broker</p>
        </div>
      </div>
      <div class="flex flex-col gap-4 w-full md:w-auto">
        {#if broker.whatsapp}
          <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="no-print bg-[#25D366] text-white px-8 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 hover:scale-105 transition-all">
            Contactar Ahora
          </a>
          <p class="hidden print:flex items-center gap-2 text-slate-600"><Phone class="w-4 h-4"/> {broker.whatsapp}</p>
        {/if}
        {#if broker.email}
          <p class="hidden print:flex items-center gap-2 text-slate-600"><Mail class="w-4 h-4"/> {broker.email}</p>
        {/if}
      </div>
    </div>
  </div>
</main>
