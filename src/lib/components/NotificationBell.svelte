<script>
  import { page } from '$app/state'; 
  import { onNavigate } from '$app/navigation';
  import { Bell, CalendarClock, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  let pendingAlerts = $derived(page.data.alertasGlobales || []);
  let unreadCount = $derived(pendingAlerts.length);
  
  let isOpen = $state(false);

  // Cierre seguro y oficial de SvelteKit al navegar
  onNavigate(() => {
    isOpen = false;
  });

  // Cierre con la tecla Escape
  function handleKeydown(event) {
    if (isOpen && event.key === 'Escape') isOpen = false;
  }
  
  // 🔥 ADIÓS JS DE FECHAS EN EL CLIENTE: Todo el cálculo lo hace el servidor ahora.
</script>

<svelte:document onkeydown={handleKeydown} />

<div class="relative notification-widget font-sans z-[100]">
  
  {#if isOpen}
    <button 
      type="button"
      class="fixed inset-0 w-full h-full cursor-default z-40" 
      aria-label="Cerrar panel"
      aria-hidden="true"
      tabindex="-1"
      onclick={() => isOpen = false}
    ></button>
  {/if}

  {#if isOpen}
    <div 
      transition:slide={{ duration: 250, axis: 'y' }}
      class="absolute bottom-full right-0 mb-4 lg:bottom-auto lg:top-full lg:mt-4 lg:mb-0 w-[340px] sm:w-[380px] z-50 bg-white rounded-3xl shadow-[0_10px_50px_-10px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col overflow-hidden origin-bottom-right lg:origin-top-right"
    >
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between relative z-50">
        <h3 class="text-sm font-black text-slate-900 tracking-tight">Centro de Control</h3>
        {#if unreadCount > 0}
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{unreadCount} Pendientes</span>
        {/if}
      </div>

      <div class="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 bg-white relative z-50">
        {#if unreadCount === 0}
          <div class="flex flex-col items-center justify-center p-10 text-center opacity-70">
            <CheckCircle2 class="w-12 h-12 text-emerald-500 mb-4" />
            <p class="text-base font-black text-slate-800 tracking-tight">Bandeja Limpia</p>
            <p class="text-xs font-medium text-slate-500 mt-1">No tienes recordatorios urgentes ni alertas.</p>
          </div>
        {:else}
          <div class="flex flex-col divide-y divide-slate-50">
            {#each pendingAlerts as alert}
              <a 
                href={alert.lead?.id ? `/admin/leads?open=${alert.lead.id}` : '/admin'}
                data-sveltekit-preload-data="hover"
                class="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors group relative"
              >
                <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border {alert.tipo_alerta === 'recordatorio' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-rose-50 text-rose-500 border-rose-100'}">
                  {#if alert.tipo_alerta === 'recordatorio'}
                    <CalendarClock class="w-5 h-5" />
                  {:else}
                    <AlertTriangle class="w-5 h-5" />
                  {/if}
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2 mb-1">
                    <p class="text-xs font-black text-slate-900 truncate">
                      {alert.lead?.nombre || 'Alerta del Sistema'}
                    </p>
                    <span class="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0 border {alert.tipo_alerta === 'recordatorio' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-rose-600 bg-rose-50 border-rose-100'}">
                      {alert.tipo_alerta === 'recordatorio' ? 'Recordatorio' : 'Alerta'}
                    </span>
                  </div>
                  
                  <p class="text-[11px] font-bold text-slate-700 mb-0.5">{alert.titulo}</p>
                  <p class="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-medium mb-2">{alert.mensaje}</p>
                  
                  {#if alert.fecha_formateada}
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                      <time datetime={alert.fecha}>{alert.fecha_formateada}</time>
                    </p>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <button 
    type="button"
    onclick={() => isOpen = !isOpen}
    aria-expanded={isOpen}
    class="relative flex items-center justify-center w-14 h-14 rounded-full z-50 {unreadCount > 0 ? 'bg-slate-900 hover:bg-slate-800 shadow-[0_4px_20px_rgba(15,23,42,0.4)]' : 'bg-white border border-slate-200 hover:bg-slate-50 shadow-sm'} transition-all duration-300 focus:outline-none active:scale-95 group"
    aria-label="Notificaciones"
  >
    <Bell class="w-6 h-6 pointer-events-none {unreadCount > 0 ? 'text-white' : 'text-slate-600'} transition-transform duration-300 group-hover:rotate-12" />
    
    {#if unreadCount > 0}
      <span class="absolute -top-1 -right-1 flex h-5 w-5 pointer-events-none">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-[10px] font-black text-white items-center justify-center border-2 border-slate-900 shadow-md">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      </span>
    {/if}
  </button>
</div>
