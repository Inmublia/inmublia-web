<!-- src/routes/admin/operaciones/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { 
    Search, Users, Activity, CheckCircle2, ShieldAlert, ArrowRight, Building2, Terminal, Sparkles 
  } from 'lucide-svelte';

  let { data } = $props();
  let agencias = $derived(data.agencias || []);
  
  let searchQuery = $state(data.query || '');
  let isSearching = $state(false);

  let searchTimeout;
  function handleSearch() {
    isSearching = true;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      goto(`/admin/operaciones?q=${encodeURIComponent(searchQuery)}`, { keepFocus: true, noScroll: true });
      isSearching = false;
    }, 400); 
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col gap-6">
      
      <div class="flex items-center justify-between w-full">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
            <Terminal class="w-7 h-7 text-indigo-400" /> Centro de Operaciones
          </h1>
          <p class="text-sm font-medium text-zinc-400 mt-1">Directorio Global y Diagnóstico de Agencias</p>
        </div>

        <div class="hidden sm:flex items-center gap-4">
          <div class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-bold flex items-center gap-2 shadow-inner">
            <Activity class="w-4 h-4 text-emerald-400" /> Sistema Operativo
          </div>
        </div>
      </div>

    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 h-full">
      
      <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        
        <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div class="relative w-full sm:w-[500px]">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 {isSearching ? 'animate-pulse text-indigo-500' : ''}" />
            <input 
              type="text" 
              bind:value={searchQuery}
              oninput={handleSearch}
              placeholder="Buscar por correo, nombre o agencia..." 
              class="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            />
          </div>
          <div class="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm shrink-0">
            {agencias.length} Resultados
          </div>
        </div>

        <div class="overflow-x-auto flex-1">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100">
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[300px]">Cliente / Agencia</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Plan & Estado</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Créditos IA</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:table-cell">Registro</th>
                <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#if agencias.length === 0}
                <tr>
                  <td colspan="5" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center justify-center">
                      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                        <Users class="w-8 h-8 text-slate-300" />
                      </div>
                      <p class="text-sm font-bold text-slate-500">No se encontraron agencias con ese criterio.</p>
                    </div>
                  </td>
                </tr>
              {/if}

              {#each agencias as agencia}
                <tr onclick={() => goto(`/admin/operaciones/${agencia.id}`)} class="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                        {agencia.nombre ? agencia.nombre.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{agencia.nombre}</p>
                        <p class="text-xs font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <Building2 class="w-3 h-3" /> {agencia.agencia}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td class="px-6 py-4 hidden sm:table-cell">
                    <div class="flex flex-col items-start gap-1">
                      <span class="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                        {agencia.plan}
                      </span>
                      {#if agencia.estado === 'activa' || agencia.estado === 'activo' || agencia.estado === 'active'}
                        <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 class="w-3 h-3"/> Activo</span>
                      {:else}
                        <span class="text-[10px] font-bold text-rose-600 flex items-center gap-1 uppercase"><ShieldAlert class="w-3 h-3"/> {agencia.estado}</span>
                      {/if}
                    </div>
                  </td>

                  <td class="px-6 py-4 hidden md:table-cell">
                    <div class="flex items-center gap-2">
                      <Sparkles class="w-3.5 h-3.5 text-amber-500" />
                      <span class="text-sm font-black text-slate-700">{agencia.creditos_ia}</span>
                    </div>
                  </td>

                  <td class="px-6 py-4 hidden lg:table-cell">
                    <span class="text-xs font-bold text-slate-500">{agencia.registro_fmt}</span>
                  </td>

                  <td class="px-6 py-4 text-right">
                    <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white transition-all shadow-sm">
                      <ArrowRight class="w-4 h-4" />
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
