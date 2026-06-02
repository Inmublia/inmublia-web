<script>
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades);
  let totalPropiedades = $derived(propiedades.length);

  // Funcionalidad 1: Copiar enlace al portapapeles
  function copiarEnlace(slug) {
    const url = `https://${broker.subdominio}.inmublia.com/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado: ' + url);
  }
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900">
  <aside class="w-64 bg-[#0a0a0a] text-slate-400 flex flex-col hidden md:flex border-r border-slate-800 shrink-0">
    <div class="h-20 flex items-center px-6 border-b border-white/5">
      <img src="/logo.png" alt="Inmublia" class="h-8 w-auto">
      <span class="ml-3 font-black text-white tracking-wide text-xl">Panel</span>
    </div>
    <nav class="flex-1 p-4 space-y-2">
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-white bg-blue-600/20 text-blue-400 rounded-xl font-bold border border-blue-500/20">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Mi Inventario
      </a>
    </nav>
    <div class="p-4 border-t border-white/5">
      <div class="px-4 py-3 text-sm font-bold text-white mb-2 truncate">
        {broker ? broker.nombre_comercial : 'Usuario'}
      </div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors w-full text-left">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Propiedades Activas</h1>
      <div class="flex items-center gap-4">
        {#if broker}
          <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:flex text-slate-500 hover:text-blue-600 font-bold items-center gap-2 transition-colors px-4 py-2 border border-slate-200 rounded-lg hover:bg-blue-50">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            Ver mi sitio web
          </a>
        {/if}
        <a href="/admin/nueva" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nueva Propiedad
        </a>
      </div>
    </header>

    <div class="p-8 flex-1 overflow-auto">
      {#if broker}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Propiedades</h3>
            <p class="text-3xl font-black text-slate-900">{totalPropiedades}</p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Prospectos Generados</h3>
            <div class="flex items-end gap-2">
              <p class="text-3xl font-black text-blue-600">0</p>
              <span class="text-sm font-bold text-slate-400 mb-1">Este mes</span>
            </div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Vistas de Perfil</h3>
            <div class="flex items-end gap-2">
              <p class="text-3xl font-black text-slate-900">0</p>
              <span class="text-sm font-bold text-emerald-500 mb-1">+0%</span>
            </div>
          </div>
        </div>

        {#if propiedades.length > 0}
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Propiedad</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Precio / Tipo</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
                  <th scope="col" class="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Herramientas</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-100">
                {#each propiedades as propiedad}
                  <tr class="hover:bg-slate-50 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          <img class="h-full w-full object-cover" src={propiedad.imagen_url} alt={propiedad.titulo}>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-bold text-slate-900 mb-0.5 flex items-center gap-2">
                            {propiedad.titulo}
                            {#if propiedad.destacada}
                              <span class="bg-amber-100 text-amber-700 text-[10px] uppercase px-2 py-0.5 rounded-full">VIP</span>
                            {/if}
                          </div>
                          <div class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded">/{propiedad.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-black text-slate-900">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</div>
                      <div class="text-xs font-bold text-slate-500 mt-1">{propiedad.operacion || 'Venta'} • {propiedad.tipo || 'Inmueble'}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 inline-flex text-xs font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Publicada
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onclick={() => copiarEnlace(propiedad.slug)} class="text-slate-500 hover:text-slate-900 transition-colors mr-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg" title="Copiar enlace para WhatsApp">
                        <svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                      </button>
                      <a href="/admin/editar/{propiedad.id}" class="text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors mr-2 px-3 py-1.5 rounded-lg">Editar</a>
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
