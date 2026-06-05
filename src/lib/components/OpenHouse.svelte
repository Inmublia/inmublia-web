<script>
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';

  let { event = {}, attendeesDb = [] } = $props();

  let eventStatus = $state('upcoming'); 
  let showCheckin = $state(false);
  let activeTab = $state('overview');

  let attendees = $derived(attendeesDb);
  let timer;

  // Variables para la edición del evento
  let isEditing = $state(false);
  let editForm = $state({
    date: event.date || '',
    timeStart: event.timeStart || '',
    timeEnd: event.timeEnd || '',
    maxCapacity: event.maxCapacity || 30
  });

  // Generador de horarios (idéntico al de creación)
  const timeOptions = [];
  for (let i = 7; i <= 21; i++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = i.toString().padStart(2, '0');
      const min = m === 0 ? '00' : '30';
      const hour12 = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      timeOptions.push({
        value: `${hour24}:${min}`,
        label: `${hour12}:${min} ${ampm}`
      });
    }
  }

  function updateStatus() {
    if (!event.date) return;
    const now = new Date();
    const eventDate = new Date(`${event.date}T00:00:00`);
    
    if (now.toDateString() === eventDate.toDateString()) {
      eventStatus = 'live';
    } else if (now > eventDate) {
      eventStatus = 'past';
    } else {
      eventStatus = 'upcoming';
    }
  }

  onMount(() => {
    updateStatus();
    timer = setInterval(updateStatus, 60000);
  });

  onDestroy(() => {
    if (timer) clearInterval(timer);
  });
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans">
  
  <div class="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
    <div>
      <div class="flex flex-wrap items-center gap-3 mb-2">
        <h1 class="text-2xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">{event.propertyTitle}</h1>
        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
          {eventStatus === 'live' ? 'Sucede Hoy' : 'Próximo'}
        </span>
      </div>
      <p class="text-sm text-slate-500 font-medium flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        {event.propertyAddress}
      </p>
    </div>
    
    {#if !isEditing}
      <button onclick={() => isEditing = true} class="shrink-0 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors flex items-center gap-2">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        Editar Fecha / Hora
      </button>
    {/if}
  </div>

  {#if isEditing}
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 animate-[fadeIn_0.2s_ease-out]">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-900">Modificar Detalles del Evento</h3>
        <button onclick={() => isEditing = false} class="text-slate-400 hover:text-slate-600">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <form method="POST" action="?/updateEvent" use:enhance={() => { return async ({ update }) => { isEditing = false; update(); }; }} class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <input type="hidden" name="eventId" value={event.id}>
        <div class="md:col-span-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha</label>
          <input type="date" name="date" bind:value={editForm.date} required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="md:col-span-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inicio</label>
          <select name="timeStart" bind:value={editForm.timeStart} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            {#each timeOptions as time}<option value={time.value}>{time.label}</option>{/each}
          </select>
        </div>
        <div class="md:col-span-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fin</label>
          <select name="timeEnd" bind:value={editForm.timeEnd} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
            {#each timeOptions as time}<option value={time.value}>{time.label}</option>{/each}
          </select>
        </div>
        <div class="md:col-span-1">
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Aforo Máx</label>
          <input type="number" name="maxCapacity" bind:value={editForm.maxCapacity} min="1" required class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="md:col-span-1">
          <button type="submit" class="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-2 rounded-lg text-sm transition-colors">Guardar</button>
        </div>
      </form>
    </div>
  {/if}

  <div class="flex gap-6 border-b border-slate-200 mb-8">
    <button class="pb-3 text-sm font-bold border-b-2 transition-colors {activeTab === 'overview' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick={() => activeTab = 'overview'}>Vista General</button>
    <button class="pb-3 text-sm font-bold border-b-2 transition-colors {activeTab === 'list' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}" onclick={() => activeTab = 'list'}>Lista de Invitados</button>
  </div>

  {#if activeTab === 'overview'}
    
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total RSVP</span>
        <span class="text-3xl font-black text-slate-900">{attendees.length}</span>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confirmados</span>
        <span class="text-3xl font-black text-blue-600">{attendees.filter(a => a.status === 'confirmed').length}</span>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asistencia Real</span>
        <span class="text-3xl font-black text-emerald-600">{attendees.filter(a => a.checked_in).length}</span>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aforo Permitido</span>
        <span class="text-3xl font-black text-slate-900">{event.maxCapacity}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      <div class="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
        <div class="mb-6">
          <h4 class="text-lg font-black text-slate-900 tracking-tight">Canales de Difusión Directa</h4>
          <p class="text-sm text-slate-500 font-medium mt-1">Comparte el enlace exclusivo con tu red y registra prospectos.</p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <a href="https://wa.me/?text={encodeURIComponent(`Estás invitado al Open House Exclusivo en ${event.propertyAddress}. Confirma tu asistencia aquí: https://inmublia.com/open-house/${event.id}/registro`)}" target="_blank" class="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            WhatsApp
          </a>
          <button onclick={() => { navigator.clipboard.writeText(`https://inmublia.com/open-house/${event.id}/registro`); alert('Enlace de registro copiado al portapapeles'); }} class="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
            Copiar Enlace
          </button>
        </div>
      </div>

      <div class="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-sm">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Eficiencia del Evento</h4>
        <div class="flex flex-col gap-5">
          <div class="flex justify-between items-center border-b border-slate-700/50 pb-4">
            <span class="text-sm text-slate-300 font-medium">Ocupación del Aforo</span>
            <span class="text-base font-black text-white">{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</span>
          </div>
          <div class="flex justify-between items-center border-b border-slate-700/50 pb-4">
            <span class="text-sm text-slate-300 font-medium">Show-Rate (Real)</span>
            <span class="text-base font-black text-emerald-400">{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</span>
          </div>
          <div class="flex justify-between items-center pb-2">
            <span class="text-sm text-slate-300 font-medium">Prospectos Verificados</span>
            <span class="text-base font-black text-white">{attendees.filter(a => a.checked_in && a.status === 'confirmed').length}</span>
          </div>
        </div>
      </div>

    </div>

  {/if}

  {#if activeTab === 'list'}
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider">
            <tr>
              <th class="px-6 py-4 border-b border-slate-200">Invitado</th>
              <th class="px-6 py-4 border-b border-slate-200">Contacto</th>
              <th class="px-6 py-4 border-b border-slate-200">Estatus</th>
              <th class="px-6 py-4 border-b border-slate-200">Check-in Real</th>
              <th class="px-6 py-4 border-b border-slate-200">Acción Rápida</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            {#each attendees as attendee}
              <tr class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="font-bold text-slate-900">{attendee.name}</p>
                  <p class="text-xs text-slate-400">{attendee.broker_agency ? `Asesor: ${attendee.broker_agency}` : 'Cliente Directo'}</p>
                </td>
                <td class="px-6 py-4">
                  <p>{attendee.email}</p>
                  <p class="text-xs">{attendee.phone}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest {attendee.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}">
                    {attendee.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                  </span>
                </td>
                <td class="px-6 py-4">
                  {#if attendee.checked_in}
                    <span class="text-emerald-600 font-bold flex items-center gap-1.5">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Asistió
                    </span>
                  {:else}
                    <span class="text-slate-400 font-medium">-</span>
                  {/if}
                </td>
                <td class="px-6 py-4">
                  <form method="POST" action="?/toggleCheckIn" use:enhance>
                    <input type="hidden" name="attendeeId" value={attendee.id}>
                    <input type="hidden" name="currentStatus" value={attendee.checked_in}>
                    <button type="submit" class="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors {attendee.checked_in ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-blue-600'}">
                      {attendee.checked_in ? 'Deshacer' : 'Marcar Llegada'}
                    </button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if attendees.length === 0}
          <div class="text-center py-12 text-slate-500 font-medium">No hay registros aún para este Open House.</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
