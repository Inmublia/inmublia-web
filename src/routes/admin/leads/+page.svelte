<script>
  import { invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare, ChevronDown
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker || {});
  
  let leads = $state(data.leads || []);
  let draggedLeadId = $state(null);

  let selectedLead = $state(null);
  let isPanelOpen = $state(false);
  let nuevaNotaTexto = $state('');
  let guardandoNota = $state(false);
  let submitBtn = $state(null);

  // Estados para Recordatorios
  let esRecordatorio = $state(false);
  let fechaRecordatorio = $state('');
  let horaRecordatorio = $state(''); 
  
  let searchQuery = $state('');
  let leadsFiltrados = $derived(
    leads.filter(l => 
      l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (l.propiedades?.titulo && l.propiedades.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // --- ESTADOS DEL MODAL DE CIERRE FINANCIERO ---
  let showModalCierre = $state(false);
  let leadPorCerrar = $state(null);
  let precioCierreFinal = $state('');
  let comisionCobrada = $state('');

  let totalRecordatoriosPendientes = $derived(
    leads.filter(l => l.has_pending_reminder).length
  );

  $effect(() => {
    if (totalRecordatoriosPendientes > 0) {
      document.title = `(${totalRecordatoriosPendientes}) Pendientes - CRM`;
    } else {
      document.title = 'Gestión de Leads - Inmublia';
    }
  });

  $effect(() => {
    leads = data.leads || [];
  });

  // GENERADOR DE INTERVALOS DE HORA (El estándar de la industria)
  const timeSlots = [];
  for (let i = 7; i <= 21; i++) { // De 7 AM a 9 PM
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
    timeSlots.push(`${hour}:30`);
  }

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
    { id: 'contactado', titulo: 'Contactados', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'visita', titulo: 'Citas / Visitas', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'negociacion', titulo: 'Negociación', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-600 border-purple-200' },
    { id: 'cerrado', titulo: 'Ganados', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600 border-rose-200' }
  ];

  function getBadgeColor(estado) {
    const col = columnas.find(c => c.id === estado);
    return col ? col.badge : 'bg-slate-100 text-slate-600 border-slate-200';
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(localDate);
  }

  function formatTimeSlot(time24) {
    const [h, m] = time24.split(':');
    let hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; 
    return `${hour}:${m} ${ampm}`;
  }

  function timeAgo(dateString) {
    if (!dateString) return 'Desconocido';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  }

  function isOverdue(dateString) {
    if (!dateString) return false;
    return new Date(dateString) <= new Date();
  }

  function arrancar(event, id) {
    draggedLeadId = id;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.classList.add('opacity-40', 'scale-95'), 0);
  }

  function terminar(event) {
    event.target.classList.remove('opacity-40', 'scale-95');
  }

  function permitirSoltar(event) {
    event.preventDefault();
  }

  async function soltar(event, nuevaColumnaId) {
    event.preventDefault();
    if (draggedLeadId) {
      if (nuevaColumnaId === 'cerrado') {
        const lead = leads.find(l => l.id === draggedLeadId);
        if (lead) {
          leadPorCerrar = lead;
          precioCierreFinal = lead.propiedades?.precio || '';
          comisionCobrada = lead.propiedades?.comision || broker.comision_default || 5;
          showModalCierre = true;
        }
      } else {
        actualizarEstadoLocalYBD(draggedLeadId, nuevaColumnaId);
        draggedLeadId = null;
      }
    }
  }

  function cancelarCierre() {
    showModalCierre = false;
    leadPorCerrar = null;
    draggedLeadId = null;
  }

  function confirmarCierre() {
    const leadId = leadPorCerrar.id;
    
    leads = leads.map(lead => {
      if (lead.id === leadId) return { ...lead, estado: 'cerrado' };
      return lead;
    });

    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', 'cerrado');
    if (precioCierreFinal) formData.append('precio_cierre', precioCierreFinal);
    if (comisionCobrada) formData.append('comision_cierre', comisionCobrada);
    
    fetch('?/actualizar', {
      method: 'POST',
      body: formData,
      headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' }
    }).catch(err => {
      console.error("Error guardando estado:", err);
    });

    showModalCierre = false;
    leadPorCerrar = null;
    draggedLeadId = null;
  }

  function actualizarEstadoLocalYBD(leadId, nuevoEstado) {
    leads = leads.map(lead => {
      if (lead.id === leadId) return { ...lead, estado: nuevoEstado };
      return lead;
    });

    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', nuevoEstado);
    
    fetch('?/actualizar', {
      method: 'POST',
      body: formData,
      headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' }
    }).catch(err => {
      console.error("Error guardando estado:", err);
      alert('Falló la sincronización con el CRM.');
    });
  }

  function completarRecordatorio(notaId) {
    const leadIndex = leads.findIndex(l => l.id === selectedLead.id);
    if (leadIndex !== -1) {
      const notaIndex = leads[leadIndex].lead_notas.findIndex(n => n.id === notaId);
      if (notaIndex !== -1) {
        leads[leadIndex].lead_notas[notaIndex].completado = true;
        selectedLead.lead_notas[notaIndex].completado = true;
        
        const now = new Date();
        const tienePendientes = leads[leadIndex].lead_notas.some(n => 
          n.tipo === 'recordatorio' && !n.completado && new Date(n.fecha_recordatorio) <= now
        );
        leads[leadIndex].has_pending_reminder = tienePendientes;
      }
    }

    const formData = new FormData();
    formData.append('nota_id', notaId);
    fetch('?/completarRecordatorio', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' }});
  }

  function abrirPanel(lead) {
    selectedLead = { ...lead };
    if (!selectedLead.lead_notas) selectedLead.lead_notas = [];
    isPanelOpen = true;
  }

  function cerrarPanel() {
    isPanelOpen = false;
    setTimeout(() => { 
      selectedLead = null; 
      nuevaNotaTexto = ''; 
      esRecordatorio = false; 
      fechaRecordatorio = '';
      horaRecordatorio = '';
    }, 300);
  }

  function manejadorNota({ formData, cancel }) {
    const notaTemp = formData.get('contenido').trim();
    if (!notaTemp || guardandoNota) { cancel(); return; }
    
    if (esRecordatorio && (!fechaRecordatorio || !horaRecordatorio)) { 
      alert("Selecciona fecha y hora para el recordatorio"); 
      cancel(); 
      return; 
    }
    
    guardandoNota = true;
    
    let fechaFinalFormateada = null;
    if (esRecordatorio) {
      fechaFinalFormateada = `${fechaRecordatorio}T${horaRecordatorio}:00`;
    }

    formData.append('is_recordatorio', esRecordatorio);
    if (esRecordatorio) formData.append('fecha_recordatorio', fechaFinalFormateada);
    
    const nuevaNotaObj = {
      id: 'temp-' + Date.now(),
      contenido: notaTemp,
      tipo: esRecordatorio ? 'recordatorio' : 'nota',
      fecha_recordatorio: fechaFinalFormateada,
      completado: false,
      creado_en: new Date().toISOString()
    };
    
    selectedLead.lead_notas = [nuevaNotaObj, ...selectedLead.lead_notas];
    
    if (selectedLead.estado === 'nuevo') {
      actualizarEstadoLocalYBD(selectedLead.id, 'contactado');
      selectedLead.estado = 'contactado';
    }

    return async ({ result, update }) => {
      guardandoNota = false;
      if (result.type === 'success') {
        nuevaNotaTexto = ''; 
        esRecordatorio = false;
        fechaRecordatorio = '';
        horaRecordatorio = '';
        await update(); 
        
        const leadActualizado = data.leads.find(l => l.id === selectedLead.id);
        if (leadActualizado) {
          selectedLead = { ...leadActualizado, lead_notas: [...leadActualizado.lead_notas] };
        }
      } else {
        alert(`Fallo: ${result.data?.error || 'Revisa tu conexión'}`);
      }
    };
  }

  function eliminarLead(id) {
    if (confirm('¿Eliminar prospecto permanentemente?')) {
      leads = leads.filter(l => l.id !== id);
      const formData = new FormData();
      formData.append('id', id);
      fetch('?/eliminar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (nuevaNotaTexto.trim() && submitBtn) submitBtn.click();
    }
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50 font-sans text-slate-900">
  
 <header class="h-20 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-xl shadow-zinc-900/10">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-black tracking-tight text-white flex items-center gap-2">
        <MessageSquareQuote class="w-5 h-5 text-indigo-400" />
        Gestión de Interesados
      </h1>
      {#if totalRecordatoriosPendientes > 0}
        <span class="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse ml-2">
          {totalRecordatoriosPendientes} Alertas
        </span>
      {/if}
    </div>
    <div class="relative w-full max-w-md hidden sm:block">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar prospecto o propiedad..." class="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner">
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto animate-[fadeIn_0.4s_ease-out]">
    <div class="relative w-full mb-6 sm:hidden">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar prospecto..." class="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm">
    </div>

    <div class="flex gap-6 overflow-x-auto pb-8 items-start min-h-[70vh]">
      {#each columnas as columna}
        <div 
          class="flex-shrink-0 w-[340px] bg-slate-100/60 rounded-2xl p-4 flex flex-col min-h-[500px] border border-slate-200/80 shadow-sm"
          ondragover={permitirSoltar}
          ondrop={(e) => soltar(e, columna.id)}
        >
          <div class="flex items-center justify-between mb-5 px-1 border-b border-slate-200 pb-3">
            <h2 class="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full {columna.dot} shadow-sm"></span>
              {columna.titulo}
            </h2>
            <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm">
              {leadsFiltrados.filter(l => l.estado === columna.id).length}
            </span>
          </div>

          <div class="flex-1 flex flex-col gap-3.5">
            {#each leadsFiltrados.filter(l => l.estado === columna.id) as lead (lead.id)}
              <div 
                draggable="true"
                ondragstart={(e) => arrancar(e, lead.id)}
                ondragend={terminar}
                class="bg-white p-4 rounded-xl border {lead.has_pending_reminder ? 'border-rose-300 shadow-rose-100' : 'border-slate-200 shadow-sm'} cursor-pointer active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all duration-200 group relative"
              >
                <button onclick={() => abrirPanel(lead)} class="absolute inset-0 w-full h-full z-0 cursor-pointer"></button>

                <div class="flex items-start justify-between mb-4 relative z-10 pointer-events-none">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=f8fafc&color=0f172a" alt="Avatar" class="w-9 h-9 rounded-full shadow-sm ring-1 ring-slate-100">
                      {#if lead.has_pending_reminder}
                        <div class="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 ring-2 ring-white"><BellRing class="w-3 h-3" /></div>
                      {/if}
                    </div>
                    <div>
                      <h3 class="text-sm font-black text-slate-900 leading-none mb-1.5">{lead.nombre}</h3>
                      <p class="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-widest"><Clock class="w-3 h-3" /> {timeAgo(lead.creado_en)}</p>
                    </div>
                  </div>
                  <button aria-label="Eliminar lead" onclick={(e) => { e.stopPropagation(); eliminarLead(lead.id); }} class="pointer-events-auto text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-100 shadow-sm p-1.5 rounded-md"><Trash2 class="w-3.5 h-3.5" /></button>
                </div>
                
                <div class="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100 relative z-10 pointer-events-none">
                  <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Home class="w-3 h-3 text-slate-300" /> Interés</p>
                  <p class="text-xs text-slate-700 font-bold truncate">{lead.propiedades?.titulo || 'Inventario Privado'}</p>
                </div>
                
                <a 
                  href="https://wa.me/{lead.telefono ? lead.telefono.replace(/\D/g, '') : ''}?text={encodeURIComponent('Hola ' + lead.nombre.split(' ')[0] + ', soy tu asesor de Inmublia. Recibí tu solicitud por la propiedad: ' + (lead.propiedades?.titulo || 'Inventario Privado') + '. ¿En qué te puedo ayudar?')}" 
                  target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()}
                  class="relative z-10 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[11px] font-black uppercase tracking-widest rounded-lg transition-colors border border-emerald-200 shadow-sm"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Contactar
                </a>
              </div>
            {/each}
            {#if leadsFiltrados.filter(l => l.estado === columna.id).length === 0}
              <div class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 min-h-[120px]">
                <GripVertical class="w-6 h-6 text-slate-300 mb-2" />
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Soltar tarjeta</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if isPanelOpen}
    <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity animate-[fadeIn_0.2s_ease-out]" onclick={cerrarPanel}></div>
  {/if}

  <div class="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border-l border-slate-200 flex flex-col {isPanelOpen ? 'translate-x-0' : 'translate-x-full'}">
    {#if selectedLead}
      <div class="px-6 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
        <div class="flex items-center gap-4">
          <img src="https://ui-avatars.com/api/?name={selectedLead.nombre}&background=f8fafc&color=0f172a" alt="Avatar" class="w-12 h-12 rounded-full shadow-sm ring-1 ring-slate-200">
          <div>
            <h2 class="text-lg font-black text-slate-900 leading-tight">{selectedLead.nombre}</h2>
            <span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm {getBadgeColor(selectedLead.estado)} mt-1.5 inline-block">{selectedLead.estado}</span>
          </div>
        </div>
        <button aria-label="Cerrar panel" onclick={cerrarPanel} class="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors bg-white shadow-sm border border-slate-100"><X class="w-5 h-5" /></button>
      </div>

      <div class="px-6 py-5 border-b border-slate-100 shrink-0 bg-slate-50 grid grid-cols-2 gap-6 shadow-inner">
        <div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Phone class="w-3.5 h-3.5" /> Teléfono</p>
          <p class="text-sm font-black text-slate-700">{selectedLead.telefono || 'No registrado'}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Mail class="w-3.5 h-3.5" /> Correo</p>
          <p class="text-sm font-black text-slate-700 truncate" title={selectedLead.correo}>{selectedLead.correo || 'No registrado'}</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 bg-white flex flex-col gap-6">
        <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 pb-2 mb-2">Historial de Actividad</h3>
        {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
          <div class="flex flex-col gap-5">
            {#each selectedLead.lead_notas as nota}
              <div class="relative pl-6">
                <div class="absolute left-0 top-2 bottom-[-24px] w-px bg-slate-200 last:hidden"></div>
                {#if nota.tipo === 'recordatorio'}
                  <div class="absolute left-[-4.5px] top-2 w-2.5 h-2.5 rounded-full {nota.completado ? 'bg-slate-300' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500 animate-pulse' : 'bg-amber-400')} ring-4 ring-white shadow-sm"></div>
                  <div class="bg-white p-4 rounded-xl border {nota.completado ? 'border-slate-200 opacity-60' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-300 bg-rose-50/30' : 'border-amber-200 bg-amber-50/30')} shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
                    <div class="flex items-center gap-2 mb-2">
                      <CalendarClock class="w-4 h-4 {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-500' : 'text-amber-500')}" />
                      <span class="text-[10px] font-bold uppercase tracking-widest {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-600' : 'text-amber-600')}">
                        {nota.completado ? 'Completado' : 'Recordatorio'}
                      </span>
                    </div>
                    <p class="text-sm {nota.completado ? 'text-slate-500 line-through' : 'text-slate-800'} font-medium whitespace-pre-wrap leading-relaxed mb-3">{nota.contenido}</p>
                    <div class="flex items-center justify-between pt-3 border-t {nota.completado ? 'border-slate-100' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-100' : 'border-amber-100')}">
                      <span class="text-[10px] font-bold text-slate-500">{formatDateTime(nota.fecha_recordatorio)}</span>
                      {#if !nota.completado}
                        <button onclick={() => completarRecordatorio(nota.id)} class="text-[10px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm text-slate-600">
                          <CheckCircle2 class="w-3.5 h-3.5" /> Marcar Listo
                        </button>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="absolute left-[-4.5px] top-2 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm"></div>
                  <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <p class="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                    <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                      <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare class="w-3 h-3" /> Nota</span>
                      <span class="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock class="w-3 h-3" /> {timeAgo(nota.creado_en)}</span>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-60">
            <UserCircle class="w-12 h-12 text-slate-300 mb-3" />
            <p class="text-sm font-bold text-slate-500">Sin historial</p>
            <p class="text-xs font-medium text-slate-400 mt-1">Escribe tu primera nota o recordatorio abajo para comenzar.</p>
          </div>
        {/if}
      </div>

      <div class="p-5 bg-slate-50 border-t border-slate-200 shrink-0">
        <form method="POST" action="?/guardarNota" use:enhance={manejadorNota} class="flex flex-col gap-3">
          <input type="hidden" name="lead_id" value={selectedLead.id} />
          
          <div class="flex items-center gap-2 mb-1 p-1 bg-slate-200/50 rounded-lg inline-flex w-fit">
            <button type="button" onclick={() => esRecordatorio = false} class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {!esRecordatorio ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}">
              <MessageSquare class="w-3.5 h-3.5" /> Nota
            </button>
            <button type="button" onclick={() => esRecordatorio = true} class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {esRecordatorio ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}">
              <BellRing class="w-3.5 h-3.5" /> Recordatorio
            </button>
          </div>

          {#if esRecordatorio}
            <div class="animate-[fadeIn_0.2s_ease-out] bg-amber-50/50 p-4 rounded-xl border border-amber-200 mb-1 shadow-sm">
              <label class="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3">Programar Llamada / Visita</label>
              <div class="flex flex-col sm:flex-row gap-3">
                <div class="w-full sm:w-1/2">
                  <input type="date" bind:value={fechaRecordatorio} class="w-full bg-white border border-amber-200/60 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none shadow-inner transition-colors">
                </div>
                <div class="w-full sm:w-1/2 relative">
                  <select bind:value={horaRecordatorio} class="w-full bg-white border border-amber-200/60 rounded-xl pl-3 pr-10 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none shadow-inner cursor-pointer appearance-none transition-colors">
                    <option value="" disabled selected>Selecciona la hora...</option>
                    {#each timeSlots as slot}
                      <option value={slot}>{formatTimeSlot(slot)}</option>
                    {/each}
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown class="w-4 h-4 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          {/if}
          
          <div class="relative">
            <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Asunto del recordatorio... (Ctrl/Cmd + Enter para guardar)" : "Resumen de llamada... (Ctrl/Cmd + Enter para guardar)"} class="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-14 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 {esRecordatorio ? 'focus:ring-amber-500/20 focus:border-amber-400' : 'focus:ring-indigo-500/20 focus:border-indigo-400'} outline-none resize-none min-h-[90px] shadow-sm font-medium transition-colors" required></textarea>
            <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="absolute bottom-3 right-3 {esRecordatorio ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' : 'bg-slate-900 hover:bg-indigo-600 text-white'} disabled:bg-slate-200 disabled:text-slate-400 p-2.5 rounded-lg transition-colors flex items-center justify-center shadow-md active:scale-95" title="Guardar (Ctrl/Cmd + Enter)">
              {#if guardandoNota}
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {:else}
                <Send class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </div>

  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-6 border-b border-slate-100 bg-emerald-50/50">
          <h3 class="text-xl font-black text-emerald-900 flex items-center gap-2">
            <CheckCircle2 class="w-6 h-6 text-emerald-500" /> Cierre Exitoso
          </h3>
          <p class="text-sm text-emerald-700/70 mt-1 font-medium">Puedes registrar los datos finales de la transacción para nutrir tus analíticas, o continuar en blanco.</p>
        </div>
        
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Monto Final de Operación <span class="font-normal text-[9px] lowercase">(Opcional)</span></label>
            <div class="relative">
              <span class="absolute left-4 top-3 text-slate-400 font-bold">$</span>
              <input type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner">
            </div>
          </div>
          
          <div>
            <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comisión Cobrada (%) <span class="font-normal text-[9px] lowercase">(Opcional)</span></label>
            <div class="relative">
              <input type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right">
              <span class="absolute right-4 top-3 text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>
        
        <div class="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onclick={cancelarCierre} class="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">Descartar Movimiento</button>
          <button onclick={confirmarCierre} class="px-6 py-2.5 rounded-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors text-sm flex items-center gap-2">
            Registrar Ganado
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
