<script>
  import { page } from '$app/stores';
</script>

<div class="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900 selection:bg-indigo-100">
  <div class="max-w-md w-full text-center">
    <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-red-100">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
    </div>
    
    <h1 class="text-6xl font-black text-slate-900 tracking-tighter mb-4">{$page.status}</h1>
    <h2 class="text-xl font-bold text-slate-800 mb-4">Algo no salió como esperábamos</h2>
    
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <p class="text-sm font-medium text-slate-500 mb-2 uppercase tracking-widest text-[10px]">Detalle del Sistema</p>
      <p class="text-sm font-mono text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 overflow-hidden text-ellipsis">
        {$page.error?.message || 'Error interno de sincronización.'}
      </p>
    </div>

    <!-- MEJORA: Enlace directo al Dashboard en lugar de history.back() -->
    <a href="/admin" class="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mx-auto inline-flex">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
      Volver al Panel Principal
    </a>
  </div>
</div>
