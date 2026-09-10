<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page } from '$app/state'; 
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare
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

  $effect(() => { leads = data.leads || []; });

  $effect(() => {
    const leadIdToOpen = page.url.searchParams.get('open');
    if (leadIdToOpen && leads.length > 0) {
      const leadToOpen = leads.find(l => l.id === leadIdToOpen);
      if (leadToOpen && (!selectedLead || selectedLead.id !== leadIdToOpen)) {
        setTimeout(() => {
          abrirPanel(leadToOpen);
          const newUrl = new URL(page.url);
          newUrl.searchParams.delete('open');
          goto(newUrl.pathname + newUrl.search, { replaceState: true, keepFocus: true, noScroll: true });
        }, 50);
      }
    }
  });

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-indigo-50/40', border: 'border-indigo-100', text: 'text-indigo-700' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-sky-50/40', border: 'border-sky-100', text: 'text-sky-700' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-700' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-purple-50/40', border: 'border-purple-100', text: 'text-purple-700' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-700' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-slate-400', bgCol: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' }
  ];

  function formatMoney(amount) {
    if(!amount) return '';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
  }

  function getUrgencyStyle(dateString) {
    if (!dateString) return 'text-slate-400';
    const date = new Date(dateString);
    const diffInDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffInDays < 2) return 'text-emerald-600'; 
    if (diffInDays < 7) return 'text-amber-600'; 
    return 'text-rose-600'; 
  }

  function timeAgoLabel(dateString) {
    if (!dateString) return 'Desconocido';
    const date = new Date(dateString);
    const diffInDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return 'Hoy';
    if (diffInDays === 1) return 'Ayer';
    return `${diffInDays} Días`;
  }

  function isOverdue(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return date <= new Date();
  }

  function arrancar(event, id) {
    draggedLeadId = id;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.classList.add('opacity-30', 'scale-[0.98]'), 0);
  }

  function terminar(event) { event.target.classList.remove('opacity-30', 'scale-[0.98]'); }
  function permitirSoltar(event) { event.preventDefault(); }

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

  function cancelarCierre() { showModalCierre = false; leadPorCerrar = null; draggedLeadId = null; }

  async function confirmarCierre() {
    const leadId = leadPorCerrar.id;
    leads = leads.map(l => l.id === leadId ? { ...l, estado: 'cerrado' } : l);
    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', 'cerrado');
    if (precioCierreFinal) formData.append('precio_cierre', precioCierreFinal);
    if (comisionCobrada) formData.append('comision_cierre', comisionCobrada);
    try {
      await fetch('?/actualizar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
      invalidateAll();
    } catch (err) { console.error(err); }
    cancelarCierre();
  }

  async function actualizarEstadoLocalYBD(leadId, nuevoEstado) {
    leads = leads.map(l => l.id === leadId ? { ...l, estado: nuevoEstado } : l);
    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', nuevoEstado);
    try {
      await fetch('?/actualizar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
      invalidateAll();
    } catch (err) { console.error(err); alert('Falló sincronización.'); }
  }

  async function completarRecordatorio(notaId) {
    const leadIndex = leads.findIndex(l => l.id === selectedLead.id);
    if (leadIndex !== -1) {
      const notaIndex = leads[leadIndex].lead_notas.findIndex(n => n.id === notaId);
      if (notaIndex !== -1) {
        leads[leadIndex].lead_notas[notaIndex].completado = true;
        selectedLead.lead_notas[notaIndex].completado = true;
        const tienePendientes = leads[leadIndex].lead_notas.some(n => n.tipo === 'recordatorio' && !n.completado && new Date(n.fecha_recordatorio) <= new Date());
        leads[leadIndex].has_pending_reminder = tienePendientes;
      }
    }
    const formData = new FormData();
    formData.append('nota_id', notaId);
    try {
      await fetch('?/completarRecordatorio', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
      invalidateAll();
    } catch (err) { console.error(err); }
  }

  function abrirPanel(lead) {
    selectedLead = { ...lead };
    if (!selectedLead.lead_notas) selectedLead.lead_notas = [];
    isPanelOpen = true;
  }

  function cerrarPanel() {
    isPanelOpen = false;
    setTimeout(() => { selectedLead = null; nuevaNotaTexto = ''; esRecordatorio = false; fechaRecordatorio = ''; horaRecordatorio = ''; }, 300);
  }

  function manejadorNota({ formData, cancel }) {
    const notaTemp = formData.get('contenido').trim();
    if (!notaTemp || guardandoNota) { cancel(); return; }
    if (esRecordatorio && (!fechaRecordatorio || !horaRecordatorio)) { alert("Selecciona fecha y hora"); cancel(); return; }
    
    guardandoNota = true;
    let fechaFinalFormateada = null;
    if (esRecordatorio) {
      const [year, month, day] = fechaRecordatorio.split('-');
      const [hour, minute] = horaRecordatorio.split(':');
      fechaFinalFormateada = new Date(year, month - 1, day, hour, minute).toISOString();
    }

    formData.append('is_recordatorio', esRecordatorio);
    if (esRecordatorio) formData.append('fecha_recordatorio', fechaFinalFormateada);
    
    const nuevaNotaObj = { id: 'temp-' + Date.now(), contenido: notaTemp, tipo: esRecordatorio ? 'recordatorio' : 'nota', fecha_recordatorio: fechaFinalFormateada, completado: false, creado_en: new Date().toISOString() };
    selectedLead.lead_notas = [nuevaNotaObj, ...selectedLead.lead_notas];
    
    if (selectedLead.estado === 'nuevo') {
      actualizarEstadoLocalYBD(selectedLead.id, 'contactado');
      selectedLead.estado = 'contactado';
    }

    return async ({ result, update }) => {
      guardandoNota = false;
      if (result.type === 'success') {
        nuevaNotaTexto = ''; esRecordatorio = false; fechaRecordatorio = ''; horaRecordatorio = '';
        await update(); 
        const leadAct = data.leads.find(l => l.id === selectedLead.id);
        if (leadAct) selectedLead = { ...leadAct, lead_notas: [...leadAct.lead_notas] };
      } else {
        alert('Error al guardar nota.');
      }
    };
  }

  async function eliminarLead(id) {
    if (confirm('¿Eliminar prospecto permanentemente?')) {
      leads = leads.filter(l => l.id !== id);
      const formData = new FormData(); formData.append('id', id);
      try {
        await fetch('?/eliminar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true' } });
        invalidateAll();
      } catch (err) { console.error(err); }
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (nuevaNotaTexto.trim() && submitBtn) submitBtn.click(); }
  }

  function getBadgeColor(estado) {
    const col = columnas.find(c => c.id === estado);
    return col ? `${col.bgCol} ${col.text} ${col.border}` : 'bg-slate-100 text-slate-600 border-slate-200';
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC] font-sans text-slate-900">
  
  <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-20 shadow-sm">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-slate-900 rounded-lg text-white shadow-sm border border-slate-800">
        <MessageSquareQuote class="w-4 h-4 text-indigo-400" />
      </div>
      <h1 class="text-lg font-black tracking-tight text-slate-900 flex items-center gap-3">
        Pipeline
        {#if totalRecordatoriosPendientes > 0}
          <span class="bg-rose-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md animate-pulse shadow-sm ring-1 ring-rose-100 flex items-center gap-1">
            <BellRing class="w-2.5 h-2.5" /> {totalRecordatoriosPendientes} Pendientes
          </span>
        {/if}
      </h1>
    </div>

    <div class="relative w-full max-w-xs hidden sm:block">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar cliente..." class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-inner">
    </div>
  </header>

  <!-- 🚀 TABLERO KANBAN PANORÁMICO (High-Density View) -->
  <div class="flex-1 overflow-x-auto kanban-board p-4 md:p-6">
    <!-- El min-w-max asegura que si la pantalla es muy pequeña hagan scroll, pero si es grande ocuparán el flex-1 fluido -->
    <div class="flex gap-3 md:gap-4 items-start h-full pb-6 min-w-max lg:min-w-full">
      
      {#each columnas as columna}
        <!-- 🚀 COLUMNAS FLUIDAS: Usamos flex-1 y un min-w ajustado (240px) en vez del fijo de 350px -->
        <div 
          class="flex-1 min-w-[240px] w-[260px] lg:w-auto shrink-0 {columna.bgCol} border {columna.border} rounded-xl p-3 flex flex-col h-[calc(100vh-130px)] shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
          ondragover={permitirSoltar}
          ondrop={(e) => soltar(e, columna.id)}
        >
          <!-- STICKY HEADER -->
          <div class="flex items-center justify-between mb-3 sticky top-0 bg-transparent z-10 py-1">
            <h2 class="text-[10px] font-black uppercase tracking-widest {columna.text} flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full {columna.dot} shadow-sm"></span>
              {columna.titulo}
            </h2>
            <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-white/80 backdrop-blur-sm border {columna.border} {columna.text} shadow-sm">
              {leadsFiltrados.filter(l => l.estado === columna.id).length}
            </span>
          </div>

          <!-- ÁREA SCROLLABLE -->
          <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2.5 pb-8">
            {#each leadsFiltrados.filter(l => l.estado === columna.id) as lead (lead.id)}
              
              <!-- 🚀 TARJETA ULTRA-COMPACTA -->
              <div 
                draggable="true"
                ondragstart={(e) => arrancar(e, lead.id)}
                ondragend={terminar}
                role="button"
                tabindex="0"
                onclick={() => abrirPanel(lead)}
                onkeydown={(e) => { if (e.key === 'Enter') abrirPanel(lead); }}
                class="bg-white p-3 rounded-lg border {lead.has_pending_reminder ? 'border-rose-300 ring-1 ring-rose-500' : 'border-slate-200'} cursor-grab shadow-sm hover:shadow hover:-translate-y-px hover:border-indigo-300 transition-all duration-200 group relative flex flex-col gap-2.5"
              >
                <!-- Info Cliente -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="relative shrink-0">
                      <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=f8fafc&color=0f172a" alt="Avatar" class="w-6 h-6 rounded-full border border-slate-100">
                      {#if lead.has_pending_reminder}
                        <div class="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full w-2 h-2 border border-white"></div>
                      {/if}
                    </div>
                    <div class="min-w-0 flex flex-col">
                      <h3 class="text-xs font-bold text-slate-900 leading-tight truncate">{lead.nombre}</h3>
                      <p class="text-[9px] font-bold {getUrgencyStyle(lead.creado_en)} uppercase tracking-widest leading-none mt-0.5">{timeAgoLabel(lead.creado_en)}</p>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {#if lead.telefono}
                      <a href="https://wa.me/{lead.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-1 text-emerald-500 hover:text-emerald-600 transition-colors" title="WhatsApp">
                        <MessageSquare class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                  </div>
                </div>

                <!-- Info Propiedad Miniaturizada -->
                <div class="bg-slate-50 border border-slate-100 p-1.5 rounded-md flex items-center gap-2">
                  <div class="w-7 h-7 rounded bg-slate-200 shrink-0 overflow-hidden border border-slate-300/50">
                    {#if lead.propiedades?.imagen_url}
                      <img src={lead.propiedades.imagen_url} alt="Prop" class="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply">
                    {:else}
                      <div class="w-full h-full flex items-center justify-center text-slate-400"><Home class="w-3.5 h-3.5" /></div>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-bold text-slate-700 truncate leading-none mb-1" title={lead.propiedades?.titulo}>{lead.propiedades?.titulo || 'Inventario General'}</p>
                    <div class="flex items-center justify-between">
                      {#if lead.propiedades?.precio}
                        <p class="text-[9px] font-black text-emerald-600 leading-none">{formatMoney(lead.propiedades.precio)}</p>
                      {:else}
                        <span></span>
                      {/if}
                      <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{lead.origen || 'Directo'}</span>
                    </div>
                  </div>
                </div>
              </div>

            {/each}

            {#if leadsFiltrados.filter(l => l.estado === columna.id).length === 0}
              <div class="flex-1 flex flex-col items-center justify-center border border-dashed {columna.border} rounded-lg bg-white/40 min-h-[80px]">
                <p class="text-[9px] font-bold uppercase tracking-widest {columna.text} opacity-40 text-center">Soltar Aquí</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- THE QUICK-PEEK DRAWER -->
  {#if isPanelOpen}
    <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm z-[105] transition-opacity" onclick={cerrarPanel} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') cerrarPanel(); }}></div>
  {/if}

  <div class="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-white/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.15)] z-[110] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-white flex flex-col {isPanelOpen ? 'translate-x-0' : 'translate-x-full'}">
    {#if selectedLead}
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-transparent">
        <div class="flex items-center gap-4">
          <img src="https://ui-avatars.com/api/?name={selectedLead.nombre}&background=0f172a&color=fff" alt="Avatar" class="w-12 h-12 rounded-full shadow-sm ring-2 ring-white">
          <div>
            <h2 class="text-lg font-black text-slate-900 leading-tight mb-1">{selectedLead.nombre}</h2>
            <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm {getBadgeColor(selectedLead.estado)} inline-flex items-center gap-1.5"><div class="w-1 h-1 rounded-full bg-current opacity-60"></div> {selectedLead.estado}</span>
          </div>
        </div>
        <button aria-label="Cerrar panel" onclick={cerrarPanel} class="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"><X class="w-4 h-4" /></button>
      </div>

      <div class="px-8 py-5 border-b border-slate-100 shrink-0 bg-slate-50/50 flex flex-col gap-3 shadow-inner">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Phone class="w-3.5 h-3.5 text-slate-400" /> {selectedLead.telefono || 'No registrado'}
          </div>
          {#if selectedLead.telefono}
            <a href="https://wa.me/{selectedLead.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 border border-emerald-200">
              <MessageSquare class="w-3 h-3" /> Enviar Info
            </a>
          {/if}
        </div>
        <div class="flex items-center gap-2 text-xs font-bold text-slate-700 truncate" title={selectedLead.correo}>
          <Mail class="w-3.5 h-3.5 text-slate-400" /> {selectedLead.correo || 'No registrado'}
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-8 bg-transparent flex flex-col gap-6">
        <div>
          <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Clock class="w-3 h-3" /> Bitácora de Relación</h3>
          
          {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
            <div class="flex flex-col gap-4">
              {#each selectedLead.lead_notas as nota}
                <div class="relative pl-5">
                  <div class="absolute left-0 top-3 bottom-[-24px] w-px bg-slate-200 last:hidden"></div>
                  
                  {#if nota.tipo === 'recordatorio'}
                    <div class="absolute left-[-4.5px] top-3 w-2.5 h-2.5 rounded-full {nota.completado ? 'bg-slate-300' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500 animate-pulse' : 'bg-amber-400')} ring-2 ring-white shadow-sm"></div>
                    <div class="bg-white p-3 rounded-xl border {nota.completado ? 'border-slate-200 opacity-60' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-300 bg-rose-50/50 shadow-sm' : 'border-amber-200 bg-amber-50/50 shadow-sm')} transition-all">
                      <div class="flex items-center gap-1.5 mb-2">
                        <CalendarClock class="w-3.5 h-3.5 {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-500' : 'text-amber-500')}" />
                        <span class="text-[9px] font-black uppercase tracking-widest {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-600' : 'text-amber-600')}">
                          {nota.completado ? 'Completado' : 'Recordatorio'}
                        </span>
                      </div>
                      <p class="text-xs {nota.completado ? 'text-slate-500 line-through' : 'text-slate-800'} font-medium whitespace-pre-wrap leading-relaxed mb-3">{nota.contenido}</p>
                      <div class="flex items-center justify-between pt-2.5 border-t {nota.completado ? 'border-slate-100' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-100' : 'border-amber-100')}">
                        <span class="text-[9px] font-bold text-slate-500">{formatDateTime(nota.fecha_recordatorio)}</span>
                        {#if !nota.completado}
                          <button onclick={() => completarRecordatorio(nota.id)} class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm text-slate-600">
                            <CheckCircle2 class="w-3 h-3" /> Resolver
                          </button>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="absolute left-[-3px] top-3 w-1.5 h-1.5 rounded-full bg-indigo-500 ring-2 ring-white shadow-sm"></div>
                    <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <p class="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                      <div class="flex justify-between items-center mt-2.5 pt-2.5 border-t border-slate-50">
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><MessageSquareQuote class="w-2.5 h-2.5" /> Minuta</span>
                        <span class="text-[8px] font-bold text-slate-400 flex items-center gap-1"><Clock class="w-2.5 h-2.5" /> {formatDateTime(nota.creado_en)}</span>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl opacity-80">
              <MessageSquareQuote class="w-6 h-6 text-slate-300 mb-2" />
              <p class="text-xs font-bold text-slate-500">Sin historial</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="p-5 bg-slate-50 border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-20">
        <form method="POST" action="?/guardarNota" use:enhance={manejadorNota} class="flex flex-col gap-2.5">
          <input type="hidden" name="lead_id" value={selectedLead.id} />
          
          <div class="flex items-center gap-1.5 mb-1.5 p-1 bg-white border border-slate-200 rounded-lg inline-flex w-fit shadow-sm">
            <button type="button" onclick={() => esRecordatorio = false} class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {!esRecordatorio ? 'bg-slate-900 shadow text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}">
              <MessageSquare class="w-3 h-3" /> Nota
            </button>
            <button type="button" onclick={() => esRecordatorio = true} class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {esRecordatorio ? 'bg-amber-500 shadow text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}">
              <CalendarClock class="w-3 h-3" /> Follow Up
            </button>
          </div>

          {#if esRecordatorio}
            <div class="animate-[fadeIn_0.2s_ease-out] bg-amber-50 p-3 rounded-lg border border-amber-200 mb-1 shadow-inner">
              <label class="block text-[9px] font-black text-amber-800 uppercase tracking-widest mb-2">Fecha de Compromiso</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input type="date" bind:value={fechaRecordatorio} class="w-full sm:w-1/2 bg-white border border-amber-200 rounded-md px-2.5 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors shadow-sm">
                <input type="time" bind:value={horaRecordatorio} class="w-full sm:w-1/2 bg-white border border-amber-200 rounded-md px-2.5 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors shadow-sm">
              </div>
            </div>
          {/if}
          
          <div class="relative">
            <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Describe la acción a realizar..." : "Escribe una minuta..."} class="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-12 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 {esRecordatorio ? 'focus:ring-amber-500/20 focus:border-amber-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'} outline-none resize-none min-h-[80px] shadow-sm font-medium transition-colors" required></textarea>
            <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="absolute bottom-3 right-3 {esRecordatorio ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-indigo-600 text-white'} disabled:bg-slate-200 disabled:text-slate-400 p-2 rounded-md transition-colors flex items-center justify-center shadow-md active:scale-95">
              {#if guardandoNota}
                <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {:else}
                <Send class="w-3.5 h-3.5" />
              {/if}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </div>

  <!-- MODAL DE CIERRE -->
  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-6 border-b border-slate-100 bg-emerald-50 text-center">
          <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
            <CheckCircle2 class="w-6 h-6 text-emerald-500" />
          </div>
          <h3 class="text-xl font-black text-emerald-950">¡Cierre Exitoso!</h3>
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-1">Fin del Pipeline</p>
        </div>
        
        <div class="p-6 space-y-5 bg-white">
          <p class="text-xs font-medium text-slate-500 text-center">Registra los datos financieros finales de la transacción para nutrir tu Dashboard.</p>
          
          <div>
            <label class="block text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Monto Final de Cierre</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">MX$</span>
              <input type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner transition-colors">
            </div>
          </div>
          
          <div>
            <label class="block text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1.5">Comisión Pactada (%)</label>
            <div class="relative">
              <input type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right transition-colors">
              <span class="absolute right-4 top-2.5 text-slate-400 font-black text-sm">%</span>
            </div>
          </div>
        </div>
        
        <div class="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2.5">
          <button onclick={cancelarCierre} class="px-5 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-widest">Descartar Info</button>
          <button onclick={confirmarCierre} class="px-5 py-2.5 rounded-lg font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95">
            Confirmar Ingreso
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .kanban-board::-webkit-scrollbar { display: none; }
  .kanban-board { -ms-overflow-style: none; scrollbar-width: none; cursor: grab; }
  .kanban-board:active { cursor: grabbing; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
