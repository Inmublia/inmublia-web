<script>
  import { Eye, LogOut } from 'lucide-svelte';

  let { isImpersonating } = $props();
</script>

{#if isImpersonating}
  <!-- Degradado rojo de alta visibilidad para estatus crítico / observación -->
  <div class="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-b border-red-800 py-3 px-6 flex flex-col sm:flex-row items-center justify-between text-white text-xs font-medium z-50 relative shadow-lg">
    <div class="flex items-center gap-3 mb-3 sm:mb-0">
      <div class="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
        <Eye class="w-4 h-4 text-white" />
      </div>
      <p class="leading-relaxed">
        <strong class="font-black mr-1 tracking-wide uppercase">Modo Visualización:</strong> 
        Navegando cuenta de cliente como observador. Cambios bloqueados por seguridad.
      </p>
    </div>
    
    <!-- Eliminado use:enhance para forzar navegación dura y evitar el Error 500 con el redirect 303 -->
    <form method="POST" action="/admin/salir-impersonacion">
      <button type="submit" class="flex items-center gap-2 bg-slate-900 hover:bg-slate-950 text-white px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 font-bold shrink-0 border border-slate-800">
        <LogOut class="w-4 h-4" />
        Terminar Sesión
      </button>
    </form>
  </div>
{/if}
