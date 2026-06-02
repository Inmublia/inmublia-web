<script>
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades);
</script>

<div class="min-h-screen bg-slate-50 flex">
  <!-- Sidebar -->
  <aside class="w-64 bg-[#0a0a0a] text-slate-400 flex flex-col hidden md:flex">
    <div class="h-20 flex items-center px-6 border-b border-white/5">
      <img src="/logo.png" alt="Inmublia" class="h-6 w-auto brightness-0 invert opacity-90">
      <span class="ml-3 font-bold text-white tracking-wide">Panel</span>
    </div>
    <nav class="flex-1 p-4 space-y-2">
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-white bg-white/10 rounded-xl font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Mi Inventario
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        Perfil de Agencia
      </a>
    </nav>
    <div class="p-4 border-t border-white/5">
      <!-- Muestra el nombre comercial del broker logueado -->
      <div class="px-4 py-3 text-sm font-bold text-white mb-2 truncate">
        {broker ? broker.nombre_comercial : 'Usuario'}
      </div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors w-full text-left">
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <!-- Header Admin -->
    <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <h1 class="text-xl font-black text-slate-900">Propiedades Activas</h1>
      <a href="/admin/nueva" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Nueva Propiedad
      </a>
    </header>

    <!-- Dashboard Body -->
    <div class="p-8 flex-1 overflow-auto">
      {#if !broker}
        <div class="bg-red-50 text-red-600 p-4 rounded-lg font-bold">
          Error: Tu usuario no tiene una agencia asignada en el sistema.
        </div>
      {:else if propiedades.length === 0}
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 mb-1">Tu inventario está vacío</h3>
          <p class="text-slate-500 mb-6 max-w-sm mx-auto">Sube tu primera propiedad para que se refleje inmediatamente en tu sitio web.</p>
          <a href="/admin/nueva" class="text-blue-600 font-bold hover:text-blue-800">Crear mi primer listado &rarr;</a>
        </div>
      {:else}
        <!-- Tabla de Inventario Dinámica -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Propiedad</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th scope="col" class="relative px-6 py-4"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              {#each propiedades as propiedad}
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-12 w-16 shrink-0 rounded-md overflow-hidden bg-slate-100">
                        <img class="h-full w-full object-cover" src={propiedad.imagen_url} alt="">
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-bold text-slate-900">{propiedad.titulo}</div>
                        <div class="text-sm text-slate-500">/{propiedad.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-black text-slate-900">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</div>
                    <div class="text-xs text-slate-500">MXN</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800">
                      Publicada
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a href="/admin/editar/{propiedad.id}" class="text-blue-600 hover:text-blue-900 mr-4">Editar</a>
                    <button class="text-red-600 hover:text-red-900">Eliminar</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </main>
</div>
