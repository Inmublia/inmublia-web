<!-- src/lib/components/Sidebar.svelte -->
<script>
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { 
    LayoutDashboard, 
    Users, 
    TrendingUp, 
    Settings, 
    LogOut,
    Target,
    Palette,
    Terminal,
    Share2, 
    Building2,
    Sun,
    Moon
  } from 'lucide-svelte';
  
  let broker = $derived($page.data.broker || {});
  let rutaActual = $derived($page.url.pathname);

  const rolesOperativos = ['soporte', 'operaciones', 'ingenieria', 'superadmin'];
  let miRol = $derived($page.data.rolInterno || 'broker');
  let tieneAcceso = $derived(rolesOperativos.includes(miRol));

  // 🔥 GESTIÓN DEL TEMA NATIVO EN EL SIDEBAR (SaaS 2026 Standard)
  let isDarkMode = $state(false);

  $effect(() => {
    if (browser) {
      isDarkMode = document.documentElement.classList.contains('dark');
    }
  });

  function toggleTheme() {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
</script>

<!-- 
  ARQUITECTURA LIGHT/DARK MODE (2026):
  - Fondo default: F8FAFC (slate-50) para light, zinc-950 para dark.
  - Bordes y separadores reaccionan dinámicamente.
-->
<aside class="w-[260px] bg-slate-50 dark:bg-zinc-950 flex flex-col hidden md:flex shrink-0 shadow-[4px_0_24px_rgba(15,23,42,0.02)] dark:shadow-2xl z-10 h-screen font-sans border-r border-slate-200 dark:border-transparent transition-colors duration-300">
  
  <a href="/admin" class="h-20 flex items-center justify-center border-b border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-900/50 transition-colors group px-6" aria-label="Ir al Inventario Real">
    <div class="flex items-center gap-3 transition-transform duration-300 group-hover:scale-105">
      <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
        <Building2 class="w-4 h-4" />
      </div>
      <h1 class="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">Inmublia</h1>
    </div>
  </a>
  
  <nav class="flex-1 p-6 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
    <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Consola Operativa</p>

    <!-- ESTILO DE ENLACE B2B: Hover sutil, activo con fondo off-white elevado o variante dark -->
    <a href="/admin" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual === '/admin' || rutaActual === '/admin/' ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <LayoutDashboard class="w-4 h-4 {rutaActual === '/admin' || rutaActual === '/admin/' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Inventario Real
    </a>
    
    <a href="/admin/leads" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/leads') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <Users class="w-4 h-4 {rutaActual.includes('/admin/leads') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Prospectos (CRM)
    </a>

    <a href="/admin/directorio" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/directorio') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <Target class="w-4 h-4 {rutaActual.includes('/admin/directorio') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Bóveda & Matchmaking
    </a>

    <a href="/admin/reportes" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/reportes') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <TrendingUp class="w-4 h-4 {rutaActual.includes('/admin/reportes') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Inteligencia & Finanzas
    </a>

    <!-- NUEVO ENLACE: Publicar en Redes (Usando Share2, más premium) -->
    <a href="/admin/publicar" class="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/publicar') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border group">
      <div class="flex items-center gap-3">
        <Share2 class="w-4 h-4 {rutaActual.includes('/admin/publicar') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
        Sync Redes
      </div>
      <!-- Indicador sutil de Meta Integration -->
      <div class="w-1.5 h-1.5 rounded-full bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.6)] {rutaActual.includes('/admin/publicar') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300"></div>
    </a>

    <div class="my-4 border-t border-slate-200 dark:border-zinc-800/50 mx-3 transition-colors duration-300"></div>
    <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4 px-3">Sistema</p>

    <a href="/admin/apariencia" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/apariencia') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <Palette class="w-4 h-4 {rutaActual.includes('/admin/apariencia') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Design Studio
    </a>

    <a href="/admin/perfil" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/perfil') ? 'bg-white border-slate-200 text-indigo-700 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
      <Settings class="w-4 h-4 {rutaActual.includes('/admin/perfil') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}" />
      Configuración
    </a>

    {#if tieneAcceso}
      <div class="pt-4 mt-4 border-t border-slate-200 dark:border-zinc-800/50 transition-colors duration-300">
        <p class="px-3 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Administración</p>
        <a href="/admin/operaciones" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all {rutaActual.includes('/admin/operaciones') ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' : 'text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'} border">
          <Terminal class="w-4 h-4 {rutaActual.includes('/admin/operaciones') ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-500'}" />
          Consola Central
        </a>
      </div>
    {/if}
  </nav>
  
  <div class="p-6 border-t border-slate-200 dark:border-zinc-800/50 bg-slate-50 dark:bg-zinc-950 shrink-0 transition-colors duration-300">
    <div class="flex items-center justify-between gap-3 mb-5 px-2">
      <!-- Soporte para Avatars tanto claros como oscuros -->
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden border border-slate-300 dark:border-zinc-700 shadow-sm shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'U'}&background=e2e8f0&color=475569`} alt="Avatar" class="w-full h-full object-cover">
        </div>
        <div class="truncate">
          <p class="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{broker.nombre_comercial || 'Usuario Maestro'}</p>
          <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Asesor Inmobiliario</p>
        </div>
      </div>
      
      <!-- 🚀 FIX: Toggle de Tema Integrado Elegantemente (SaaS Standard) -->
      <button 
        onclick={toggleTheme}
        class="shrink-0 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all shadow-sm active:scale-95"
        aria-label="Alternar Tema"
        title="Cambiar Apariencia"
      >
        {#if isDarkMode}
          <Sun class="w-4 h-4" />
        {:else}
          <Moon class="w-4 h-4" />
        {/if}
      </button>
    </div>

    <form action="/logout" method="POST">
      <button type="submit" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold transition-all w-full rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:border-rose-200 hover:bg-rose-50 dark:hover:border-rose-500/20 dark:hover:bg-rose-500/10 text-xs cursor-pointer active:scale-95">
        <LogOut class="w-4 h-4" />
        Cerrar Sesión
      </button>
    </form>
  </div>
</aside>
