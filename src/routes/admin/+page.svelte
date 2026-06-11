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
    CheckCircle2
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades || []);
  let totalPropiedades = $derived(propiedades.length);

  let searchQuery = $state('');
  let propiedadesFiltradas = $derived(
    propiedades.filter(p => p.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let generandoPDF = $state(false);
  
  // 🔥 ESTADO DEL MODAL DE UPSELL
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

  // 🔥 CANDADO DE UPSELL PARA EL BROCHURE
  function intentarAbrirBrochure(slug) {
    const plan = broker?.plan_suscripcion || 'basico';
    if (plan === 'pro' || plan === 'elite') {
      window.open(`/${slug}?brochure=true`, '_blank');
    } else {
      showUpsellModal = true;
    }
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-muted/30 text-foreground font-sans">
  <header class="h-20 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20">
    <div>
      <h1 class="text-xl font-bold tracking-tight">Inventario Maestro</h1>
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Gestión de activos inmobiliarios</p>
    </div>
    
    <div class="flex items-center gap-3">
      {#if broker}
        <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground h-9 px-4 gap-2">
          <ExternalLink class="w-4 h-4" />
          Ver Portal
        </a>
      {/if}
      <a href="/admin/open-house/nueva" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 gap-2">
        <CalendarPlus class="w-4 h-4" />
        Open House
      </a>
      <a href="/admin/nueva" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 gap-2 shadow-sm">
        <Plus class="w-4 h-4" />
        Nueva Propiedad
      </a>
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto animate-in fade-in duration-500">
    <div class="max-w-7xl mx-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-background p-6 rounded-xl border border-border shadow-sm flex items-center justify-between group hover:border-primary/50 transition-colors">
          <div>
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Total Unidades</p>
            <p class="text-3xl font-bold tracking-tight">{totalPropiedades}</p>
          </div>
          <div class="w-12 h-12 bg-muted rounded-lg flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            <Building2 class="w-6 h-6" />
          </div>
        </div>
      </div>

      <div class="bg-background rounded-xl shadow-sm border border-border overflow-hidden relative">
        <div class="p-4 sm:p-6 border-b border-border bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" bind:value={searchQuery} placeholder="Buscar por título o colonia..." class="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all">
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead>
              <tr class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-background border-b border-border">
                <th class="w-[40%] px-6 py-4">Propiedad</th>
                <th class="w-[20%] px-6 py-4">Precio Mercado</th>
                <th class="w-[15%] px-6 py-4 text-center">Estatus</th>
                <th class="w-[25%] px-6 py-4 text-right">Gestión</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#if propiedadesFiltradas.length === 0}
                <tr>
                  <td colspan="4" class="px-6 py-12 text-center text-muted-foreground text-sm font-medium">
                    No se encontraron propiedades en tu inventario.
                  </td>
                </tr>
              {:else}
                {#each propiedadesFiltradas as propiedad}
                  <tr class="group hover:bg-muted/30 transition-colors">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-4">
                        <div class="h-12 w-16 rounded-md overflow-hidden bg-muted shrink-0 border border-border group-hover:border-primary/30 transition-colors">
                          <img src={propiedad.imagen_url} alt="Portada" class="w-full h-full object-cover">
                        </div>
                        <div class="truncate">
                          <div class="text-sm font-semibold text-foreground leading-tight mb-1 flex items-center gap-2 truncate">
                            <span class="truncate">{propiedad.titulo}</span>
                            {#if propiedad.destacada}
                              <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-[8px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 uppercase tracking-widest shrink-0">VIP</span>
                            {/if}
                          </div>
                          <p class="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                            <MapPin class="w-3 h-3 shrink-0" />
                            <span class="truncate">{propiedad.ubicacion}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td class="px-6 py-4 truncate">
                      <p class="text-sm font-bold text-foreground">{formatter.format(propiedad.precio)}</p>
                      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{propiedad.operacion}</p>
                    </td>

                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <div class="flex flex-col items-center justify-center gap-1.5 h-full">
                        {#if propiedad.estatus === 'Pre-Mercado'}
                          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground uppercase tracking-widest bg-muted border-border">
                            <EyeOff class="w-3 h-3 mr-1" />
                            Oculta
                          </span>
                        {:else}
                          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-emerald-700 bg-emerald-50 border-emerald-200 uppercase tracking-widest">
                            <CheckCircle2 class="w-3 h-3 mr-1" />
                            Activa
                          </span>
                        {/if}

                        {#if propiedad.open_houses && propiedad.open_houses.length > 0}
                          {@const ohStatus = getOpenHouseStatus(propiedad.open_houses[0])}
                          {#if ohStatus === 'active'}
                            <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 uppercase tracking-widest" title="Dashboard Evento">
                              Open House
                            </a>
                          {:else}
                            <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-muted-foreground border-border hover:bg-muted uppercase tracking-widest" title="Ver Histórico">
                              Histórico OH
                            </a>
                          {/if}
                        {/if}
                      </div>
                    </td>

                    <td class="px-6 py-4">
                      <div class="flex justify-end gap-1 items-center">
                        <button onclick={() => descargarFicha(propiedad)} disabled={generandoPDF} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-9 w-9 text-muted-foreground" title="Descargar Ficha PDF">
                          {#if generandoPDF}
                            <Loader2 class="w-4 h-4 animate-spin" />
                          {:else}
                            <DownloadCloud class="w-4 h-4" />
                          {/if}
                        </button>
                        
                        <button onclick={() => intentarAbrirBrochure(propiedad.slug)} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-amber-100 hover:text-amber-700 h-9 w-9 text-amber-500" title="Smart Brochure">
                          <Sparkles class="w-4 h-4" />
                        </button>
                        
                        <button onclick={() => abrirQR(propiedad.slug, propiedad.titulo)} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-9 w-9 text-muted-foreground" title="Generar QR">
                          <QrCode class="w-4 h-4" />
                        </button>
                        
                        <button onclick={() => copiarEnlace(propiedad.slug)} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-9 w-9 text-muted-foreground" title="Copiar Enlace">
                          <Link2 class="w-4 h-4" />
                        </button>

                        <a href="/admin/editar/{propiedad.id}" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-muted hover:text-foreground h-9 w-9 text-muted-foreground" title="Editar">
                          <Pencil class="w-4 h-4" />
                        </a>

                        <form method="POST" action="?/eliminar" use:enhance class="inline-block m-0 p-0">
                          <input type="hidden" name="id" value={propiedad.id}>
                          <button type="button" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-destructive/10 hover:text-destructive h-9 w-9 text-muted-foreground" onclick={(e) => { if(confirm('¿Borrar propiedad permanentemente?')) e.target.closest('form').submit(); }} title="Eliminar">
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
  </div>
</main>

{#if showUpsellModal}
  <div class="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onclick={() => showUpsellModal = false}>
    <div class="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200" onclick={e => e.stopPropagation()}>
      <div class="p-6 text-center border-b border-zinc-800 relative overflow-hidden">
         <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
         <Sparkles class="w-10 h-10 mx-auto mb-3 text-amber-500 relative z-10" />
         <h3 class="text-xl font-bold tracking-tight text-zinc-50 relative z-10">Eleva tus Presentaciones</h3>
      </div>
      <div class="p-6">
        <p class="text-zinc-400 text-sm leading-relaxed mb-6 font-medium text-center">
          El <strong class="text-zinc-200">Smart Brochure</strong> elimina las distracciones de tu catálogo y envuelve a tu cliente en una experiencia inmersiva, diseñada puramente para cerrar ventas más rápido.
        </p>
        <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-8">
          <p class="text-[10px] font-bold text-amber-500 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles class="w-3 h-3" /> Función de planes Pro y Elite
          </p>
        </div>
        <div class="flex flex-col gap-2.5">
          <a href="/admin/perfil" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 w-full">
            Mejorar mi Plan
          </a>
          <button onclick={() => showUpsellModal = false} class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-400 h-10 px-4 w-full">
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
