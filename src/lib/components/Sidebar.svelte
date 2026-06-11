<script>
  import { page } from '$app/stores';
  import { 
    LayoutDashboard, 
    Users, 
    TrendingUp, 
    Settings, 
    LogOut 
  } from 'lucide-svelte';
  
  // Extraemos el broker directamente del store global
  let broker = $derived($page.data.broker || {});
  
  // Leemos la URL actual para saber qué botón sombrear
  let rutaActual = $derived($page.url.pathname);
</script>

<aside class="w-[260px] bg-zinc-950 flex flex-col hidden md:flex shrink-0 shadow-2xl z-10 h-screen font-sans">
  
  <a href="/admin" class="h-20 flex items-center justify-center border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors group px-6" aria-label="Ir al Inventario Real">
    <img 
      src="/logo.png" 
      alt="Inmublia" 
      class="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
    >
  </a>
  
  <nav class="flex-1 p-6 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
    <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-3">Consola Operativa</p>
    
    <a href="/admin" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all {rutaActual === '/admin' || rutaActual === '/admin/' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}">
      <LayoutDashboard class="w-4 h-4 {rutaActual === '/admin' || rutaActual === '/admin/' ? 'text-indigo-400' : 'text-zinc-500'}" />
      Inventario Real
    </a>
    
    <a href="/admin/leads" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all {rutaActual.includes('/admin/leads') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}">
      <Users class="w-4 h-4 {rutaActual.includes('/admin/leads') ? 'text-indigo-400' : 'text-zinc-500'}" />
      Prospectos (CRM)
    </a>

   <a href="/admin/directorio" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all {rutaActual.includes('/admin/directorio') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}">
  <Target class="w-4 h-4 {rutaActual.includes('/admin/directorio') ? 'text-indigo-400' : 'text-zinc-500'}" />
  Bóveda & Matchmaking
   </a>

    <a href="/admin/reportes" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all {rutaActual.includes('/admin/reportes') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}">
      <TrendingUp class="w-4 h-4 {rutaActual.includes('/admin/reportes') ? 'text-indigo-400' : 'text-zinc-500'}" />
      Inteligencia & Finanzas
    </a>

    <div class="my-4 border-t border-zinc-800/50 mx-3"></div>
    <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-3">Sistema</p>

    <a href="/admin/perfil" class="flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all {rutaActual.includes('/admin/perfil') ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 border border-transparent'}">
      <Settings class="w-4 h-4 {rutaActual.includes('/admin/perfil') ? 'text-indigo-400' : 'text-zinc-500'}" />
      Configuración
    </a>
  </nav>
  
  <div class="p-6 border-t border-zinc-800/50 bg-zinc-950 shrink-0">
    <div class="flex items-center gap-3 mb-4 px-2">
      <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'U'}&background=18181b&color=fff`} alt="Avatar" class="w-8 h-8 rounded-full border border-zinc-700 shadow-sm">
      <div class="truncate">
        <p class="text-xs font-bold text-zinc-100 truncate">{broker.nombre_comercial || 'Usuario Maestro'}</p>
        <p class="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Asesor Inmobiliario</p>
      </div>
    </div>

    <form action="/logout" method="POST">
      <button type="submit" class="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 font-semibold transition-colors w-full rounded-lg border border-zinc-800 hover:border-rose-500/20 text-xs">
        <LogOut class="w-3.5 h-3.5" />
        Cerrar Sesión
      </button>
    </form>
  </div>
</aside>
