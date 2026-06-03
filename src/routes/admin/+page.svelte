<script>
  import { enhance } from '$app/forms';
  import { generarFichaPDF } from '$lib/utils/pdf'; // <-- IMPORTACIÓN DEL MOTOR PDF
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades || []);
  let totalPropiedades = $derived(propiedades.length);

  // Motor de búsqueda en tiempo real
  let searchQuery = $state('');
  let propiedadesFiltradas = $derived(
    propiedades.filter(p => p.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Estado global para saber si un PDF se está generando
  let generandoPDF = $state(false);

  // Función asíncrona para disparar la descarga
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

  // Generador de Códigos QR
  function abrirQR(slug, titulo) {
    const url = `https://${broker.subdominio}.inmublia.com/${slug}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(url)}&format=png&margin=20`;
    
    const win = window.open('', '_blank');
    win.document.write(`
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background-color:#f8fafc; margin:0;">
        <h2 style="color:#0f172a; margin-bottom:10px;">${titulo}</h2>
        <p style="color:#64748b; margin-top:0; margin-bottom:30px;">Escanea para acceder a la ficha técnica privada</p>
        <div style="background:white; padding:20px; border-radius:24px; box-shadow:0 10px 40px rgba(0,0,0,0.08);">
          <img src="${qrApiUrl}" style="max-width:400px; width:100%; border-radius:12px;"/>
        </div>
        <button onclick="window.print()" style="margin-top:40px; padding:12px 32px; background:#0f172a; color:white; border:none; border-radius:50px; font-weight:bold; cursor:pointer;">Imprimir / Guardar PDF</button>
      </div>
    `);
  }

  // Validador de calidad del listado
  function obtenerEstado(prop) {
    if (!prop.m2_terreno || !prop.recamaras || !prop.banos) {
      return { texto: 'Faltan Datos', clase: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { texto: 'Optimizado', clase: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-blue-100">
  
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>

      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración
      </a>

    </nav>
    <div class="p-6 border-t border-slate-100 bg-white">
      <div class="px-2 py-2 text-sm font-bold text-slate-900 truncate">{broker ? broker.nombre_comercial : 'Usuario'}</div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors w-full text-left text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Propiedades Activas</h1>
      <div class="flex items-center gap-4">
        {#if broker}
          <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:flex text-slate-500 hover:text-blue-600 font-bold items-center gap-2 transition-colors px-5 py-2.5 rounded-full hover:bg-blue-50 text-sm border border-transparent hover:border-blue-100">
            Ver catálogo web
          </a>
        {/if}
        <a href="/admin/nueva" class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Crear Propiedad
        </a>
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      {#if broker}
        <div class="flex flex-col lg:flex-row gap-8 mb-10">
          
          <div class="flex-1 bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex items-center px-4">
            <svg class="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" bind:value={searchQuery} placeholder="Buscar por título o colonia..." class="w-full bg-transparent border-none focus:outline-none text-slate-900 py-3 placeholder:text-slate-400">
          </div>

          <div class="flex gap-4">
            <div class="bg-white rounded-2xl px-6 py-4 shadow-sm border border-slate-200 min-w-[150px]">
              <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Inventario</h3>
              <p class="text-2xl font-black text-slate-900">{totalPropiedades}</p>
            </div>
          </div>
        </div>

        {#if propiedadesFiltradas.length === 0}
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 text-center">
            <p class="text-slate-500 font-medium">No se encontraron propiedades.</p>
          </div>
        {:else}
          <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
            <table class="w-full divide-y divide-slate-100 table-fixed">
              <thead class="bg-slate-50/50 rounded-t-3xl">
                <tr>
                  <th scope="col" class="w-5/12 px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inmueble</th>
                  <th scope="col" class="w-3/12 px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th scope="col" class="w-2/12 px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calidad</th>
                  <th scope="col" class="w-2/12 px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                {#each propiedadesFiltradas as propiedad}
                  <tr class="hover:bg-slate-50/80 transition-colors group">
                    <td class="px-8 py-6 truncate">
                      <div class="flex items-center gap-6">
                        <div class="h-16 w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 shadow-sm">
                          <img class="h-full w-full object-cover" src={propiedad.imagen_url} alt={propiedad.titulo}>
                        </div>
                        <div class="truncate">
                          <div class="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2 truncate">
                            <span class="truncate">{propiedad.titulo}</span>
                            {#if propiedad.destacada}
                              <span class="bg-amber-100 text-amber-700 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black shrink-0">VIP</span>
                            {/if}
                          </div>
                          <div class="text-xs text-slate-500 font-mono tracking-tight truncate">/{propiedad.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-8 py-6 truncate">
                      <div class="text-sm font-black text-slate-900">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</div>
                      <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{propiedad.operacion}</div>
                    </td>
                    <td class="px-8 py-6">
                      <span class="px-3 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full border {obtenerEstado(propiedad).clase}">
                        {obtenerEstado(propiedad).texto}
                      </span>
                    </td>
                    <td class="px-8 py-6 text-right">
                      <div class="flex items-center justify-end gap-2">
                        
                        <button onclick={() => descargarFicha(propiedad)} disabled={generandoPDF} class="text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 p-2.5 rounded-lg transition-colors disabled:opacity-50" title="Descargar Ficha en PDF">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                          </svg>
                        </button>

                        <button onclick={() => window.open(`/${propiedad.slug}?brochure=true`, '_blank')} class="text-amber-500 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 p-2.5 rounded-lg transition-colors border border-amber-200" title="Abrir Smart Brochure (Modo Presentación)">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        </button>

                        <button onclick={() => abrirQR(propiedad.slug, propiedad.titulo)} class="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg transition-colors" title="Generar Código QR">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                        </button>

                        <button onclick={() => copiarEnlace(propiedad.slug)} class="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-lg transition-colors" title="Copiar Enlace">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        </button>
                        
                        <a href="/admin/editar/{propiedad.id}" class="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2.5 rounded-lg transition-colors" title="Editar">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </a>

                        <form method="POST" action="?/eliminar" use:enhance onsubmit={() => confirm('¿Borrar esta propiedad?')} class="inline">
                          <input type="hidden" name="id" value={propiedad.id}>
                          <button type="submit" class="text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 p-2.5 rounded-lg transition-colors" title="Eliminar">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      {/if}
    </div>
  </main>
</div>
