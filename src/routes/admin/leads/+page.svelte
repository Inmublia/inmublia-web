<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page } from '$app/state'; 
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare,
    DollarSign, CalendarDays, MoreHorizontal
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

  // 🚀 DISEÑO DE COLUMNAS 2026: Añadidos colores de fondo para guiar el flujo visual
  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-indigo-50/30', border: 'border-indigo-100', text: 'text-indigo-700' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-sky-50/30', border: 'border-sky-100', text: 'text-sky-700' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-amber-50/30', border: 'border-amber-100', text: 'text-amber-700' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-purple-50/30', border: 'border-purple-100', text: 'text-purple-700' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-emerald-50/30', border: 'border-emerald-100', text: 'text-emerald-700' },
    { id: 'descartado', titulo: 'Oportunidades Perdidas', dot: 'bg-slate-400', bgCol: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' }
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
    if (!dateString) return 'bg-slate-100 text-slate-500';
    const date = new Date(dateString);
    const diffInDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (diffInDays < 2) return 'bg-emerald-100 text-emerald-700'; // Fresco
    if (diffInDays < 7) return 'bg-amber-100 text-amber-700'; // Entibiando
    return 'bg-rose-100 text-rose-700'; // Frío / Urgente
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

  // Se añade helper para badge compatible con tu diseño viejo pero colores nuevos
  function getBadgeColor(estado) {
    const col = columnas.find(c => c.id === estado);
    return col ? `${col.bgCol} ${col.text} ${col.border}` : 'bg-slate-100 text-slate-600 border-slate-200';
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC] font-sans text-slate-900">
  
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-sm">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <MessageSquareQuote class="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          Pipeline Inmobiliario
          {#if totalRecordatoriosPendientes > 0}
            <span class="bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse shadow-sm ring-2 ring-rose-100 flex items-center gap-1">
              <BellRing class="w-3 h-3" /> {totalRecordatoriosPendientes} Pendientes
            </span>
          {/if}
        </h1>
      </div>
    </div>

    <div class="relative w-full max-w-sm hidden sm:block">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar cliente o propiedad..." class="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-inner">
    </div>
  </header>

  <!-- EL TABLERO KANBAN: Scroll horizontal oculto mediante CSS al final del componente -->
  <div class="flex-1 overflow-auto kanban-board p-6 md:p-8">
    <div class="flex gap-6 items-start h-full pb-10 min-w-max">
      
      {#each columnas as columna}
        <div 
          class="flex-shrink-0 w-[350px] {columna.bgCol} border {columna.border} rounded-2xl p-4 flex flex-col h-[calc(100vh-140px)] shadow-sm"
          ondragover={permitirSoltar}
          ondrop={(e) => soltar(e, columna.id)}
        >
          <!-- STICKY HEADER DE COLUMNA -->
          <div class="flex items-center justify-between mb-4 sticky top-0 bg-transparent z-10 py-1">
            <h2 class="text-xs font-black uppercase tracking-widest {columna.text} flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full {columna.dot} shadow-sm"></span>
              {columna.titulo}
            </h2>
            <span class="text-[10px] font-black px-2.5 py-1 rounded-lg bg-white/60 backdrop-blur-sm border {columna.border} {columna.text} shadow-sm">
              {leadsFiltrados.filter(l => l.estado === columna.id).length}
            </span>
          </div>

          <!-- ÁREA SCROLLABLE DE TARJETAS -->
          <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 pb-10">
            {#each leadsFiltrados.filter(l => l.estado === columna.id) as lead (lead.id)}
              <div 
                draggable="true"
                ondragstart={(e) => arrancar(e, lead.id)}
                ondragend={terminar}
                role="button"
                tabindex="0"
                onclick={() => abrirPanel(lead)}
                onkeydown={(e) => { if (e.key === 'Enter') abrirPanel(lead); }}
                class="bg-white p-4 rounded-xl border {lead.has_pending_reminder ? 'border-rose-300 ring-1 ring-rose-500' : 'border-slate-200'} cursor-grab shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-300 transition-all duration-200 group relative flex flex-col gap-3"
              >
                <!-- CABECERA: Info Rápida -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="relative">
                      <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=f8fafc&color=0f172a" alt="Avatar" class="w-8 h-8 rounded-full border border-slate-100">
                      {#if lead.has_pending_reminder}
                        <div class="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 border-2 border-white text-white"><BellRing class="w-2.5 h-2.5" /></div>
                      {/if}
                    </div>
                    <div>
                      <h3 class="text-sm font-black text-slate-900 leading-none mb-1">{lead.nombre}</h3>
                      <div class="flex items-center gap-2">
                        <span class="text-[9px] font-bold px-1.5 py-0.5 rounded {getUrgencyStyle(lead.creado_en)} uppercase tracking-widest leading-none">
                          {timeAgoLabel(lead.creado_en)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <!-- Quick Actions -->
                    {#if lead.telefono}
                      <a href="https://wa.me/{lead.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors" title="WhatsApp">
                        <MessageSquare class="w-3.5 h-3.5" />
                      </a>
                    {/if}
                    <button aria-label="Opciones" onclick={(e) => { e.stopPropagation(); eliminarLead(lead.id); }} class="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md transition-colors">
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <!-- CUERPO: Info Propiedad -->
                <div class="bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-center gap-3">
                  <div class="w-10 h-10 rounded bg-slate-200 shrink-0 overflow-hidden border border-slate-300/50">
                    {#if lead.propiedades?.imagen_url}
                      <img src={lead.propiedades.imagen_url} alt="Prop" class="w-full h-full object-cover grayscale opacity-80 mix-blend-multiply">
                    {:else}
                      <div class="w-full h-full flex items-center justify-center text-slate-400"><Home class="w-5 h-5" /></div>
                    {/if}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 truncate">{lead.propiedades?.ubicacion || 'Sin Asignar'}</p>
                    <p class="text-xs font-black text-slate-700 truncate">{lead.propiedades?.titulo || 'Inventario General'}</p>
                    {#if lead.propiedades?.precio}
                      <p class="text-[10px] font-bold text-emerald-600 mt-1">{formatMoney(lead.propiedades.precio)}</p>
                    {/if}
                  </div>
                </div>

                <!-- FOOTER: Info Extra -->
                <div class="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-2">
                  <span class="flex items-center gap-1">
                    <MessageSquareQuote class="w-3 h-3" /> {lead.lead_notas?.length || 0} Notas
                  </span>
                  <span class="uppercase tracking-widest">
                    {lead.origen || 'Directo'}
                  </span>
                </div>
              </div>
            {/each}

            {#if leadsFiltrados.filter(l => l.estado === columna.id).length === 0}
              <div class="flex-1 flex flex-col items-center justify-center border-2 border-dashed {columna.border} rounded-xl bg-white/40 min-h-[120px]">
                <GripVertical class="w-6 h-6 {columna.text} opacity-30 mb-2" />
                <p class="text-[9px] font-bold uppercase tracking-widest {columna.text} opacity-50 text-center">Área de Caída</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- THE QUICK-PEEK DRAWER (Glassmorphism) -->
  {#if isPanelOpen}
    <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm z-[105] transition-opacity" onclick={cerrarPanel} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') cerrarPanel(); }}></div>
  {/if}

  <div class="absolute top-0 right-0 h-full w-full sm:w-[500px] bg-white/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.15)] z-[110] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-white flex flex-col {isPanelOpen ? 'translate-x-0' : 'translate-x-full'}">
    {#if selectedLead}
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-transparent">
        <div class="flex items-center gap-4">
          <img src="https://ui-avatars.com/api/?name={selectedLead.nombre}&background=0f172a&color=fff" alt="Avatar" class="w-14 h-14 rounded-full shadow-md ring-2 ring-white">
          <div>
            <h2 class="text-xl font-black text-slate-900 leading-tight mb-1">{selectedLead.nombre}</h2>
            <span class="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border shadow-sm {getBadgeColor(selectedLead.estado)} inline-flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div> {selectedLead.estado}</span>
          </div>
        </div>
        <button aria-label="Cerrar panel" onclick={cerrarPanel} class="text-slate-400 hover:text-slate-900 bg-slate-50 p-2.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"><X class="w-5 h-5" /></button>
      </div>

      <div class="px-8 py-6 border-b border-slate-100 shrink-0 bg-slate-50/50 flex flex-col gap-4 shadow-inner">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Phone class="w-4 h-4 text-slate-400" /> {selectedLead.telefono || 'No registrado'}
          </div>
          {#if selectedLead.telefono}
            <a href="https://wa.me/{selectedLead.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 border border-emerald-200">
              <MessageSquare class="w-3 h-3" /> Enviar Info
            </a>
          {/if}
        </div>
        <div class="flex items-center gap-2 text-sm font-bold text-slate-700 truncate" title={selectedLead.correo}>
          <Mail class="w-4 h-4 text-slate-400" /> {selectedLead.correo || 'No registrado'}
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-8 bg-transparent flex flex-col gap-8">
        <div>
          <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Clock class="w-3.5 h-3.5" /> Bitácora de Relación</h3>
          
          {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
            <div class="flex flex-col gap-5">
              {#each selectedLead.lead_notas as nota}
                <div class="relative pl-6">
                  <!-- Línea de tiempo -->
                  <div class="absolute left-0 top-3 bottom-[-28px] w-px bg-slate-200 last:hidden"></div>
                  
                  {#if nota.tipo === 'recordatorio'}
                    <div class="absolute left-[-5px] top-3 w-3 h-3 rounded-full {nota.completado ? 'bg-slate-300' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500 animate-pulse' : 'bg-amber-400')} ring-4 ring-white shadow-sm"></div>
                    <div class="bg-white p-4 rounded-xl border {nota.completado ? 'border-slate-200 opacity-60' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-300 bg-rose-50/50 shadow-md' : 'border-amber-200 bg-amber-50/50 shadow-md')} transition-all">
                      <div class="flex items-center gap-2 mb-2">
                        <CalendarClock class="w-4 h-4 {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-500' : 'text-amber-500')}" />
                        <span class="text-[10px] font-black uppercase tracking-widest {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-600' : 'text-amber-600')}">
                          {nota.completado ? 'Completado' : 'Recordatorio'}
                        </span>
                      </div>
                      <p class="text-sm {nota.completado ? 'text-slate-500 line-through' : 'text-slate-800'} font-medium whitespace-pre-wrap leading-relaxed mb-4">{nota.contenido}</p>
                      <div class="flex items-center justify-between pt-3 border-t {nota.completado ? 'border-slate-100' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-100' : 'border-amber-100')}">
                        <span class="text-[10px] font-bold text-slate-500">{formatDateTime(nota.fecha_recordatorio)}</span>
                        {#if !nota.completado}
                          <button onclick={() => completarRecordatorio(nota.id)} class="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm text-slate-600">
                            <CheckCircle2 class="w-3 h-3" /> Resolver
                          </button>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="absolute left-[-4.5px] top-3 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm"></div>
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <p class="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                      <div class="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquareQuote class="w-3 h-3" /> Minuta</span>
                        <span class="text-[9px] font-bold text-slate-400 flex items-center gap-1"><Clock class="w-3 h-3" /> {formatDateTime(nota.creado_en)}</span>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl opacity-80">
              <MessageSquareQuote class="w-8 h-8 text-slate-300 mb-3" />
              <p class="text-sm font-bold text-slate-500">Sin historial operativo</p>
              <p class="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Añade la primera nota abajo</p>
            </div>
          {/if}
        </div>
      </div>

      <div class="p-6 bg-slate-50 border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-20">
        <form method="POST" action="?/guardarNota" use:enhance={manejadorNota} class="flex flex-col gap-3">
          <input type="hidden" name="lead_id" value={selectedLead.id} />
          
          <div class="flex items-center gap-2 mb-2 p-1 bg-white border border-slate-200 rounded-lg inline-flex w-fit shadow-sm">
            <button type="button" onclick={() => esRecordatorio = false} class="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {!esRecordatorio ? 'bg-slate-900 shadow text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}">
              <MessageSquare class="w-3.5 h-3.5" /> Nota
            </button>
            <button type="button" onclick={() => esRecordatorio = true} class="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {esRecordatorio ? 'bg-amber-500 shadow text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}">
              <CalendarClock class="w-3.5 h-3.5" /> Follow Up
            </button>
          </div>

          {#if esRecordatorio}
            <div class="animate-[fadeIn_0.2s_ease-out] bg-amber-50 p-4 rounded-xl border border-amber-200 mb-2 shadow-inner">
              <label class="block text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3">Fecha de Compromiso</label>
              <div class="flex flex-col sm:flex-row gap-3">
                <input type="date" bind:value={fechaRecordatorio} class="w-full sm:w-1/2 bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors shadow-sm">
                <input type="time" bind:value={horaRecordatorio} class="w-full sm:w-1/2 bg-white border border-amber-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-colors shadow-sm">
              </div>
            </div>
          {/if}
          
          <div class="relative">
            <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Describe la acción a realizar..." : "Escribe una minuta de la interacción..."} class="w-full bg-white border border-slate-200 rounded-xl pl-4 pr-16 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 {esRecordatorio ? 'focus:ring-amber-500/20 focus:border-amber-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'} outline-none resize-none min-h-[100px] shadow-sm font-medium transition-colors" required></textarea>
            <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="absolute bottom-4 right-4 {esRecordatorio ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-indigo-600 text-white'} disabled:bg-slate-200 disabled:text-slate-400 p-3 rounded-lg transition-colors flex items-center justify-center shadow-lg active:scale-95">
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

  <!-- MODAL DE CIERRE -->
  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-8 border-b border-slate-100 bg-emerald-50 text-center">
          <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <CheckCircle2 class="w-8 h-8 text-emerald-500" />
          </div>
          <h3 class="text-2xl font-black text-emerald-950">¡Cierre Exitoso!</h3>
          <p class="text-xs font-bold uppercase tracking-widest text-emerald-600/70 mt-2">Fin del Pipeline</p>
        </div>
        
        <div class="p-8 space-y-6 bg-white">
          <p class="text-sm font-medium text-slate-500 text-center">Registra los datos financieros finales de la transacción para nutrir tu Dashboard de Inteligencia.</p>
          
          <div>
            <label class="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Monto Final de Cierre</label>
            <div class="relative">
              <span class="absolute left-4 top-3.5 text-slate-400 font-bold">MX$</span>
              <input type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner transition-colors">
            </div>
          </div>
          
          <div>
            <label class="block text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Comisión Pactada (%)</label>
            <div class="relative">
              <input type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right transition-colors">
              <span class="absolute right-5 top-3.5 text-slate-400 font-black">%</span>
            </div>
          </div>
        </div>
        
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <button onclick={cancelarCierre} class="px-6 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-xs uppercase tracking-widest">Descartar Info</button>
          <button onclick={confirmarCierre} class="px-6 py-3.5 rounded-xl font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all text-xs flex items-center justify-center gap-2 active:scale-95">
            Confirmar Ingreso
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  /* Ocultar barra de scroll horizontal para look de App Nativa */
  .kanban-board::-webkit-scrollbar { display: none; }
  .kanban-board { -ms-overflow-style: none; scrollbar-width: none; cursor: grab; }
  .kanban-board:active { cursor: grabbing; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
