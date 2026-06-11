<script>
  import { enhance } from '$app/forms';
  import { generarFichaPDF } from '$lib/utils/pdf'; 
  import { 
    Building2, 
    ExternalLink, 
    CalendarPlus, 
    Plus, 
    Search, 
    MapPin, 
    DownloadCloud, 
    Sparkles, 
    QrCode, 
    Link2, 
    Pencil, 
    Trash2, 
    EyeOff,
    CheckCircle2,
    BadgeDollarSign,
    TrendingUp
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades || []);
  
  // 🔥 MÉTRICAS INTELIGENTES
  let totalPropiedades = $derived(propiedades.length);
  let valorPortafolio = $derived(propiedades.reduce((acc, p) => acc + (Number(p.precio) || 0), 0));
  let activasCount = $derived(propiedades.filter(p => p.estatus !== 'Pre-Mercado').length);
  let preMercadoCount = $derived(propiedades.filter(p => p.estatus === 'Pre-Mercado').length);

  let searchQuery = $state('');
  let propiedadesFiltradas = $derived(
    propiedades.filter(p => p.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let generandoPDF = $state(false);
  let showUpsellModal = $state(false);

  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });

  function getOpenHouseStatus(openHouse) {
    if (!openHouse || !openHouse.event_date || !openHouse.time_end) return 'none';
    const now = new Date();
    const eventEndString = `${openHouse.event_date}T${openHouse.time_end}`;
    const eventEnd = new Date(eventEndString);
    return now > eventEnd ? 'archived' : 'active';
  }

  async function descargarFicha(propiedad) {
    generandoPDF = true;
    try {
      await generarFichaPDF(propiedad, broker);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Hubo un problema al generar el archivo. Intenta de nuevo.');
    } finally {
      generandoPDF = false;
    }
  }

  function copiarEnlace(slug) {
    const url = `https://${broker.subdominio}.inmublia.com/${slug}`;
    navigator.clipboard.writeText(url);
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
          h2 { color: #09090b; margin-bottom: 8px; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
          p { color: #71717a; margin-top: 0; margin-bottom: 32px; font-size: 14px; }
          .qr-card { background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e4e4e7; }
          img { max-width: 400px; width: 100%; border-radius: 12px; }
          .botones { margin-top: 40px; display: flex; gap: 12px; }
          button { padding: 10px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 14px; }
          .btn-imprimir { background: #09090b; color: white; border: none; }
          .btn-imprimir:hover { background: #27272a; }
          .btn-guardar { background: white; color: #09090b; border: 1px solid #e4e4e7; }
          .btn-guardar:hover { background: #f4f4f5; }
          @media print {
            body { background-color: white; justify-content: flex-start; padding-top: 40px; }
            .botones { display: none; }
            .qr-card { box-shadow: none; padding: 0; border: none; }
          }
        </style>
      </head>
      <body>
        <h2>${titulo}</h2>
        <p>Escanea para acceder a la ficha técnica</p>
        <div class="qr-card">
          <img src="${qrApiUrl}" alt="Código QR"/>
        </div>
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
              alert('La seguridad del navegador bloqueó la descarga. Haz clic derecho en el QR y selecciona "Guardar imagen como..."');
            }
          }
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  }

  function intentarAbrirBrochure(slug) {
    const plan = broker?.plan_suscripcion || 'basico';
    if (plan === 'pro' || plan === 'elite') {
      window.open(`/${slug}?brochure=true`, '_blank');
    } else {
      showUpsellModal = true;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
  
  <header class="bg-zinc-950 text-white pt-8 pb-32 px-6 sm:px-10 shrink-0 relative overflow-hidden">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50">Inventario Maestro</h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          <Building2 class="w-4 h-4" />
          Consola de Gestión Inmublia
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        {#if broker}
          <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 hover:text-white h-11 px-5 gap-2 backdrop-blur-sm">
            <ExternalLink class="w-4 h-4" />
            Ver Portal Público
          </a>
        {/if}
        <a href="/admin/open-house/nueva" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-100 h-11 px-5 gap-2 backdrop-blur-sm">
          <CalendarPlus class="w-4 h-4" />
          Open House
        </a>
        <a href="/admin/nueva" class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-white text-zinc-950 hover:bg-zinc-200 h-11 px-6 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] transform active:scale-95">
          <Plus class="w-4 h-4" />
          Nueva Propiedad
        </a>
      </div>
    </div>
  </header>

  <main class="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-10 -mt-20 relative z-20 pb-8">
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      <div class="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/50 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor de Portafolio</p>
          <div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <BadgeDollarSign class="w-4 h-4" />
          </div>
        </div>
        <p class="text-2xl font-black text-slate-900 tracking-tight truncate">{formatter.format(valorPortafolio)}</p>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/50 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Unidades</p>
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 class="w-4 h-4" />
          </div>
        </div>
        <p class="text-3xl font-black text-slate-900 tracking-tight">{totalPropiedades}</p>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/50 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Públicas</p>
          <div class="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CheckCircle2 class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-end gap-2">
          <p class="text-3xl font-black text-slate-900 tracking-tight">{activasCount}</p>
          <p class="text-xs text-slate-400 font-medium mb-1">En mercado</p>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/50 flex flex-col justify-between">
        <div class="flex items-center justify-between mb-4">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Pre-Mercado</p>
          <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <EyeOff class="w-4 h-4" />
          </div>
        </div>
        <div class="flex items-end gap-2">
          <p class="text-3xl font-black text-slate-900 tracking-tight">{preMercadoCount}</p>
          <p class="text-xs text-slate-400 font-medium mb-1">Ocultas</p>
        </div>
      </div>

    </div>

    <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/50 overflow-hidden relative">
      
      <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" bind:value={searchQuery} placeholder="Buscar por título o colonia..." class="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm">
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse table-fixed min-w-[900px]">
          <thead>
            <tr class="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white border-b border-slate-100">
              <th class="w-[40%] px-6 py-4">Activo Inmobiliario</th>
              <th class="w-[20%] px-6 py-4">Valor</th>
              <th class="w-[15%] px-6 py-4 text-center">Estatus</th>
              <th class="w-[25%] px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100/80">
            {#if propiedadesFiltradas.length === 0}
              <tr>
                <td colspan="4" class="px-6 py-16 text-center text-slate-500 text-sm font-medium">
                  <div class="flex flex-col items-center justify-center gap-3">
                    <Search class="w-8 h-8 text-slate-300" />
                    No se encontraron propiedades.
                  </div>
                </td>
              </tr>
            {:else}
              {#each propiedadesFiltradas as propiedad}
                <tr class="group hover:bg-slate-50/60 transition-colors">
                  <td class="px-6 py-5">
                    <div class="flex items-center gap-4">
                      <div class="h-14 w-20 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 shadow-sm group-hover:border-indigo-200 transition-colors">
                        <img src={propiedad.imagen_url} alt="Portada" class="w-full h-full object-cover">
                      </div>
                      <div class="truncate">
                        <div class="text-sm font-bold text-slate-900 leading-tight mb-1 flex items-center gap-2 truncate">
                          <span class="truncate">{propiedad.titulo}</span>
                          {#if propiedad.destacada}
                            <span class="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm shrink-0">VIP</span>
                          {/if}
                        </div>
                        <p class="text-xs text-slate-500 flex items-center gap-1.5 truncate font-medium">
                          <MapPin class="w-3 h-3 shrink-0 text-slate-400" />
                          <span class="truncate">{propiedad.ubicacion}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-5 truncate">
                    <p class="text-sm font-black text-slate-900">{formatter.format(propiedad.precio)}</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <TrendingUp class="w-3 h-3" />
                      {propiedad.operacion}
                    </p>
                  </td>

                  <td class="px-6 py-5 text-center whitespace-nowrap">
                    <div class="flex flex-col items-center justify-center gap-2 h-full">
                      {#if propiedad.estatus === 'Pre-Mercado'}
                        <span class="inline-flex items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest shadow-sm">
                          <EyeOff class="w-3 h-3 mr-1.5 text-slate-400" />
                          Oculta
                        </span>
                      {:else}
                        <span class="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 uppercase tracking-widest shadow-sm">
                          <CheckCircle2 class="w-3 h-3 mr-1.5 text-emerald-500" />
                          Pública
                        </span>
                      {/if}

                      {#if propiedad.open_houses && propiedad.open_houses.length > 0}
                        {@const ohStatus = getOpenHouseStatus(propiedad.open_houses[0])}
                        {#if ohStatus === 'active'}
                          <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[9px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors uppercase tracking-widest" title="Dashboard Evento">
                            <CalendarPlus class="w-3 h-3 mr-1" /> Open House
                          </a>
                        {:else}
                          <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-widest" title="Ver Histórico">
                            Histórico OH
                          </a>
                        {/if}
                      {/if}
                    </div>
                  </td>

                  <td class="px-6 py-5">
                    <div class="flex justify-end gap-1.5 items-center">
                      <button onclick={() => descargarFicha(propiedad)} disabled={generandoPDF} class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50" title="Descargar PDF">
                        <DownloadCloud class="w-4 h-4 {generandoPDF ? 'animate-pulse' : ''}" />
                      </button>
                      
                      <button onclick={() => intentarAbrirBrochure(propiedad.slug)} class="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Smart Brochure">
                        <Sparkles class="w-4 h-4" />
                      </button>
                      
                      <button onclick={() => abrirQR(propiedad.slug, propiedad.titulo)} class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Generar QR">
                        <QrCode class="w-4 h-4" />
                      </button>
                      
                      <button onclick={() => copiarEnlace(propiedad.slug)} class="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors" title="Copiar Enlace">
                        <Link2 class="w-4 h-4" />
                      </button>

                      <div class="w-px h-5 bg-slate-200 mx-1"></div>

                      <a href="/admin/editar/{propiedad.id}" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                        <Pencil class="w-4 h-4" />
                      </a>

                      <form method="POST" action="?/eliminar" use:enhance class="inline-block m-0 p-0">
                        <input type="hidden" name="id" value={propiedad.id}>
                        <button type="button" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onclick={(e) => { if(confirm('¿Borrar propiedad permanentemente?')) e.target.closest('form').submit(); }} title="Eliminar">
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

  </main>
</div>

{#if showUpsellModal}
  <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onclick={() => showUpsellModal = false}>
    <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all border border-slate-200" onclick={e => e.stopPropagation()}>
      <div class="bg-slate-900 p-8 text-center relative overflow-hidden">
         <div class="absolute top-0 right-0 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
         <Sparkles class="w-10 h-10 mx-auto mb-4 text-amber-400 relative z-10" />
         <h3 class="text-xl font-bold tracking-tight text-white relative z-10">Smart Brochure</h3>
      </div>
      <div class="p-8">
        <p class="text-slate-600 text-sm leading-relaxed mb-6 font-medium text-center">
          Elimina las distracciones de tu catálogo y envuelve a tu cliente en una experiencia inmersiva, diseñada puramente para cerrar ventas más rápido.
        </p>
        <div class="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mb-8">
          <p class="text-[10px] font-bold text-amber-600 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles class="w-3 h-3" /> Exclusivo Planes Pro y Elite
          </p>
        </div>
        <div class="flex flex-col gap-3">
          <a href="/admin/perfil" class="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-center hover:bg-slate-800 transition-all text-sm shadow-md active:scale-95">
            Mejorar mi Plan
          </a>
          <button onclick={() => showUpsellModal = false} class="w-full bg-white text-slate-500 font-bold py-3.5 rounded-xl text-center border border-slate-200 hover:bg-slate-50 transition-all text-sm">
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
