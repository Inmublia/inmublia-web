<script>
  import { enhance } from '$app/forms';
  import { Eye, LogOut } from 'lucide-svelte';

  let { isImpersonating } = $props();
</script>

{#if isImpersonating}
  <div class="w-full bg-slate-900 border-b border-slate-800 py-2.5 px-6 flex flex-col sm:flex-row items-center justify-between text-slate-300 text-xs font-medium z-50 relative shadow-md">
    <div class="flex items-center gap-3 mb-2 sm:mb-0">
      <div class="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
        <Eye class="w-3.5 h-3.5 text-indigo-400" />
      </div>
      <p>
        <strong class="text-indigo-300 font-bold mr-1 tracking-wide">MODO VISUALIZACIÓN.</strong> 
        Estás navegando la cuenta del cliente como observador. Los cambios están bloqueados por seguridad.
      </p>
    </div>
    
    <form method="POST" action="/admin/salir-impersonacion" use:enhance>
      <button type="submit" class="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors shadow-inner active:scale-95 font-bold shrink-0">
        <LogOut class="w-3.5 h-3.5" />
        Terminar Sesión
      </button>
    </form>
  </div>
{/if}
