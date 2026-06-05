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
    const eventDate = new Date(`${event.date}T${event.timeStart}`);
    const diff = eventDate - now;

    if (diff <= 0) {
      const eventEnd = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);
      eventStatus = now < eventEnd ? 'live' : 'ended';
      return;
    }

    const today = new Date();
    const isToday = eventDate.getDate() === today.getDate() && eventDate.getMonth() === today.getMonth() && eventDate.getFullYear() === today.getFullYear();
    eventStatus = isToday ? 'today' : 'upcoming';
  }

  onMount(() => {
    updateStatus();
    timer = setInterval(updateStatus, 60000); // Checa cada minuto
  });

  onDestroy(() => clearInterval(timer));

  let shareMsg = $derived(
    encodeURIComponent(`🏡 Lanzamiento Exclusivo · Open House: ${event.title}\n✨ Cupo limitado. Registra tus credenciales aquí: https://${event.agent?.url}/open-house/${event.id}`)
  );

  async function descargarQR() {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(`https://${event.agent?.url}/open-house/${event.id}/checkin`)}&format=png&margin=20`;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `QR-Acceso-${event.title.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      alert('Error al descargar. Intenta abrir la imagen en otra pestaña.');
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-indigo-100 animate-[fadeIn_0.5s_ease-out]">
  
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-14 w-auto object-contain">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>
      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración
      </a>
    </nav>
    <div class="p-6 border-t border-slate-100 bg-white">
      <div class="px-2 py-2 text-sm font-bold text-slate-900 truncate">{event.agent?.name || 'Usuario'}</div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors w-full text-left text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden relative">
    
    {#if isEditing}
      <div class="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-lg font-black text-slate-900">Editar Horarios del Evento</h3>
            <button onclick={() => isEditing = false} class="text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <form method="POST" action="?/updateSettings" use:enhance={() => {
            return async ({ result, update }) => {
              if (result.type === 'success') {
                isEditing = false;
                alert('Ajustes guardados correctamente.');
                // Actualizar el estado local para reflejar los cambios
                event.date = editForm.date;
                event.timeStart = editForm.timeStart;
                event.timeEnd = editForm.timeEnd;
                event.maxCapacity = editForm.maxCapacity;
                updateStatus();
              } else {
                alert('Hubo un error al guardar los ajustes.');
              }
              update();
            };
          }} class="p-6 space-y-6">
            
            <input type="hidden" name="id" value={event.id}>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fecha del Evento</label>
              <input type="date" name="date" bind:value={editForm.date} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hora Inicio</label>
                <select name="timeStart" bind:value={editForm.timeStart} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
                  {#each timeOptions as time}
                    <option value={time.value}>{time.label}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hora Fin</label>
                <select name="timeEnd" bind:value={editForm.timeEnd} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
                  {#each timeOptions as time}
                    <option value={time.value}>{time.label}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Aforo Máximo</label>
              <input type="number" name="maxCapacity" bind:value={editForm.maxCapacity} min="1" max="500" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" />
            </div>

            <div class="flex gap-3 pt-4 border-t border-slate-100">
              <button type="button" onclick={() => isEditing = false} class="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-colors border border-slate-200 text-sm">
                Cancelar
              </button>
              <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md shadow-indigo-200 text-sm">
                Guardar Ajustes
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
      <div class="flex items-center">
        <a href="/admin" class="text-slate-400 hover:text-indigo-600 transition-colors mr-6 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-xl border border-slate-200" title="Volver al Inventario">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </a>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">{event.title}</h1>
          <div class="flex items-center gap-3 mt-1">
            <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dashboard del Open House</p>
            <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
            <button onclick={() => isEditing = true} class="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              Editar Fecha/Hora
            </button>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-4">
        {#if eventStatus === 'live'}
          <span class="px-4 py-2 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase tracking-widest border border-red-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> En Vivo
          </span>
        {:else if eventStatus === 'today'}
          <span class="px-4 py-2 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase tracking-widest border border-amber-200">Sucede Hoy</span>
        {:else if eventStatus === 'upcoming'}
          <span class="px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest border border-indigo-200">Próximo</span>
        {:else}
          <span class="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest border border-slate-200">Finalizado</span>
        {/if}
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Prospectos Registrados</p>
          <p class="text-3xl font-black text-slate-900">{attendees.length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Capacidad: {event.maxCapacity}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accesos en Propiedad</p>
          <p class="text-3xl font-black text-emerald-600">{attendees.filter(a => a.checked_in).length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Check-in físico validado</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leads Alta Intención</p>
          <p class="text-3xl font-black text-amber-600">{attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Patrimonial/Inversor</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lista de Espera</p>
          <p class="text-3xl font-black text-slate-500">{attendees.filter(a => a.status === 'waitlist').length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Pendientes de cupo</p>
        </div>
      </div>

      <div class="flex gap-4 border-b border-slate-200 mb-8 pb-4">
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'overview'}>Difusión Comercial</button>
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'attendees' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'attendees'}>Asistentes ({attendees.length})</button>
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'analytics'}>Analíticas</button>
      </div>

      {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
             <h3 class="text-lg font-black text-slate-900 mb-2">Canales de Difusión Directa</h3>
             <p class="text-sm text-slate-500 font-medium mb-8">Utiliza estos enlaces para promover el evento exclusivo en tus redes.</p>
             
             <div class="flex flex-col gap-4">
               <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-[#25D366]/20">
                 <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                 Compartir Invitación en WhatsApp
               </a>
               
               <div class="flex gap-2">
                 <button class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200 text-sm" onclick={() => { navigator.clipboard.writeText(`https://${event.agent?.url}/open-house/${event.id}`); alert('Enlace de la Landing Pública copiado.'); }}>
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                   Copiar Enlace
                 </button>
                 <a href="https://{event.agent?.url}/open-house/{event.id}" target="_blank" rel="noopener noreferrer" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center transition-colors shadow-sm" title="Abrir Landing Page">
                   <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                 </a>
               </div>

               <button class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200" onclick={() => showCheckin = !showCheckin}>
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                 {showCheckin ? 'Ocultar QR de Puerta' : 'Desplegar QR de Puerta'}
               </button>
             </div>
          </div>
          
          {#if showCheckin}
            <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col items-center justify-center text-center animate-[fadeIn_0.2s_ease-out] relative">
              <h4 class="text-lg font-black text-slate-900 mb-2">Código QR de Autoregistro</h4>
              <p class="text-sm text-slate-500 font-medium mb-6">Muestra esto en la entrada de la casa para que los prospectos escaneen y liberen su acceso físico.</p>
              
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={encodeURIComponent(`https://${event.agent?.url}/open-house/${event.id}/checkin`)}&format=png&margin=0" alt="QR" class="w-48 h-48">
              </div>

              <div class="flex flex-col gap-2 items-center w-full max-w-[240px]">
                <button onclick={descargarQR} class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Descargar PNG
                </button>
                <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg mt-2 w-full text-center border border-slate-100">ID: {event.id.split('-')[0]}</span>
              </div>
            </div>
          {/if}
        </div>

      {:else if activeTab === 'attendees'}
        <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
          <div class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-lg font-black text-slate-900">Prospectos Registrados</h3>
            <button class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm" onclick={() => {
              const rows = [['Nombre', 'WhatsApp', 'Objetivo Comercial', 'Presupuesto', 'Check-In Físico', 'Estatus Base']];
              attendees.forEach(a => rows.push([a.name, a.phone, a.intent, a.budget || 'N/A', a.checked_in ? 'SÍ' : 'NO', a.status]));
              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
              window.open(encodeURI(csvContent));
            }}>Exportar a CSV</button>
          </div>
          <table class="w-full divide-y divide-slate-100 table-fixed">
            <thead class="bg-white">
              <tr>
                <th scope="col" class="w-3/12 px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prospecto</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estatus</th>
                <th scope="col" class="w-3/12 px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#each attendees as att}
                <tr class="hover:bg-slate-50/80 transition-colors {att.checked_in ? 'bg-emerald-50/30' : ''}">
                  <td class="px-8 py-4 truncate">
                    <div class="flex items-center gap-3">
                      <img src="https://ui-avatars.com/api/?name={att.name}&background=0f172a&color=fff" alt="Avatar" class="w-8 h-8 rounded-full shadow-sm">
                      <div class="font-bold text-sm text-slate-900">{att.name}</div>
                    </div>
                  </td>
                  <td class="px-4 py-4 truncate font-mono text-xs text-slate-600">{att.phone}</td>
                  <td class="px-4 py-4 truncate">
                    {#if att.intent === 'Comprar'}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-amber-100 text-amber-800">Comprar</span>
                    {:else if att.intent === 'Invertir'}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-blue-100 text-blue-800">Invertir</span>
                    {:else}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-slate-100 text-slate-600">{att.intent}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-4 truncate">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full {att.checked_in ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                      <span class="text-xs font-bold {att.checked_in ? 'text-emerald-700' : 'text-slate-500'}">{att.checked_in ? 'Ingresó' : 'Pendiente'}</span>
                    </div>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <div class="flex gap-2 justify-end">
                      {#if att.status === 'waitlist'}
                        <form method="POST" action="?/admitir" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-indigo-200">Admitir</button>
                        </form>
                      {/if}
                      {#if !att.checked_in}
                        <form method="POST" action="?/checkin" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm">Check-in</button>
                        </form>
                      {/if}
                      <a href="https://wa.me/{att.phone.replace(/\D/g, '')}?text={encodeURIComponent('Hola ' + att.name.split(' ')[0] + ', soy tu asesor de Inmublia. Te escribo sobre tu registro al Open House privado.')}" target="_blank" rel="noopener noreferrer" class="text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-200">
                        WP
                      </a>
                    </div>
                  </td>
                </tr>
              {/each}
              {#if attendees.length === 0}
                <tr>
                  <td colspan="5" class="text-center py-12 text-slate-400 font-medium">Ningún prospecto ha solicitado acceso.</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>

      {:else if activeTab === 'analytics'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Conversión Comercial (Proyección)</h4>
            <div class="text-5xl font-black text-slate-900 mb-4 tracking-tight">
              {attendees.length > 0 ? ((attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length / attendees.length) * 100).toFixed(0) : 0}%
            </div>
            <p class="text-sm text-slate-500 font-medium leading-relaxed">Porcentaje total de la audiencia que cuenta con intenciones directas de compra de capital o inversión corporativa sobre el activo.</p>
          </div>
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Eficiencia del Evento</h4>
            <div class="flex flex-col gap-4">
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Ocupación del Aforo Máximo</span>
                <span class="text-base font-black text-slate-900">{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</span>
              </div>
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Show-Rate (Asistencia Real)</span>
                <span class="text-base font-black text-slate-900">{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</span>
              </div>
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Pérdida por Lista de Espera</span>
                <span class="text-base font-black text-amber-600">{attendees.filter(a => a.status === 'waitlist').length} leads</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>
