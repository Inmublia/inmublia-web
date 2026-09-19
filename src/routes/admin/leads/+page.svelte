<!-- src/routes/admin/leads/+page.svelte -->
<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page } from '$app/state'; 
  import { untrack } from 'svelte';
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare,
    ChevronLeft, ChevronRight, AlertTriangle, Plus, Users, Flame, Sparkles
  } from 'lucide-svelte';
  
  import LeadScoreBadge from '$lib/components/LeadScoreBadge.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let propiedadesOptions = $derived(data.propiedades || []); 
  
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

  let showModalEliminar = $state(false);
  let leadPorEliminar = $state(null);

  let showModalLeadManual = $state(false);
  let guardandoLeadManual = $state(false);

  let boardContainer = $state(null);

  let totalRecordatoriosPendientes = $derived(
    leads.filter(l => l.has_pending_reminder).length
  );

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-indigo-50/40', border: 'border-indigo-100', text: 'text-indigo-700' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-sky-50/40', border: 'border-sky-100', text: 'text-sky-700' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-amber-50/40', border: 'border-amber-100', text: 'text-amber-700' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-purple-50/40', border: 'border-purple-100', text: 'text-purple-700' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-emerald-50/40', border: 'border-emerald-100', text: 'text-emerald-700' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-slate-400', bgCol: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' }
  ];

  let leadsPorColumna = $derived(
    columnas.reduce((acc, col) => {
      acc[col.id] = leadsFiltrados
        .filter(l => l.estado === col.id)
        .sort((a, b) => (b.scoreObj?.score || 0) - (a.scoreObj?.score || 0));
      return acc;
    }, {})
  );

  $effect(() => {
    if (totalRecordatoriosPendientes > 0) {
      document.title = `(${totalRecordatoriosPendientes}) Pendientes - CRM`;
    } else {
      document.title = 'Gestión de Leads - Inmublia';
    }
  });

  $effect(() => { 
    const nuevosLeads = data.leads;
    untrack(() => {
      if (nuevosLeads) leads = nuevosLeads; 
    });
  });

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

  function scrollBoard(direction) {
    if (boardContainer) {
      boardContainer.scrollBy({ left: direction * 350, behavior: 'smooth' });
    }
  }

  function formatMoney(amount) {
    if(!amount) return '';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('es-MX', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
  }

  function getUrgencyStyle(lead) {
    const fechaRef = lead.ultima_actividad || lead.actualizado_en || lead.creado_en;
    if (!fechaRef) return 'text-slate-400';
    const diffInDays = Math.floor((new Date() - new Date(fechaRef)) / (1000 * 60 * 60 * 24));
    
    if (lead.estado === 'nuevo' && diffInDays >= 1) return 'text-rose-600'; 
    if (diffInDays < 2) return 'text-emerald-600';
    if (diffInDays < 7) return 'text-amber-600'; 
    return 'text-rose-600'; 
  }

  function timeAgoLabel(lead) {
    const fechaRef = lead.ultima_actividad || lead.actualizado_en || lead.creado_en;
    if (!fechaRef) return 'Desconocido';
    const date = new Date(fechaRef);
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

  function getInitials(nombre) {
    return (nombre || '?').replace(/[^\p{L}\s]/gu, '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
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
    const idParaProcesar = draggedLeadId;
    draggedLeadId = null;

    if (!idParaProcesar) return;

    if (nuevaColumnaId === 'cerrado') {
      const lead = leads.find(l => l.id === idParaProcesar);
      if (lead) {
        leadPorCerrar = lead;
        precioCierreFinal = lead.propiedades?.precio || '';
        comisionCobrada = lead.propiedades?.comision || broker.comision_default || 5;
        showModalCierre = true;
      }
    } else {
      actualizarEstadoLocalYBD(idParaProcesar, nuevaColumnaId);
    }
  }

  function cancelarCierre() { showModalCierre = false; leadPorCerrar = null; }

  async function confirmarCierre() {
    const leadId = leadPorCerrar.id;
    const precioCopy = precioCierreFinal;
    const comisionCopy = comisionCobrada;
    
    leads = leads.map(l => l.id === leadId ? { ...l, estado: 'cerrado' } : l);
    cancelarCierre();

    try {
      const formData = new FormData();
      formData.append('id', leadId);
      formData.append('estado', 'cerrado');
      if (precioCopy) formData.append('precio_cierre', precioCopy);
      if (comisionCopy) formData.append('comision_cierre', comisionCopy);
      
      const res = await fetch('?/actualizar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      invalidateAll();
    } catch (err) { 
      leads = leads.map(l => l.id === leadId ? { ...l, estado: 'negociacion' } : l);
      alert('No se pudo registrar el cierre. Verifica tu conexión.'); 
    }
  }

  async function actualizarEstadoLocalYBD(leadId, nuevoEstado) {
    const estadoAnterior = leads.find(l => l.id === leadId)?.estado;
    leads = leads.map(l => l.id === leadId ? { ...l, estado: nuevoEstado } : l);
    
    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', nuevoEstado);
    
    try {
      const res = await fetch('?/actualizar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } });
      if (!res.ok) throw new Error(`Fallo de red (${res.status})`);
      
      const data = await res.json();
      if (data.type === 'error' || data.type === 'failure') {
        throw new Error(data.data?.error || 'Error interno del servidor');
      }
      
      invalidateAll();
    } catch (err) { 
      leads = leads.map(l => l.id === leadId ? { ...l, estado: estadoAnterior } : l);
      alert(`No se pudo mover la tarjeta: ${err.message}`); 
    }
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
    
    const nowISO = new Date().toISOString();
    const nuevaNotaObj = { id: 'temp-' + Date.now(), contenido: notaTemp, tipo: esRecordatorio ? 'recordatorio' : 'nota', fecha_recordatorio: fechaFinalFormateada, completado: false, creado_en: nowISO };
    
    selectedLead.lead_notas = [nuevaNotaObj, ...selectedLead.lead_notas];
    selectedLead.actualizado_en = nowISO; 
    if (selectedLead.estado === 'nuevo') selectedLead.estado = 'contactado';

    leads = leads.map(l => {
      if (l.id === selectedLead.id) {
        return {
          ...l,
          actualizado_en: nowISO,
          estado: l.estado === 'nuevo' ? 'contactado' : l.estado,
          lead_notas: [nuevaNotaObj, ...(l.lead_notas || [])]
        };
      }
      return l;
    });

    return async ({ result, update }) => {
      guardandoNota = false;
      
      if (result.type === 'success') {
        nuevaNotaTexto = ''; esRecordatorio = false; fechaRecordatorio = ''; horaRecordatorio = '';
        await update(); 
        const leadAct = data.leads.find(l => l.id === selectedLead.id);
        if (leadAct) selectedLead = { ...leadAct, lead_notas: [...leadAct.lead_notas] };
      } else {
        const errorDB = result.data?.error || "Error Desconocido al comunicarse con el servidor.";
        alert(`Falla detectada: ${errorDB}`);
        await invalidateAll();
      }
    };
  }

  function manejadorLeadManual({ cancel }) {
    guardandoLeadManual = true;
    return async ({ result, update }) => {
      guardandoLeadManual = false;
      if (result.type === 'success') {
        showModalLeadManual = false;
        await update();
        await invalidateAll();
      } else {
        alert(result.data?.error || 'No se pudo guardar el prospecto.');
      }
    };
  }

  function pedirEliminarLead(lead) {
    leadPorEliminar = lead;
    showModalEliminar = true;
  }

  function cancelarEliminar() {
    leadPorEliminar = null;
    showModalEliminar = false;
  }

  async function confirmarEliminar() {
    const id = leadPorEliminar.id;
    leads = leads.filter(l => l.id !== id);
    if(selectedLead && selectedLead.id === id) cerrarPanel();
    cancelarEliminar();

    const formData = new FormData(); 
    formData.append('id', id);
    try {
      await fetch('?/eliminar', { method: 'POST', body: formData, headers: { 'x-sveltekit-action': 'true' } });
      invalidateAll();
    } catch (err) { console.error(err); }
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
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-4 sm:px-8 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
          Pipeline
          {#if totalRecordatoriosPendientes > 0}
            <span class="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md animate-pulse shadow-sm ring-1 ring-rose-500/50 flex items-center gap-1">
              <BellRing class="w-3 h-3" /> {totalRecordatoriosPendientes} Pendientes
            </span>
          {/if}
        </h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          <MessageSquareQuote class="w-4 h-4" /> Gestión de Prospectos CRM
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div class="relative w-full md:max-w-md hidden sm:block flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input type="text" bind:value={searchQuery} placeholder="Buscar cliente..." class="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
        </div>
        
        <button onclick={() => showModalLeadManual = true} class="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors bg-white text-zinc-950 hover:bg-zinc-200 h-11 px-5 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 shrink-0">
          <Plus class="w-4 h-4" /> Nuevo Prospecto
        </button>
      </div>
    </div>
  </header>

  <div class="relative flex-1 flex overflow-hidden group z-20 -mt-16 w-full">
    
    <button onclick={() => scrollBoard(-1)} class="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-indigo-50 border border-slate-200 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-600 hover:text-indigo-600 transition-all backdrop-blur-sm cursor-pointer opacity-0 group-hover:opacity-100" aria-label="Desplazar Izquierda">
      <ChevronLeft class="w-6 h-6" />
    </button>

    <button onclick={() => scrollBoard(1)} class="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-indigo-50 border border-slate-200 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-600 hover:text-indigo-600 transition-all backdrop-blur-sm cursor-pointer opacity-0 group-hover:opacity-100" aria-label="Desplazar Derecha">
      <ChevronRight class="w-6 h-6" />
    </button>

    <div class="flex-1 overflow-x-auto overflow-y-hidden kanban-board px-4 sm:px-8 pb-6 transition-opacity {isPanelOpen ? 'pointer-events-none select-none opacity-50' : ''}" bind:this={boardContainer}>
      <div class="flex gap-4 items-start h-full min-w-max xl:min-w-full">
        
        {#each columnas as columna}
          <div 
            class="flex-1 min-w-[240px] xl:min-w-[200px] shrink-0 {columna.bgCol} border {columna.border} rounded-xl p-3 flex flex-col h-[calc(100vh-180px)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] bg-white/60 backdrop-blur-sm"
            ondragover={permitirSoltar}
            ondrop={(e) => soltar(e, columna.id)}
          >
            <div class="flex items-center justify-between mb-3 sticky top-0 bg-transparent z-10 py-1">
              <h2 class="text-[10px] font-black uppercase tracking-widest {columna.text} flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full {columna.dot} shadow-sm"></span>
                {columna.titulo}
              </h2>
              <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-white/80 backdrop-blur-sm border {columna.border} {columna.text} shadow-sm">
                {(leadsPorColumna[columna.id] || []).length}
              </span>
            </div>

            <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-2.5 pb-8 pt-1">
              {#each leadsPorColumna[columna.id] || [] as lead (lead.id)}
                
                <div 
                  draggable="true"
                  ondragstart={(e) => arrancar(e, lead.id)}
                  ondragend={terminar}
                  role="button"
                  tabindex="0"
                  onclick={() => abrirPanel(lead)}
                  onkeydown={(e) => { if (e.key === 'Enter') abrirPanel(lead); }}
                  class="bg-white p-3 rounded-lg border {lead.scoreObj?.isHot && lead.estado !== 'cerrado' && lead.estado !== 'descartado' ? 'border-orange-400 ring-2 ring-orange-500/10 shadow-md shadow-orange-500/10' : lead.has_pending_reminder ? 'border-rose-300 ring-1 ring-rose-500' : 'border-slate-200'} cursor-grab hover:-translate-y-px hover:border-indigo-300 transition-all duration-200 group relative flex flex-col gap-2.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0 pr-1">
                      
                      <div class="relative shrink-0">
                        <div class="w-6 h-6 rounded-full border border-slate-200 bg-slate-800 text-white flex items-center justify-center text-[8px] font-black uppercase shadow-inner">
                          {getInitials(lead.nombre)}
                        </div>
                        {#if lead.has_pending_reminder}
                          <div class="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full w-2 h-2 border border-white shadow-sm"></div>
                        {/if}
                      </div>

                      <div class="min-w-0 flex flex-col">
                        <h3 class="text-xs font-bold text-slate-900 leading-tight truncate flex items-center gap-1">
                          {lead.nombre}
                        </h3>
                        <p class="text-[9px] font-bold {getUrgencyStyle(lead)} uppercase tracking-widest leading-none mt-0.5 flex items-center gap-1">
                          {timeAgoLabel(lead)}
                        </p>
                      </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-1.5 shrink-0">
                      {#if lead.scoreObj && lead.estado !== 'cerrado' && lead.estado !== 'descartado'}
                        <LeadScoreBadge scoreData={lead.scoreObj} />
                      {/if}
                      
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick={(e) => { e.stopPropagation(); pedirEliminarLead(lead); }} class="p-1 text-slate-300 hover:text-rose-500 transition-colors" title="Eliminar">
                          <Trash2 class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

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

              {#if (leadsPorColumna[columna.id] || []).length === 0}
                <div class="flex-1 flex flex-col items-center justify-center border border-dashed {columna.border} rounded-lg bg-white/40 min-h-[80px]">
                  <p class="text-[9px] font-bold uppercase tracking-widest {columna.text} opacity-40 text-center">Soltar Aquí</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  {#if isPanelOpen}
    <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm z-[105] transition-opacity" onclick={cerrarPanel} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') cerrarPanel(); }}></div>
  {/if}

  <!-- 🚀 PANEL LATERAL MÁS ANCHO (sm:w-[650px]) -->
  <div class="absolute top-0 right-0 h-full w-full sm:w-[650px] bg-white/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.15)] z-[110] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border-l border-white flex flex-col {isPanelOpen ? 'translate-x-0' : 'translate-x-full'}">
    {#if selectedLead}
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-transparent">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-slate-800 text-white flex items-center justify-center text-sm font-black uppercase">
            {getInitials(selectedLead.nombre)}
          </div>
          <div>
            <h2 class="text-lg font-black text-slate-900 leading-tight mb-1">{selectedLead.nombre}</h2>
            <span class="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shadow-sm {getBadgeColor(selectedLead.estado)} inline-flex items-center gap-1.5"><div class="w-1 h-1 rounded-full bg-current opacity-60"></div> {selectedLead.estado}</span>
          </div>
        </div>
        <button aria-label="Cerrar panel" onclick={cerrarPanel} class="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"><X class="w-4 h-4" /></button>
      </div>

      <div class="px-8 py-5 border-b border-slate-100 shrink-0 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Phone class="w-3.5 h-3.5 text-slate-400" /> {selectedLead.telefono || 'No registrado'}
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700 truncate" title={selectedLead.correo}>
            <Mail class="w-3.5 h-3.5 text-slate-400" /> {selectedLead.correo || 'No registrado'}
          </div>
        </div>
        
        <!-- 🚀 BOTÓN PREMIUM DE WHATSAPP -->
        {#if selectedLead.telefono}
          <a href="https://wa.me/{selectedLead.telefono.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="text-[10px] font-black uppercase tracking-widest text-white bg-[#25D366] hover:bg-[#128C7E] px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#25D366]/20 flex items-center justify-center gap-2 w-full sm:w-auto active:scale-95">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        {/if}
      </div>

      <!-- 🚀 DIAGNÓSTICO DE IA COMPACTO (Sin cuadros matemáticos) -->
      {#if selectedLead.scoreObj && selectedLead.estado !== 'cerrado' && selectedLead.estado !== 'descartado'}
        <div class="px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5" /> Insights sobre el prospecto
            </h3>
            <span class="text-xl font-black {selectedLead.scoreObj.isHot ? 'text-orange-500' : 'text-slate-700'}">
              {selectedLead.scoreObj.score}<span class="text-xs text-slate-400">/100</span>
            </span>
          </div>

          <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3">
            <div class="flex items-start gap-2">
              <span class="text-xs font-black text-slate-900 shrink-0">{selectedLead.scoreObj.etiqueta}:</span>
              <p class="text-[11px] text-slate-600 font-medium leading-relaxed">{selectedLead.scoreObj.razon}</p>
            </div>
            
            <div class="bg-indigo-50 rounded-lg p-2.5 border border-indigo-100">
              <p class="text-[11px] font-bold text-indigo-800 leading-tight">👉 {selectedLead.scoreObj.accion}</p>
            </div>
          </div>
        </div>
      {/if}

      <div class="flex-1 overflow-y-auto px-8 py-6 bg-transparent flex flex-col gap-5 pb-6">
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock class="w-3 h-3" /> Bitácora de Relación</h3>
            <button onclick={() => pedirEliminarLead(selectedLead)} class="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase flex items-center gap-1"><Trash2 class="w-3 h-3"/> Borrar Lead</button>
          </div>
          
          {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
            <div class="flex flex-col gap-4">
              {#each selectedLead.lead_notas as nota}
                <div class="relative pl-5">
                  <div class="absolute left-0 top-3 bottom-[-24px] w-px bg-slate-200 last:hidden"></div>
                  
                  {#if nota.tipo === 'recordatorio'}
                    <div class="absolute left-[-4.5px] top-3 w-2.5 h-2.5 rounded-full {nota.completado ? 'bg-slate-300' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500 animate-pulse' : 'bg-amber-400')} ring-2 ring-white shadow-sm"></div>
                    <!-- 🚀 RECORDATORIO COMPACTO -->
                    <div class="bg-white p-3 rounded-xl border {nota.completado ? 'border-slate-200 opacity-60' : (isOverdue(nota.fecha_recordatorio) ? 'border-rose-300 bg-rose-50/50 shadow-sm' : 'border-amber-200 bg-amber-50/50 shadow-sm')} transition-all flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                          <CalendarClock class="w-3.5 h-3.5 {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-500' : 'text-amber-500')}" />
                          <span class="text-[9px] font-black uppercase tracking-widest {nota.completado ? 'text-slate-400' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-600' : 'text-amber-600')}">
                            {nota.completado ? 'Completado' : 'Recordatorio'}
                          </span>
                        </div>
                        <span class="text-[9px] font-bold text-slate-500 text-right">{formatDateTime(nota.fecha_recordatorio)}</span>
                      </div>
                      
                      <p class="text-[11px] {nota.completado ? 'text-slate-500 line-through' : 'text-slate-800'} font-medium whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                      
                      {#if !nota.completado}
                        <div class="flex justify-end pt-1">
                          {#if !nota.id.startsWith('temp-')}
                            <button onclick={() => completarRecordatorio(nota.id)} class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm text-slate-600 active:scale-95">
                              <CheckCircle2 class="w-3 h-3" /> Resolver
                            </button>
                          {:else}
                            <span class="text-[9px] text-slate-400 flex items-center gap-1 font-bold">
                              <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...
                            </span>
                          {/if}
                        </div>
                      {/if}
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

      <div class="p-5 bg-slate-50 border-t border-slate-200 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] relative z-20 pb-24 xl:pb-28">
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

          <!-- 🚀 FIX: Date/Time Picker Modernizado -->
          {#if esRecordatorio}
            <div class="animate-[fadeIn_0.2s_ease-out] bg-amber-50 p-3.5 rounded-xl border border-amber-200 mb-1 shadow-inner">
              <label class="block text-[9px] font-black text-amber-800 uppercase tracking-widest mb-2.5">Fecha de Compromiso</label>
              <div class="flex flex-col sm:flex-row gap-3">
                <div class="relative w-full sm:w-1/2">
                  <input type="date" lang="es-MX" bind:value={fechaRecordatorio} class="w-full bg-white border border-amber-200 rounded-lg pl-3 pr-2 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all shadow-sm">
                </div>
                <div class="relative w-full sm:w-1/2">
                  <input type="time" lang="es-MX" bind:value={horaRecordatorio} class="w-full bg-white border border-amber-200 rounded-lg pl-3 pr-2 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none transition-all shadow-sm">
                </div>
              </div>
            </div>
          {/if}
          
          <div class="relative">
            <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Describe la acción a realizar..." : "Escribe una minuta..."} class="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-12 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 {esRecordatorio ? 'focus:ring-amber-500/20 focus:border-amber-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'} outline-none resize-none min-h-[80px] shadow-sm font-medium transition-colors" required></textarea>
            <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="absolute bottom-3 right-3 {esRecordatorio ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 hover:bg-indigo-600 text-white'} disabled:bg-slate-200 disabled:text-slate-400 p-2.5 rounded-lg transition-colors flex items-center justify-center shadow-md active:scale-95 z-30">
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

  <!-- 🚀 MODAL DE CIERRE (FinTech Style) -->
  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-8 border-b border-slate-100 bg-emerald-50 text-center">
          <div class="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <CheckCircle2 class="w-7 h-7 text-emerald-500" />
          </div>
          <h3 class="text-2xl font-black text-emerald-950 tracking-tight">¡Cierre Exitoso!</h3>
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-1">Fin del Pipeline Operativo</p>
        </div>
        
        <div class="p-8 space-y-6 bg-white">
          <p class="text-xs font-medium text-slate-500 text-center leading-relaxed">Registra los datos financieros finales de la transacción para nutrir tu Dashboard de Inteligencia.</p>
          
          <div class="flex flex-col gap-2">
            <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest">Monto Final de Cierre</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-400 font-black text-sm">MX$</span>
              <input type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner transition-colors">
            </div>
          </div>
          
          <div class="flex flex-col gap-2">
            <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest">Comisión Pactada (%)</label>
            <div class="relative flex items-center">
              <input type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right transition-colors">
              <span class="absolute right-4 text-slate-400 font-black text-sm">%</span>
            </div>
          </div>
        </div>
        
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <button onclick={cancelarCierre} class="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-widest">Descartar Info</button>
          <button onclick={confirmarCierre} class="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95">
            Confirmar Ingreso
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showModalEliminar}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-6 border-b border-slate-100 bg-rose-50 text-center">
          <div class="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
            <AlertTriangle class="w-6 h-6 text-rose-500" />
          </div>
          <h3 class="text-xl font-black text-rose-950">¿Eliminar prospecto?</h3>
        </div>
        
        <div class="p-6 bg-white">
          <p class="text-xs font-medium text-slate-600 text-center">
            Estás a punto de borrar permanentemente a <strong>{leadPorEliminar?.nombre}</strong>. Se perderá toda la bitácora y notas asociadas. Esta acción no se puede deshacer.
          </p>
        </div>
        
        <div class="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2.5">
          <button onclick={cancelarEliminar} class="px-5 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-widest">Cancelar</button>
          <button onclick={confirmarEliminar} class="px-5 py-2.5 rounded-lg font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95">
            <Trash2 class="w-3.5 h-3.5" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showModalLeadManual}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4" onclick={() => showModalLeadManual = false}>
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]" onclick={e => e.stopPropagation()}>
        <div class="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200">
              <Users class="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">Nuevo Prospecto</h3>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Ingreso Manual</p>
            </div>
          </div>
          <button onclick={() => showModalLeadManual = false} class="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-200 transition-colors"><X class="w-5 h-5" /></button>
        </div>
        
        <div class="overflow-y-auto p-6 bg-white">
          <form id="form-lead-manual" method="POST" action="?/crearLeadManual" use:enhance={manejadorLeadManual} class="space-y-4">
            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Nombre Completo <span class="text-rose-500">*</span></label>
              <input type="text" name="nombre" required placeholder="Ej. Juan Pérez" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Teléfono / WhatsApp</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="tel" name="telefono" placeholder="Opcional" class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                <div class="relative">
                  <Mail class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="email" name="correo" placeholder="Opcional" class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                </div>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Canal de Origen</label>
              <select name="origen" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                <option value="WhatsApp">Llegó por WhatsApp</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Recomendación">Recomendación</option>
                <option value="Redes Sociales">Redes Sociales (FB, IG)</option>
                <option value="Guardia / Rótulo">Vio rótulo en la calle</option>
                <option value="Manual" selected>Otro / Manual</option>
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">¿Le interesa una propiedad específica?</label>
              <select name="propiedad_id" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                <option value="ninguna">Búsqueda General (No asignada)</option>
                {#each propiedadesOptions as prop}
                  <option value={prop.id}>{prop.titulo}</option>
                {/each}
              </select>
            </div>

            <div>
              <label class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Nota Inicial (Opcional)</label>
              <textarea name="nota_inicial" placeholder="Contexto: ¿Qué está buscando? Presupuesto, zonas..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors min-h-[80px] resize-none"></textarea>
            </div>
          </form>
        </div>
        
        <div class="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
          <button type="button" onclick={() => showModalLeadManual = false} class="px-5 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-widest">Cancelar</button>
          <button type="submit" form="form-lead-manual" disabled={guardandoLeadManual} class="px-5 py-2.5 rounded-lg font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 min-w-[120px]">
            {#if guardandoLeadManual}
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {:else}
              Guardar Prospecto
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}

</main>

<style>
  .kanban-board::-webkit-scrollbar { 
    height: 8px; 
    width: 0px; 
  }
  .kanban-board::-webkit-scrollbar-track { background: transparent; }
  .kanban-board::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .kanban-board::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .kanban-board { cursor: grab; }
  .kanban-board:active { cursor: grabbing; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
