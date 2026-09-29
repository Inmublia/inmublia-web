<!-- src/routes/admin/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { generarFichaPDF } from '$lib/utils/pdf'; 
  import { 
    Building2, ExternalLink, CalendarPlus, Plus, Search, 
    MapPin, DownloadCloud, Sparkles, QrCode, Link2, 
    Pencil, Trash2, EyeOff, CheckCircle2, BadgeDollarSign, TrendingUp, Handshake
  } from 'lucide-svelte';

  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades || []);
  
  let totalPropiedades = $derived(propiedades.length);
  let valorPortafolio = $derived(propiedades.reduce((acc, p) => p.estatus === 'Vendida' ? acc : acc + (Number(p.precio) || 0), 0));
  let activasCount = $derived(propiedades.filter(p => p.estatus === 'Activa' || p.estatus === 'Pública').length);
  let preMercadoCount = $derived(propiedades.filter(p => p.estatus === 'Pre-Mercado').length);

  let searchQuery = $state('');
  let propiedadesFiltradas = $derived(
    propiedades.filter(p => p.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let generandoPDF = $state(false);
  let showUpsellModal = $state(false);

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  function getOpenHouseStatus(openHouse) {
    if (!openHouse || !openHouse.event_date || !openHouse.time_end) return 'none';
    const now = new Date();
    const eventEndString = `${openHouse.event_date}T${openHouse.time_end}`;
    return now > new Date(eventEndString) ? 'archived' : 'active';
  }

  async function descargarFicha(propiedad) {
    generandoPDF = true;
    try { await generarFichaPDF(propiedad, broker); } 
    catch (error) { alert('Hubo un problema al generar el archivo. Intenta de nuevo.'); } 
    finally { generandoPDF = false; }
  }

  function copiarEnlace(slug) {
    navigator.clipboard.writeText(`https://${broker.subdominio}.inmublia.com/${slug}`);
    alert('Enlace copiado al portapapeles');
  }

  function abrirQR(slug, titulo) {
    const url = `https://${broker.subdominio}.inmublia.com/${slug}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(url)}&format=png&margin=20`;
    const nombreArchivo = `QR-${titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}.png`;
    
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>QR - ${titulo}</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; text-align: center; }
          h2 { color: #09090b; margin-bottom: 8px; font-size: 24px; font-weight: 700; }
          p { color: #71717a; margin-top: 0; margin-bottom: 32px; font-size: 14px; }
          .qr-card { background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e4e4e7; }
          img { max-width: 400px; width: 100%; border-radius: 12px; }
          .botones { margin-top: 40px; display: flex; gap: 12px; }
          button { padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
          .btn-imprimir { background: #09090b; color: white; border: none; }
          .btn-guardar { background: white; color: #09090b; border: 1px solid #e4e4e7; }
          @media print { body { background-color: white; justify-content: flex-start; padding-top: 40px; } .botones { display: none; } .qr-card { box-shadow: none; padding: 0; border: none; } }
        </style>
      </head>
      <body>
        <h2>${titulo}</h2>
        <p>Escanea para acceder a la ficha técnica</p>
        <div class="qr-card"><img src="${qrApiUrl}" alt="Código QR"/></div>
        <div class="botones">
          <button class="btn-imprimir" onclick="window.print()">Imprimir QR</button>
          <button class="btn-guardar" onclick="descargar()">Guardar Imagen</button>
        </div>
        <script>
          async function descargar() {
            try {
              const res = await fetch('${qrApiUrl}');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.setAttribute('download', '${nombreArchivo}');
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch (e) {
              alert('La seguridad bloqueó la descarga. Haz clic derecho en el QR y selecciona "Guardar imagen como..."');
            }
          }
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  }

  function intentarAbrirBrochure(slug) {
    const plan = broker?.plan_suscripcion?.toLowerCase()?.trim() || 'basico';
    const estatus = broker?.status_suscripcion?.toLowerCase()?.trim() || 'inactiva';
    
    if ((plan === 'pro' || plan === 'elite') && estatus === 'activa') {
      window.open(`/${slug}?brochure=true`, '_blank');
    } else {
      showUpsellModal = true;
    }
  }

  function diasRestantesVisibilidad(fechaVendida) {
    if (!fechaVendida) return 0;
    const diasTranscurridos = (new Date() - new Date(fechaVendida)) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(3 - diasTranscurridos));
  }
</script>

<div class="fixed inset-0 bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<div class="w-full flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out] relative">
  
  <PageHeader title="Inventario Maestro" icon={Building2}>
    {#snippet subtitle()}
      Consola de Gestión Inmublia
    {/snippet}

    {#snippet actions()}
      {#if broker && broker.subdominio}
        <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white h-11 px-5 gap-2 backdrop-blur-sm">
          <ExternalLink class="w-4 h-4" /> Ver Portal Público
        </a>
      {/if}
      <a href="/admin/open-house/nueva" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 h-11 px-5 gap-2 backdrop-blur-sm">
        <CalendarPlus class="w-4 h-4" /> Open House
      </a>
      <a href="/admin/nueva" class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors bg-slate-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200 h-11 px-6 gap-2 shadow-md active:scale-95">
        <Plus class="w-4 h-4" /> Nueva Propiedad
      </a>
    {/snippet}
  </PageHeader>

  <!-- 🚀 FIX: Restauramos -mt-16 para sobreponer las tarjetas a la cabecera. -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10">
      
      <!-- 🚀 FIX: Eliminamos las transparencias (bg-zinc-900/40) para devolver colores SOLIDOS y nitidos en dark mode -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div class="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Valor de Portafolio</p>
            <div class="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-transparent group-hover:scale-110 transition-transform">
              <BadgeDollarSign class="w-4 h-4" />
            </div>
          </div>
          <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">{formatter.format(valorPortafolio)}</p>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Total Unidades</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-transparent group-hover:scale-110 transition-transform">
              <Building2 class="w-4 h-4" />
            </div>
          </div>
          <p class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{totalPropiedades}</p>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 dark:bg-indigo-500/10 rounded-full blur-2xl opacity-50 pointer-events-none"></div>
          <div class="flex items-center justify-between mb-3 relative z-10">
            <p class="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Públicas</p>
            <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-transparent group-hover:scale-110 transition-transform">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div class="flex items-end gap-2 relative z-10">
            <p class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activasCount}</p>
            <p class="text-xs text-slate-400 dark:text-zinc-500 font-medium mb-1">En mercado</p>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-300 group">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Pre-Mercado</p>
            <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 group-hover:scale-110 transition-transform">
              <EyeOff class="w-4 h-4" />
            </div>
          </div>
          <div class="flex items-end gap-2">
            <p class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{preMercadoCount}</p>
            <p class="text-xs text-slate-400 dark:text-zinc-500 font-medium mb-1">Ocultas</p>
          </div>
        </div>
      </div>

      <!-- 🚀 FIX: Mantenemos bg-zinc-900 sólido -->
      <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 overflow-hidden relative transition-colors duration-300">
        
        <div class="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input type="text" bind:value={searchQuery} placeholder="Buscar por título o colonia..." class="flex h-11 w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-10 pr-3 py-2 text-sm font-medium text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all shadow-sm">
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr class="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
                <th class="w-[40%] px-6 py-4">Activo Inmobiliario</th>
                <th class="w-[20%] px-6 py-4">Valor</th>
                <th class="w-[15%] px-6 py-4 text-center">Estatus</th>
                <th class="w-[25%] px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100/80 dark:divide-zinc-800">
              {#if propiedadesFiltradas.length === 0}
                <tr>
                  <td colspan="4" class="px-6 py-16 text-center text-slate-500 dark:text-zinc-500 text-sm font-medium">
                    <div class="flex flex-col items-center justify-center gap-3">
                      <Search class="w-8 h-8 text-slate-300 dark:text-zinc-700" />
                      No se encontraron propiedades.
                    </div>
                  </td>
                </tr>
              {:else}
                {#each propiedadesFiltradas as propiedad}
                  <tr class="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors {propiedad.estatus === 'Vendida' ? 'opacity-80 bg-slate-50/50 dark:bg-zinc-900/50' : ''}">
                    
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-4">
                        <div class="h-14 w-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-zinc-800 shrink-0 border border-slate-200 dark:border-zinc-700 shadow-sm group-hover:border-indigo-200 dark:group-hover:border-indigo-500/50 transition-colors relative">
                          
                          {#if propiedad.estatus === 'Vendida'}
                            <div class="absolute inset-0 bg-white/40 dark:bg-zinc-900/60 backdrop-blur-[1px] z-10 flex items-center justify-center overflow-hidden">
                              <img src="/sello-vendido.png" alt="Vendido" class="w-[120%] h-auto object-contain opacity-90 -rotate-12 drop-shadow-md scale-110" />
                            </div>
                          {/if}
                          
                          <img src={propiedad.imagen_url} alt="Portada" class="w-full h-full object-cover {propiedad.estatus === 'Vendida' ? 'grayscale-[50%] dark:opacity-50' : ''}">
                        </div>
                        
                        <div class="truncate">
                          <div class="text-sm font-bold {propiedad.estatus === 'Vendida' ? 'text-slate-600 dark:text-zinc-500 line-through decoration-slate-300 dark:decoration-zinc-700' : 'text-slate-900 dark:text-zinc-100'} leading-tight mb-1 flex items-center gap-2 truncate">
                            <span class="truncate">{propiedad.titulo}</span>
                            {#if propiedad.destacada && propiedad.estatus !== 'Vendida'}
                              <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shrink-0">VIP</span>
                            {/if}
                          </div>
                          <p class="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 truncate font-medium">
                            <MapPin class="w-3 h-3 shrink-0 text-slate-400 dark:text-zinc-600" />
                            <span class="truncate">{propiedad.ubicacion}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td class="px-6 py-5 truncate">
                      <p class="text-sm font-black {propiedad.estatus === 'Vendida' ? 'text-slate-500 dark:text-zinc-600' : 'text-slate-900 dark:text-zinc-100'}">{formatter.format(propiedad.precio)}</p>
                      <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                        <TrendingUp class="w-3 h-3" /> {propiedad.operacion}
                      </p>
                    </td>

                    <td class="px-6 py-5 text-center whitespace-nowrap">
                      <div class="flex flex-col items-center justify-center gap-2 h-full">
                        {#if propiedad.estatus === 'Vendida'}
                          <span class="inline-flex flex-col items-center gap-1">
                            <span class="inline-flex items-center rounded-md border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest shadow-sm">
                              <CheckCircle2 class="w-3 h-3 mr-1.5 text-rose-500 dark:text-rose-400" /> VENDIDA
                            </span>
                            <span class="text-[8px] font-bold text-slate-400 dark:text-zinc-600">Oculta en {diasRestantesVisibilidad(propiedad.fecha_vendida)} días</span>
                          </span>
                        {:else if propiedad.estatus === 'Pre-Mercado'}
                          <span class="inline-flex items-center rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-[9px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-widest shadow-sm">
                            <EyeOff class="w-3 h-3 mr-1.5 text-slate-400 dark:text-zinc-500" /> Oculta
                          </span>
                        {:else}
                          <span class="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest shadow-sm">
                            <CheckCircle2 class="w-3 h-3 mr-1.5 text-emerald-500 dark:text-emerald-400" /> Pública
                          </span>
                        {/if}

                        {#if propiedad.open_houses && propiedad.open_houses.length > 0}
                          {@const activeOH = propiedad.open_houses.find(oh => getOpenHouseStatus(oh) === 'active') || [...propiedad.open_houses].sort((a,b) => new Date(b.event_date) - new Date(a.event_date))[0]}
                          {@const ohStatus = getOpenHouseStatus(activeOH)}
                          
                          {#if ohStatus === 'active'}
                            <a href="/admin/open-house/{activeOH.id}" class="inline-flex items-center rounded-md border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors uppercase tracking-widest">
                              <CalendarPlus class="w-3 h-3 mr-1" /> Open House
                            </a>
                          {:else}
                            <a href="/admin/open-house/{activeOH.id}" class="inline-flex items-center rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-[9px] font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors uppercase tracking-widest">
                              <CalendarPlus class="w-3 h-3 mr-1" /> Histórico OH
                            </a>
                          {/if}
                        {/if}
                      </div>
                    </td>

                    <td class="px-6 py-5">
                      <div class="flex justify-end gap-1 items-center">
                        
                        {#if propiedad.estatus !== 'Vendida'}
                          <form method="POST" action="?/marcarVendida" use:enhance class="inline-block m-0 p-0">
                            <input type="hidden" name="id" value={propiedad.id}>
                            <button type="button" class="p-2 text-emerald-600 dark:text-emerald-500 hover:text-white dark:hover:text-white hover:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm mr-1" onclick={(e) => { if(confirm('¡Felicidades! ¿Marcar esta propiedad como VENDIDA? Se ocultará automáticamente en 3 días.')) e.target.closest('form').submit(); }} title="Marcar como Vendida">
                              <Handshake class="w-4 h-4" />
                            </button>
                          </form>
                        {:else}
                          <form method="POST" action="?/deshacerVendida" use:enhance class="inline-block m-0 p-0">
                            <input type="hidden" name="id" value={propiedad.id}>
                            <button type="button" class="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg transition-colors bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-sm mr-1" onclick={(e) => { if(confirm('¿Deseas revertir el estatus de esta propiedad a Activa?')) e.target.closest('form').submit(); }} title="Deshacer Venta">
                              <Handshake class="w-4 h-4" />
                            </button>
                          </form>
                        {/if}

                        <button onclick={() => descargarFicha(propiedad)} disabled={generandoPDF} class="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg border border-transparent transition-all disabled:opacity-50" title="Descargar PDF">
                          <DownloadCloud class="w-4 h-4 {generandoPDF ? 'animate-pulse' : ''}" />
                        </button>
                        
                        <button onclick={() => intentarAbrirBrochure(propiedad.slug)} class="p-2 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg border border-transparent transition-all" title="Smart Brochure">
                          <Sparkles class="w-4 h-4" />
                        </button>
                        
                        <button onclick={() => abrirQR(propiedad.slug, propiedad.titulo)} class="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg border border-transparent transition-all" title="Generar QR">
                          <QrCode class="w-4 h-4" />
                        </button>
                        
                        <button onclick={() => copiarEnlace(propiedad.slug)} class="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg border border-transparent transition-all" title="Copiar Enlace">
                          <Link2 class="w-4 h-4" />
                        </button>

                        <div class="w-px h-5 bg-slate-200 dark:bg-zinc-700 mx-1"></div>

                        <a href="/admin/editar/{propiedad.id}" class="p-2 text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg border border-transparent transition-all" title="Editar">
                          <Pencil class="w-4 h-4" />
                        </a>

                        <form method="POST" action="?/eliminar" use:enhance class="inline-block m-0 p-0">
                          <input type="hidden" name="id" value={propiedad.id}>
                          <button type="button" class="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-500/10 rounded-lg border border-transparent transition-all" onclick={(e) => { if(confirm('¿Borrar propiedad permanentemente?')) e.target.closest('form').submit(); }} title="Eliminar">
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
</div>

{#if showUpsellModal}
  <div class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onclick={() => showUpsellModal = false}>
    <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-w-sm w-full overflow-hidden transform transition-all border border-slate-200 dark:border-zinc-800" onclick={e => e.stopPropagation()}>
      <div class="bg-slate-900 dark:bg-black p-8 text-center relative overflow-hidden">
         <div class="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
         <Sparkles class="w-10 h-10 mx-auto mb-4 text-amber-400 relative z-10" />
         <h3 class="text-xl font-bold tracking-tight text-white relative z-10">Smart Brochure</h3>
      </div>
      <div class="p-8">
        <p class="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed mb-6 font-medium text-center">
          Elimina las distracciones de tu catálogo y envuelve a tu cliente en una experiencia inmersiva, diseñada puramente para cerrar ventas más rápido.
        </p>
        <div class="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl p-3 mb-8">
          <p class="text-[10px] font-bold text-amber-600 dark:text-amber-400 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles class="w-3 h-3" /> Exclusivo Planes Pro y Elite
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <a href="/admin/perfil" class="w-full bg-slate-900 dark:bg-white text-white dark:text-zinc-900 font-bold py-3.5 rounded-xl text-center hover:bg-slate-800 dark:hover:bg-zinc-200 transition-all text-sm shadow-md active:scale-95">
            Mejorar mi Plan
          </a>
          <button onclick={() => showUpsellModal = false} class="w-full bg-white dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold py-3.5 rounded-xl text-center border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all text-sm">
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
