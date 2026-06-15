<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { Bell, Check, CheckSquare, Clock, Users, ShieldAlert, Inbox } from 'lucide-svelte';

  let { data } = $props();
  
  // Reactividad nativa sobre el listado de alertas
  let notificaciones = $derived(data.notificaciones || []);
  let pendientes = $derived(notificaciones.filter(n => !n.leida));
  let leidas = $derived(notificaciones.filter(n => n.leida));

  let procesandoId = $state(null);
  let procesandoMasivo = $state(false);

  // Formateador simple de tiempo transcurrido
  function haceCuanto(fechaStr) {
    const ahora = new Date();
    const fecha = new Date(fechaStr);
    const difMs = ahora - fecha;
    const difMin = Math.floor(difMs / 60000);
    const difHoras = Math.floor(difMin / 60);
    const difDias = Math.floor(difHoras / 24);

    if (difMin < 60) return `Hace ${difMin} min`;
    if (difHoras < 24) return `Hace ${difHoras} horas`;
    return `Hace ${difDias} días`;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-rose-500 rounded-xl text-white shadow-sm shadow-rose-500/10">
        <Bell class="w-5 h-5" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Centro de Alertas</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
          Prospectos en riesgo de enfriamiento
        </p>
      </div>
    </div>

    {#if pendientes.length > 0}
      <div>
        <form method="POST" action="?/marcarTodasLeidas" use:enhance={() => {
          procesandoMasivo = true;
          return async ({ update }) => {
            procesandoMasivo = false;
            await invalidateAll();
            update({ reset: false });
          };
        }}>
          <button type="submit" disabled={procesandoMasivo} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm flex items-center gap-2 transition-all text-xs cursor-pointer active:scale-95">
            <CheckSquare class="w-4 h-4" /> Marcar todas como leídas
          </button>
        </form>
      </div>
    {/if}
  </header>

  <div class="p-6 md:p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-4xl mx-auto space-y-8">
      
      {#if notificaciones.length === 0}
        <div class="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm flex flex-col items-center justify-center max-w-md mx-auto mt-12">
          <div class="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center border border-slate-100 mb-4 shadow-inner">
            <Inbox class="w-6 h-6" />
          </div>
          <h3 class="font-black text-slate-900 text-base">¡Bandeja impecable!</h3>
          <p class="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">No se registran prospectos abandonados o sin actividad de seguimiento reciente en tu CRM.</p>
        </div>
      {:else}
        
        {#if pendientes.length > 0}
          <div class="space-y-3">
            <h2 class="text-[10px] font-black tracking-widest uppercase text-rose-500 flex items-center gap-2 px-1">
              <ShieldAlert class="w-3.5 h-3.5 animate-pulse" /> Pendientes de Atención ({pendientes.length})
            </h2>
            <div class="space-y-2.5">
              {#each pendientes as alerta (alerta.id)}
                <div class="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex items-start justify-between gap-4 group">
                  <div class="flex items-start gap-4">
                    <div class="p-3 bg-rose-50 rounded-xl text-rose-600 border border-rose-100 shrink-0 mt-0.5">
                      <Clock class="w-4 h-4" />
                    </div>
                    <div>
                      <h4 class="font-black text-sm text-slate-900">{alerta.titulo}</h4>
                      <p class="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">{alerta.mensaje}</p>
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-2">{haceCuanto(alerta.creado_en)}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href="/admin/leads" class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-2 px-4 rounded-xl transition-colors flex items-center gap-1.5">
                      <Users class="w-3.5 h-3.5" /> Retomar
                    </a>

                    <form method="POST" action="?/marcarLeida" use:enhance={() => {
                      procesandoId = alerta.id;
                      return async ({ update }) => {
                        procesandoId = null;
                        await invalidateAll();
                        update({ reset: false });
                      };
                    }}>
                      <input type="hidden" name="id" value={alerta.id}>
                      <button type="submit" disabled={procesandoId === alerta.id} class="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 transition-colors cursor-pointer" title="Marcar como atendido">
                        <Check class="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if leidas.length > 0}
          <div class="space-y-3 pt-4">
            <h2 class="text-[10px] font-black tracking-widest uppercase text-slate-400 px-1">
              Historial de Alertas Atendidas
            </h2>
            <div class="space-y-2 opacity-65">
              {#each leidas as alerta (alerta.id)}
                <div class="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div class="flex items-center gap-4 truncate">
                    <div class="p-2.5 bg-slate-100 rounded-xl text-slate-400 shrink-0">
                      <Check class="w-3.5 h-3.5" />
                    </div>
                    <div class="truncate">
                      <h4 class="font-extrabold text-xs text-slate-500 line-clamp-1 line-through">{alerta.titulo}</h4>
                      <p class="text-[11px] text-slate-400 font-medium truncate mt-0.5">{alerta.mensaje}</p>
                    </div>
                  </div>
                  <span class="text-[9px] font-bold text-slate-400 shrink-0 tracking-tight">{haceCuanto(alerta.creado_en)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

      {/if}

    </div>
  </div>
</main>
