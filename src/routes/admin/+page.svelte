<script>
  import { enhance } from '$app/forms';
  import { generarFichaPDF } from '$lib/utils/pdf'; 
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades || []);
  let totalPropiedades = $derived(propiedades.length);

  let searchQuery = $state('');
  let propiedadesFiltradas = $derived(
    propiedades.filter(p => p.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let generandoPDF = $state(false);

  // Micro-interacción: Formateador de moneda premium
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0
  });

  // --- LÓGICA DE TIEMPO PARA OPEN HOUSE ---
  function getOpenHouseStatus(openHouse) {
    if (!openHouse || !openHouse.event_date || !openHouse.time_end) return 'none';
    
    const now = new Date();
    // Construimos la fecha y hora exacta de fin del evento
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
    alert('Enlace copiado: ' + url);
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
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; text-align: center; }
          h2 { color: #0f172a; margin-bottom: 8px; font-size: 24px; font-weight: 800; }
          p { color: #64748b; margin-top: 0; margin-bottom: 32px; }
          .qr-card { background: white; padding: 24px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
          img { max-width: 400px; width: 100%; border-radius: 12px; }
          .botones { margin-top: 40px; display: flex; gap: 16px; }
          button { padding: 12px 32px; border-radius: 50px; font-weight: bold; cursor: pointer; transition: all 0.2s; font-size: 14px; }
          .btn-imprimir { background: #0f172a; color: white; border: none; }
          .btn-guardar { background: white; color: #0f172a; border: 2px solid #e2e8f0; }
          @media print {
            body { background-color: white; justify-content: flex-start; padding-top: 40px; }
            .botones { display: none; }
            .qr-card { box-shadow: none; padding: 0; border: none; }
          }
        </style>
      </head>
      <body>
        <h2>${titulo}</h2>
        <p>Escanea para acceder a la ficha técnica privada</p>
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
              alert('La seguridad del navegador bloqueó la descarga directa. Haz clic derecho en el QR y selecciona "Guardar imagen como..."');
            }
          }
        <\/script>
      </body>
      </html>
    `);
    win.document.close();
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative">
  <header class="h-24 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-10 shrink-0 sticky top-0 z-20">
    <div>
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Inventario Maestro</h1>
      <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión de activos inmobiliarios</p>
    </div>
    
    <div class="flex items-center gap-4">
      {#if broker}
        <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:flex text-slate-500 hover:text-indigo-600 font-bold items-center gap-2 transition-colors px-5 py-2.5 rounded-xl hover:bg-indigo-50 text-sm border border-transparent hover:border-blue-100">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          Ver Portal Público
        </a>
      {/if}
      <a href="/admin/open-house/nueva" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-6 rounded-2xl transition-all flex items-center gap-2 text-sm shadow-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        Crear Open House
      </a>
      <a href="/admin/nueva" class="bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-slate-900/10 transition-all flex items-center gap-2 text-sm active:scale-95">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
        Nueva Propiedad
      </a>
    </div>
  </header>

  <div class="p-10 flex-1 overflow-auto animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-7xl mx-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
          <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Unidades</p>
            <p class="text-4xl font-black text-slate-900 tracking-tighter">{totalPropiedades}</p>
          </div>
          <div class="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden relative">
        <div class="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
            <svg class="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" bind:value={searchQuery} placeholder="Buscar por título o colonia..." class="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400">
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse table-fixed">
            <thead>
              <tr class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] bg-white border-b border-slate-100">
                <th class="w-[35%] px-8 py-5">Propiedad</th>
                <th class="w-[15%] px-8 py-5">Precio Mercado</th>
                <th class="w-[20%] px-8 py-5 text-center">Estatus / Eventos</th>
                <th class="w-[30%] px-8 py-5 text-right">Gestión Rápida</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#if propiedadesFiltradas.length === 0}
                <tr>
                  <td colspan="4" class="px-8 py-16 text-center text-slate-500 font-medium">
                    No se encontraron propiedades.
                  </td>
                </tr>
              {:else}
                {#each propiedadesFiltradas as propiedad}
                  <tr class="group hover:bg-slate-50/80 transition-all duration-300">
                    <td class="px-8 py-6 truncate">
                      <div class="flex items-center gap-5">
                        <div class="h-16 w-20 rounded-2xl overflow-hidden bg-slate-200 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          <img src={propiedad.imagen_url} alt="" class="w-full h-full object-cover">
                        </div>
                        <div class="truncate">
                          <div class="text-sm font-black text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors flex items-center gap-2 truncate">
                            <span class="truncate">{propiedad.titulo}</span>
                            {#if propiedad.destacada}
                              <span class="bg-amber-100 text-amber-700 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black shrink-0 shadow-sm">VIP</span>
                            {/if}
                          </div>
                          <p class="text-xs text-slate-400 flex items-center gap-1 font-medium italic truncate">
                            <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {propiedad.ubicacion}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td class="px-8 py-6 truncate">
                      <p class="text-lg font-black text-slate-900 tracking-tighter">{formatter.format(propiedad.precio)}</p>
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{propiedad.operacion}</p>
                    </td>

                    <td class="px-8 py-6 text-center whitespace-nowrap">
                      <div class="flex items-center justify-center gap-2 h-full">
                        {#if propiedad.estatus === 'Pre-Mercado'}
                          <span class="px-3 py-1.5 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full border shadow-sm bg-indigo-50 text-indigo-700 border-indigo-200">
                            Pre-Mercado
                          </span>
                        {:else}
                          <span class="px-3 py-1.5 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                            Activa
                          </span>
                        {/if}

                        {#if propiedad.open_houses && propiedad.open_houses.length > 0}
                          {@const ohStatus = getOpenHouseStatus(propiedad.open_houses[0])}
                          
                          {#if ohStatus === 'active'}
                            <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm" title="Ir al Dashboard del Evento">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              OH
                            </a>
                          {:else}
                            <a href="/admin/open-house/{propiedad.open_houses[0].id}" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-200" title="Ver Histórico del Open House">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                              OH
                            </a>
                          {/if}
                        {/if}
                      </div>
                    </td>

                    <td class="px-8 py-6">
                      <div class="flex justify-end gap-2 items-center">
                        <button onclick={() => descargarFicha(propiedad)} disabled={generandoPDF} class="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all hover:shadow-sm disabled:opacity-50" title="Descargar Ficha PDF">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </button>
                        
                        <button onclick={() => window.open(`/${propiedad.slug}?brochure=true`, '_blank')} class="p-2.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-all hover:shadow-sm" title="Smart Brochure">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </button>
                        
                        <button onclick={() => abrirQR(propiedad.slug, propiedad.titulo)} class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all hover:shadow-sm" title="Generar Código QR">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                        </button>
                        
                        <button onclick={() => copiarEnlace(propiedad.slug)} class="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all hover:shadow-sm" title="Copiar Enlace">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        </button>

                        <a href="/admin/editar/{propiedad.id}" class="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all hover:shadow-sm" title="Editar">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </a>

                        <form method="POST" action="?/eliminar" use:enhance class="inline-block">
                          <input type="hidden" name="id" value={propiedad.id}>
                          <button type="button" class="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl transition-all hover:shadow-sm" onclick={(e) => { if(confirm('¿Borrar propiedad permanentemente?')) e.target.closest('form').submit(); }}>
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
