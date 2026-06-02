<script>
  import { enhance } from '$app/forms';
  let { data } = $props();
  let broker = $derived(data.broker);
  let propiedades = $derived(data.propiedades);
  let totalPropiedades = $derived(propiedades.length);

  function copiarEnlace(slug) {
    const url = `https://${broker.subdominio}.inmublia.com/${slug}`;
    navigator.clipboard.writeText(url);
    alert('Enlace copiado: ' + url);
  }
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-blue-100">
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-10 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola</p>
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 bg-slate-50 text-blue-600 rounded-xl font-bold border border-slate-100 shadow-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario
      </a>
    </nav>
    <div class="p-6 border-t border-slate-100 bg-slate-50/50">
      <div class="px-2 py-2 text-sm font-bold text-slate-900 truncate">{broker ? broker.nombre_comercial : 'Usuario'}</div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors w-full text-left text-sm">
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-24 bg-slate-50 flex items-center justify-between px-10 shrink-0">
      <h1 class="text-3xl font-light text-slate-900 tracking-tight">Propiedades</h1>
      <div class="flex items-center gap-4">
        {#if broker}
          <a href="https://{broker.subdominio}.inmublia.com" target="_blank" class="hidden sm:flex text-slate-500 hover:text-slate-900 font-bold items-center gap-2 transition-colors px-5 py-2.5 rounded-full hover:bg-slate-200 text-sm">
            Ver catálogo web
          </a>
        {/if}
        <a href="/admin/nueva" class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Crear Propiedad
        </a>
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      {#if broker}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div class="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Activas</h3>
            <p class="text-4xl font-light text-slate-900">{totalPropiedades}</p>
          </div>
          <div class="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Interacciones</h3>
            <p class="text-4xl font-light text-blue-600">0</p>
          </div>
        </div>

        {#if propiedades.length > 0}
          <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100">
            <table class="min-w-full divide-y divide-slate-100">
              <thead class="bg-slate-50/50">
                <tr>
                  <th scope="col" class="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inmueble</th>
                  <th scope="col" class="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor</th>
                  <th scope="col" class="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estatus</th>
                  <th scope="col" class="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-50">
                {#each propiedades as propiedad}
                  <tr class="hover:bg-slate-50/50 transition-colors group">
                    <td class="px-8 py-6 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="h-16 w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                          <img class="h-full w-full object-cover" src={propiedad.imagen_url} alt={propiedad.titulo}>
                        </div>
                        <div class="ml-6">
                          <div class="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                            {propiedad.titulo}
                            {#if propiedad.destacada}
                              <span class="bg-amber-100 text-amber-700 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full font-black">VIP</span>
                            {/if}
                          </div>
                          <div class="text-xs text-slate-500 font-mono tracking-tight">/{propiedad.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap">
                      <div class="text-base font-light text-slate-900">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</div>
                      <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{propiedad.operacion}</div>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap">
                      <span class="px-4 py-1.5 inline-flex text-xs font-bold rounded-full bg-emerald-50 text-emerald-600">
                        Público
                      </span>
                    </td>
                    <td class="px-8 py-6 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-3 h-full mt-3">
                      <button onclick={() => copiarEnlace(propiedad.slug)} class="text-slate-400 hover:text-slate-900 transition-colors p-2" title="Copiar Enlace">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                      </button>
                      
                      <a href="/admin/editar/{propiedad.id}" class="text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">
                        Editar
                      </a>

                      <form method="POST" action="?/eliminar" use:enhance onsubmit={() => confirm('¿Estás seguro de eliminar esta propiedad definitivamente?')} class="inline">
                        <input type="hidden" name="id" value={propiedad.id}>
                        <button type="submit" class="text-slate-500 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 transition-colors px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">
                          Borrar
                        </button>
                      </form>
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
