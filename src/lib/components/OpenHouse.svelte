<script>
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';
  import { 
    ArrowLeft, 
    QrCode, 
    Copy, 
    ExternalLink, 
    DownloadCloud, 
    Share2, 
    Users, 
    CheckSquare, 
    TrendingUp, 
    Clock, 
    FileDown, 
    Check, 
    UserPlus,
    Building2,
    MessageSquareQuote
  } from 'lucide-svelte';

  let { event = {}, attendeesDb = [] } = $props();

  let eventStatus = $state('upcoming'); 
  let showCheckin = $state(false);
  let activeTab = $state('overview');

  let attendees = $derived(attendeesDb);
  let timer;

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
    timer = setInterval(updateStatus, 60000);
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

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('Enlace copiado al portapapeles.');
  }

  function exportToCSV() {
    const rows = [['Nombre', 'WhatsApp', 'Objetivo Comercial', 'Presupuesto', 'Check-In Físico', 'Estatus Base']];
    attendees.forEach(a => rows.push([a.name, a.phone, a.intent, a.budget || 'N/A', a.checked_in ? 'SÍ' : 'NO', a.status]));
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    window.open(encodeURI(csvContent));
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="h-20 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-xl shadow-zinc-900/10">
    <div class="flex items-center gap-4">
      <a href="/admin" class="text-zinc-400 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg border border-zinc-800 shadow-sm" title="Volver al Inventario">
        <ArrowLeft class="w-5 h-5" />
      </a>
      <div>
        <h1 class="text-xl font-black text-white tracking-tight leading-none truncate max-w-[200px] sm:max-w-md">{event.title}</h1>
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
          <Building2 class="w-3 h-3 text-indigo-400" /> Dashboard Operativo
        </p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      {#if eventStatus === 'live'}
        <span class="px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 font-bold text-[10px] uppercase tracking-widest border border-red-500/20 flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> En Vivo
        </span>
      {:else if eventStatus === 'today'}
        <span class="px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-400 font-bold text-[10px] uppercase tracking-widest border border-amber-500/20 shadow-sm">Sucede Hoy</span>
      {:else if eventStatus === 'upcoming'}
        <span class="px-3 py-1.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold text-[10px] uppercase tracking-widest border border-indigo-500/20 shadow-sm">Próximo</span>
      {:else}
        <span class="px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-widest border border-zinc-700 shadow-sm">Finalizado</span>
      {/if}
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto">
    
    <div class="max-w-[1400px] mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrados</p>
            <Users class="w-4 h-4 text-indigo-500" />
          </div>
          <div class="flex items-end gap-2">
            <p class="text-3xl font-black text-slate-900 tracking-tight">{attendees.length}</p>
            <p class="text-xs text-slate-500 font-medium mb-1">Capacidad: {event.maxCapacity}</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Propiedad</p>
            <CheckSquare class="w-4 h-4 text-emerald-500" />
          </div>
          <div class="flex items-end gap-2">
            <p class="text-3xl font-black text-emerald-600 tracking-tight">{attendees.filter(a => a.checked_in).length}</p>
            <p class="text-xs text-slate-500 font-medium mb-1">Check-ins Físicos</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Alta Intención</p>
            <TrendingUp class="w-4 h-4 text-amber-500" />
          </div>
          <div class="flex items-end gap-2">
            <p class="text-3xl font-black text-amber-600 tracking-tight">{attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length}</p>
            <p class="text-xs text-slate-500 font-medium mb-1">Patrimonial/Inversor</p>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lista Espera</p>
            <Clock class="w-4 h-4 text-slate-400" />
          </div>
          <div class="flex items-end gap-2">
            <p class="text-3xl font-black text-slate-400 tracking-tight">{attendees.filter(a => a.status === 'waitlist').length}</p>
            <p class="text-xs text-slate-500 font-medium mb-1">Pendientes</p>
          </div>
        </div>
      </div>

      <div class="flex gap-6 border-b border-slate-200 mb-8">
        <button class="pb-3 text-sm font-bold transition-all relative {activeTab === 'overview' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}" onclick={() => activeTab = 'overview'}>
          Difusión Comercial
          {#if activeTab === 'overview'}
            <div class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full"></div>
          {/if}
        </button>
        <button class="pb-3 text-sm font-bold transition-all relative {activeTab === 'attendees' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}" onclick={() => activeTab = 'attendees'}>
          Asistentes ({attendees.length})
          {#if activeTab === 'attendees'}
            <div class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full"></div>
          {/if}
        </button>
        <button class="pb-3 text-sm font-bold transition-all relative {activeTab === 'analytics' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}" onclick={() => activeTab = 'analytics'}>
          Analíticas
          {#if activeTab === 'analytics'}
            <div class="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full"></div>
          {/if}
        </button>
      </div>

      {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
             <h3 class="text-lg font-black text-slate-900 mb-2">Canales de Difusión Directa</h3>
             <p class="text-sm text-slate-500 font-medium mb-8">Utiliza estos enlaces para promover el evento exclusivo en tus redes.</p>
             
             <div class="flex flex-col gap-4">
               <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200 shadow-sm text-sm uppercase tracking-wider">
                 <Share2 class="w-4 h-4" />
                 Compartir Invitación en WhatsApp
               </a>
               
               <div class="flex flex-col sm:flex-row gap-3">
                 <button class="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 text-sm shadow-sm" onclick={() => copyToClipboard(`https://${event.agent?.url}/open-house/${event.id}`)}>
                   <Copy class="w-4 h-4 text-slate-400" />
                   Copiar Enlace
                 </button>
                 <a href="https://{event.agent?.url}/open-house/{event.id}" target="_blank" rel="noopener noreferrer" class="bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md active:scale-95 text-sm" title="Abrir Landing Page">
                   <ExternalLink class="w-4 h-4" /> Landing
                 </a>
               </div>

               <button class="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 text-sm" onclick={() => showCheckin = !showCheckin}>
                 <QrCode class="w-4 h-4 text-slate-400" />
                 {showCheckin ? 'Ocultar QR de Recepción' : 'Desplegar QR de Recepción'}
               </button>
             </div>
          </div>
          
          {#if showCheckin}
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center animate-[fadeIn_0.3s_ease-out] relative">
              <h4 class="text-lg font-black text-slate-900 mb-2">Código QR de Autoregistro</h4>
              <p class="text-sm text-slate-500 font-medium mb-6 max-w-sm mx-auto">Muestra esto en la recepción de la casa para que los prospectos escaneen y liberen su acceso físico.</p>
              
              <div class="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data={encodeURIComponent(`https://${event.agent?.url}/open-house/${event.id}/checkin`)}&format=png&margin=0" alt="QR" class="w-48 h-48">
              </div>

              <div class="flex flex-col gap-3 items-center w-full max-w-[240px]">
                <button onclick={descargarQR} class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow-sm active:scale-95">
                  <DownloadCloud class="w-4 h-4" />
                  Descargar PNG
                </button>
                <span class="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-md w-full text-center border border-slate-100">ID: {event.id.split('-')[0]}</span>
              </div>
            </div>
          {/if}
        </div>

      {:else if activeTab === 'attendees'}
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-lg font-black text-slate-900">Directorio de Accesos</h3>
            <button class="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2" onclick={exportToCSV}>
              <FileDown class="w-4 h-4 text-slate-400" /> Exportar CSV
            </button>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse table-fixed min-w-[900px]">
              <thead>
                <tr class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border-b border-slate-100">
                  <th class="w-[30%] px-6 py-4">Prospecto</th>
                  <th class="w-[20%] px-6 py-4">Contacto</th>
                  <th class="w-[15%] px-6 py-4 text-center">Perfil</th>
                  <th class="w-[15%] px-6 py-4 text-center">Estatus</th>
                  <th class="w-[20%] px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                {#each attendees as att}
                  <tr class="group hover:bg-slate-50/80 transition-colors {att.checked_in ? 'bg-emerald-50/20' : ''}">
                    <td class="px-6 py-4 truncate">
                      <div class="flex items-center gap-3">
                        <img src="https://ui-avatars.com/api/?name={att.name}&background=f8fafc&color=0f172a" alt="Avatar" class="w-9 h-9 rounded-full shadow-sm ring-1 ring-slate-100">
                        <div class="font-bold text-sm text-slate-900 truncate">{att.name}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 truncate font-mono text-xs font-semibold text-slate-600">{att.phone}</td>
                    <td class="px-6 py-4 text-center truncate">
                      {#if att.intent === 'Comprar'}
                        <span class="px-2.5 py-1 inline-flex text-[9px] font-bold uppercase tracking-widest rounded-md bg-amber-50 text-amber-600 border border-amber-200">Comprar</span>
                      {:else if att.intent === 'Invertir'}
                        <span class="px-2.5 py-1 inline-flex text-[9px] font-bold uppercase tracking-widest rounded-md bg-blue-50 text-blue-600 border border-blue-200">Invertir</span>
                      {:else}
                        <span class="px-2.5 py-1 inline-flex text-[9px] font-bold uppercase tracking-widest rounded-md bg-slate-100 text-slate-600 border border-slate-200">{att.intent}</span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 text-center truncate">
                      <div class="flex items-center justify-center gap-1.5">
                        <span class="w-2 h-2 rounded-full {att.checked_in ? 'bg-emerald-500 shadow-sm' : 'bg-slate-300'}"></span>
                        <span class="text-[10px] font-bold uppercase tracking-wider {att.checked_in ? 'text-emerald-600' : 'text-slate-400'}">{att.checked_in ? 'Ingresó' : 'Pendiente'}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex gap-2 justify-end items-center">
                        {#if att.status === 'waitlist'}
                          <form method="POST" action="?/admitir" use:enhance class="m-0 p-0">
                            <input type="hidden" name="attendee_id" value={att.id}>
                            <button type="submit" class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-indigo-200 flex items-center gap-1">
                              <UserPlus class="w-3 h-3" /> Admitir
                            </button>
                          </form>
                        {/if}
                        {#if !att.checked_in}
                          <form method="POST" action="?/checkin" use:enhance class="m-0 p-0">
                            <input type="hidden" name="attendee_id" value={att.id}>
                            <button type="submit" class="text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm flex items-center gap-1">
                              <Check class="w-3 h-3" /> Check-in
                            </button>
                          </form>
                        {/if}
                        <a href="https://wa.me/{att.phone.replace(/\D/g, '')}?text={encodeURIComponent('Hola ' + att.name.split(' ')[0] + ', soy tu asesor de Inmublia. Te escribo sobre tu registro al Open House privado.')}" target="_blank" rel="noopener noreferrer" class="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg transition-colors border border-emerald-200" title="Mensaje WhatsApp">
                           <MessageSquareQuote class="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                {/each}
                {#if attendees.length === 0}
                  <tr>
                    <td colspan="5" class="text-center py-16 text-slate-400 font-medium">
                      <div class="flex flex-col items-center justify-center gap-3">
                        <Users class="w-8 h-8 text-slate-300" />
                        Ningún prospecto ha solicitado acceso aún.
                      </div>
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>
          </div>
        </div>

      {:else if activeTab === 'analytics'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Conversión Comercial (Proyección)</h4>
            <div class="text-6xl font-black text-slate-900 mb-4 tracking-tighter">
              {attendees.length > 0 ? ((attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length / attendees.length) * 100).toFixed(0) : 0}%
            </div>
            <p class="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">Porcentaje total de la audiencia registrada que cuenta con intenciones directas de compra de capital o inversión sobre el activo.</p>
          </div>
          
          <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Eficiencia Operativa</h4>
            <div class="flex flex-col gap-5">
              <div class="flex justify-between items-center border-b border-slate-100 pb-4">
                <span class="text-sm text-slate-600 font-bold flex items-center gap-2"><Users class="w-4 h-4 text-slate-400" /> Ocupación del Aforo</span>
                <span class="text-base font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</span>
              </div>
              <div class="flex justify-between items-center border-b border-slate-100 pb-4">
                <span class="text-sm text-slate-600 font-bold flex items-center gap-2"><CheckSquare class="w-4 h-4 text-emerald-500" /> Show-Rate (Asistencia)</span>
                <span class="text-base font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</span>
              </div>
              <div class="flex justify-between items-center pb-2">
                <span class="text-sm text-slate-600 font-bold flex items-center gap-2"><Clock class="w-4 h-4 text-amber-500" /> Cuello de Botella</span>
                <span class="text-base font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-md">{attendees.filter(a => a.status === 'waitlist').length} leads en espera</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

    </div>
  </div>
</main>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
