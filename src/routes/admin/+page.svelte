<!-- src/routes/admin/+page.svelte -->
<div class="min-h-screen bg-slate-50 flex">
  <!-- Sidebar -->
  <aside class="w-64 bg-[#0a0a0a] text-slate-400 flex flex-col hidden md:flex">
    <div class="h-20 flex items-center px-6 border-b border-white/5">
      <img src="/logo.png" alt="Inmublia" class="h-6 w-auto brightness-0 invert opacity-90">
      <span class="ml-3 font-bold text-white tracking-wide">Panel</span>
    </div>
    <nav class="flex-1 p-4 space-y-2">
      <a href="#" class="flex items-center gap-3 px-4 py-3 text-white bg-white/10 rounded-xl font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Mis Propiedades
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        Perfil de Agencia
      </a>
    </nav>
    <div class="p-4 border-t border-white/5">
      <button class="flex items-center gap-3 px-4 py-3 hover:bg-white/5 hover:text-white rounded-xl font-medium transition-colors w-full">
        Cerrar Sesión
      </button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col">
    <!-- Header Admin -->
    <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
      <h1 class="text-xl font-black text-slate-900">Inventario</h1>
      <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Nueva Propiedad
      </button>
    </header>

    <!-- Dashboard Body -->
    <div class="p-8 flex-1 overflow-auto">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-slate-900 mb-1">No tienes propiedades activas</h3>
        <p class="text-slate-500 mb-6 max-w-sm mx-auto">Sube tu primera casa o departamento para que se refleje inmediatamente en tu sitio web.</p>
        <button class="text-blue-600 font-bold hover:text-blue-800">Crear mi primer listado &rarr;</button>
      </div>
    </div>
  </main>
</div>
