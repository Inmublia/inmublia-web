<script>
  import { page } from '$app/stores';
  import { Bell, CalendarClock, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  let pendingAlerts = $derived($page.data.alertas || []);
  let unreadCount = $derived(pendingAlerts.length);
  
  let isOpen = $state(false);

  function toggleDropdown() { isOpen = !isOpen; }

  function handleClickOutside(event) {
    if (isOpen && !event.target.closest('.notification-widget')) isOpen = false;
  }

  function formatAlertTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('es-MX', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
    }).format(localDate);
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative notification-widget font-sans z-[100]">
  {#if isOpen}
    <div 
      transition:slide={{ duration: 250, axis: 'y' }}
      class="absolute bottom-full right-0 mb-4 w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-[0_-10px_50px_-10px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden z-50 transform origin-bottom-right"
    >
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <h3 class="text-sm font-black text-slate-900 tracking-tight">Centro de Control</h3>
        {#if unreadCount > 0}
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{unreadCount} Pendientes</span>
        {/if}
      </div>

      <div class="max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {#if unreadCount === 0}
          <div class="flex flex-col items-center justify-center p-8 text-center opacity-60">
            <CheckCircle2 class="w-10 h-10 text-emerald-500 mb-3" />
            <p class="text-sm font-bold text-slate-700">¡Todo al día!</p>
            <p class="text-xs font-medium text-slate-500 mt-1">No tienes recordatorios urgentes.</p>
          </div>
        {:else}
          <div class="flex flex-col">
            {#each pendingAlerts as alert}
              <a 
                href={alert.lead?.id ? `/admin/leads?open=${alert.lead.id}` : '#'}
                onclick={() => isOpen = false}
                class="flex items-start gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group relative"
              >
                <div class="mt-1.5 shrink-0">
                   {#if alert.tipo_alerta === 'recordatorio'}
                      <div class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                   {:else}
                      <AlertTriangle class="w-4 h-4 text-rose-500" />
                   {/if}
                </div>
                
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-black text-slate-900 truncate mb-0.5 flex items-center justify-between">
                    {alert.lead?.nombre || 'Alerta del Sistema'}
                    <span class="text-[9px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      {alert.tipo_alerta === 'recordatorio' ? 'Vencido' : 'Alerta'}
                    </span>
                  </p>
                  <p class="text-[11px] text-slate-600 line-clamp-2 leading-relaxed font-medium mb-2">{alert.mensaje || alert.titulo}</p>
                  <p class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <CalendarClock class="w-3 h-3 text-rose-400" /> 
                    {formatAlertTime(alert.fecha)}
                  </p>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors mt-4 shrink-0" />
              </a>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <button 
    onclick={toggleDropdown}
    class="relative flex items-center justify-center w-14 h-14 rounded-full {unreadCount > 0 ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white border border-slate-200 hover:bg-slate-50'} transition-all duration-300 shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-95 group"
    aria-label="Notificaciones"
  >
    <Bell class="w-6 h-6 {unreadCount > 0 ? 'text-white' : 'text-slate-600'} transition-transform duration-300 group-hover:rotate-12" />
    {#if unreadCount > 0}
      <span class="absolute -top-1 -right-1 flex h-5 w-5">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-[10px] font-black text-white items-center justify-center border-2 border-slate-900">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      </span>
    {/if}
  </button>
</div>
