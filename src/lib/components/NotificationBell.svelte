<script>
  import { page } from '$app/stores';
  import { Bell, CalendarClock, ChevronRight, CheckCircle2 } from 'lucide-svelte';
  import { slide } from 'svelte/transition';

  let leads = $derived($page.data.leads || []);
  
  let isOpen = $state(false);

  // Derivamos dinámicamente las alertas pendientes
  let pendingAlerts = $derived.by(() => {
    let alerts = [];
    const now = new Date();
    
    leads.forEach(lead => {
      if (lead.lead_notas) {
        lead.lead_notas.forEach(nota => {
          if (nota.tipo === 'recordatorio' && !nota.completado) {
            const reminderDate = new Date(nota.fecha_recordatorio);
            // Mostrar si ya se venció o si es en las próximas 24 horas
            if (reminderDate <= now || (reminderDate.getTime() - now.getTime() < 86400000)) {
              alerts.push({
                id: nota.id,
                leadId: lead.id,
                leadNombre: lead.nombre,
                contenido: nota.contenido,
                fecha: nota.fecha_recordatorio,
                isOverdue: reminderDate <= now
              });
            }
          }
        });
      }
    });

    // Ordenar de más antiguas (urgentes) a más recientes
    return alerts.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  });

  let unreadCount = $derived(pendingAlerts.length);

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  // Cierra el dropdown si el usuario hace clic fuera de él
  function handleClickOutside(event) {
    if (isOpen && !event.target.closest('.notification-container')) {
      isOpen = false;
    }
  }

  function formatAlertTime(dateString) {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('es-MX', { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true 
    }).format(localDate);
  }
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative notification-container font-sans">
  <button 
    onclick={toggleDropdown}
    class="relative p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
    aria-label="Notificaciones"
  >
    <Bell class="w-5 h-5 {unreadCount > 0 ? 'text-indigo-600' : 'text-slate-400'}" />
    {#if unreadCount > 0}
      <span class="absolute -top-1 -right-1 flex h-4 w-4">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-black text-white items-center justify-center border border-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      </span>
    {/if}
  </button>

  {#if isOpen}
    <div 
      transition:slide={{ duration: 200, axis: 'y' }}
      class="absolute right-0 mt-3 w-[360px] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden z-50 transform origin-top-right"
    >
      <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <h3 class="text-sm font-black text-slate-900 tracking-tight">Centro de Tareas</h3>
        {#if unreadCount > 0}
          <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{unreadCount} Pendientes</span>
        {/if}
      </div>

      <div class="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {#if pendingAlerts.length === 0}
          <div class="flex flex-col items-center justify-center p-8 text-center opacity-60">
            <CheckCircle2 class="w-10 h-10 text-emerald-500 mb-3" />
            <p class="text-sm font-bold text-slate-700">¡Al día!</p>
            <p class="text-xs font-medium text-slate-500 mt-1">No tienes recordatorios pendientes.</p>
          </div>
        {:else}
          <div class="flex flex-col">
            {#each pendingAlerts as alert}
              <a 
                href="/admin/leads?open={alert.leadId}"
                onclick={() => isOpen = false}
                class="flex items-start gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group relative"
              >
                <div class="w-2 h-2 rounded-full mt-1.5 shrink-0 {alert.isOverdue ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-amber-400'}"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-black text-slate-900 truncate mb-0.5 flex items-center justify-between">
                    {alert.leadNombre}
                    <span class="text-[9px] font-bold uppercase tracking-widest {alert.isOverdue ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'} px-1.5 py-0.5 rounded">
                      {alert.isOverdue ? 'Vencido' : 'Próximo'}
                    </span>
                  </p>
                  <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium mb-2">{alert.contenido}</p>
                  <p class="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                    <CalendarClock class="w-3 h-3 {alert.isOverdue ? 'text-rose-400' : 'text-slate-400'}" /> 
                    {formatAlertTime(alert.fecha)}
                  </p>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors mt-4 shrink-0" />
              </a>
            {/each}
          </div>
        {/if}
      </div>
      
      {#if unreadCount > 0}
        <div class="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <a href="/admin/leads" onclick={() => isOpen = false} class="text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Abrir Gestor CRM</a>
        </div>
      {/if}
    </div>
  {/if}
</div>
