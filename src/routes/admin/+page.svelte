<script>
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades);

  // MEJORA 1: Analítica en tiempo real usando Runes de Svelte 5
  let totalPropiedades = $derived(propiedades.length);
  let valorInventario = $derived(propiedades.reduce((sum, prop) => sum + Number(prop.precio), 0));
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900">
  <aside class="w-64 bg-[#0a0a0a] text-slate-400 flex flex-col hidden md:flex border-r border-slate-800 shrink-0">
    <div class="h-20 flex items-center px-6 border-b border-white/5">
      <img src="/logo.png" alt="Inmublia" class="h-8 w-auto brightness-0 invert opacity-90">
      <span class="ml-3 font-black text-white tracking-wide text-xl">Panel</span>
    </div>
    <nav class="flex-1 p-4 space-y-2">
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-white bg-blue-600/20 text-blue-400 rounded-xl font-bold border border-blue-500/20">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Mi Inventario
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        Perfil de Agencia
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
          <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:flex text-slate-500 hover:text-blue-600 font-bold items-center gap-2 transition-colors px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-blue-50 hover:border-blue-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            Ver mi sitio web
          </a>
        {/if}

        <a href="/admin/nueva" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm shadow-blue-600/30 transition-all flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Nueva Propiedad
        </a>
      </div>
    </header>

    <div class="p-8 flex-1 overflow-auto">
      
      {#if !broker}
        <div class="bg-red-50 text-red-600 p-4 rounded-lg font-bold border border-red-100 flex items-center gap-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          Error: Tu usuario no tiene una agencia asignada en el sistema. Contacta soporte.
        </div>
      {:else}

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Propiedades</h3>
            <p class="text-3xl font-black text-slate-900">{totalPropiedades}</p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Valor del Inventario</h3>
            <p class="text-3xl font-black text-blue-600">${new Intl.NumberFormat('es-MX').format(valorInventario)} <span class="text-sm text-slate-400 font-medium">MXN</span></p>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Vistas este mes</h3>
            <div class="flex items-end gap-2">
              <p class="text-3xl font-black text-slate-900">0</p>
              <span class="text-sm font-bold text-emerald-500 mb-1 flex items-center"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg> Nuevo</span>
            </div>
          </div>
        </div>

        {#if propiedades.length === 0}
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-2">Tu inventario está vacío</h3>
            <p class="text-slate-500 mb-8 max-w-sm mx-auto text-lg">Sube tu primera propiedad de lujo para que se refleje inmediatamente en tu sitio web B2C.</p>
            <a href="/admin/nueva" class="inline-flex items-center gap-2 bg-slate-900 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Crear mi primer listado
            </a>
          </div>
        {:else}
          <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table class="min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Propiedad & Ubicación</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio de Lista</th>
                  <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" class="relative px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-100">
                {#each propiedades as propiedad}
                  <tr class="hover:bg-slate-50 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="h-14 w-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                          <img class="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" src={propiedad.imagen_url} alt={propiedad.titulo}>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-bold text-slate-900 mb-0.5">{propiedad.titulo}</div>
                          <div class="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-0.5 rounded">/{propiedad.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-black text-slate-900">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</div>
                      <div class="text-xs font-bold text-slate-400">MXN</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 mt-1.5"></span> Activa
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="/admin/editar/{propiedad.id}" class="text-slate-400 hover:text-blue-600 transition-colors mr-4 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-200">Editar</a>
                      <button class="text-slate-400 hover:text-red-600 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-red-200">Eliminar</button>
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
