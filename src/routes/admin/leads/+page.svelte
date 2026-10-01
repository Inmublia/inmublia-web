<!-- src/routes/admin/leads/+page.svelte -->
<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page } from '$app/state'; 
  import { untrack } from 'svelte';
  
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare,
    ChevronLeft, ChevronRight, AlertTriangle, Plus, Users, Flame, Sparkles, Loader2, ArrowRight,
    ArrowLeft, Building2, Zap, Calendar
  } from 'lucide-svelte';
  
  import LeadScoreBadge from '$lib/components/LeadScoreBadge.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let propiedadesOptions = $derived(data.propiedades || []); 
  
  let leads = $state(data.leads || []);
  let draggedLeadId = $state(null);
  let hoveredLeadId = $state(null);

  // 🚀 ESTADO UI: Panel Flotante Dinámico
  let selectedLeadId = $state(null);
  let isPanelOpen = $derived(!!selectedLeadId);
  let selectedLead = $derived(leads.find(l => l.id === selectedLeadId) || null);

  // Estado Operativo (Omnibox)
  let nuevaNotaTexto = $state('');
  let guardandoNota = $state(false);
  let submitBtn = $state(null);
  let esRecordatorio = $state(false);
  let fechaRecordatorio = $state('');
  let horaRecordatorio = $state(''); 
  
  // Estado IA Copiloto
  let iaGenerandoWs = $state(false);
  let creditosIA = $state(0);

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
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-indigo-100 dark:border-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-400' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-sky-100 dark:border-sky-500/20', text: 'text-sky-700 dark:text-sky-400' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-amber-100 dark:border-amber-500/20', text: 'text-amber-700 dark:text-amber-400' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-purple-100 dark:border-purple-500/20', text: 'text-purple-700 dark:text-purple-400' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-emerald-100 dark:border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-slate-400', bgCol: 'bg-white/40 dark:bg-zinc-900/40', border: 'border-slate-200 dark:border-zinc-700/50', text: 'text-slate-500 dark:text-zinc-500' }
  ];

  let leadsPorColumna = $derived(
    columnas.reduce((acc, col) => {
      acc[col.id] = leadsFiltrados
        .filter(l => l.estado === col.id)
        .sort((a, b) => (b.scoreObj?.score || 0) - (a.scoreObj?.score || 0));
      return acc;
    }, {})
  );

  let metricasColumnas = $derived(
    columnas.reduce((acc, col) => {
      const leadsCol = leadsPorColumna[col.id] || [];
      const propiedadesUnicas = new Map();
      for (const lead of leadsCol) {
        if (lead.propiedad_id && lead.propiedades?.precio) {
          propiedadesUnicas.set(lead.propiedad_id, lead.propiedades.precio);
        }
      }
      const totalValor = [...propiedadesUnicas.values()].reduce((sum, precio) => sum + precio, 0);
      const comisionPct = broker.comision_default || 5;
      const comisionEstimada = totalValor * (comisionPct / 100);
      acc[col.id] = { count: leadsCol.length, totalValue: totalValor, comisionEstimada, propiedadesCount: propiedadesUnicas.size };
      return acc;
    }, {})
  );

  async function postAction(action, formData) {
    const res = await fetch(`?/${action}`, {
      method: 'POST',
      body: formData,
      headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (result.type === 'error' || result.type === 'failure') throw new Error(result.data?.error || 'Error interno del servidor');
    return result;
  }

  $effect(() => {
    if (isPanelOpen) document.body.classList.add('canvas-open');
    else document.body.classList.remove('canvas-open');
  });

  $effect(() => {
    if (totalRecordatoriosPendientes > 0) document.title = `(${totalRecordatoriosPendientes}) Pendientes - CRM`;
    else document.title = 'Gestión de Leads - Inmublia';
  });

  $effect(() => { 
    const nuevosLeads = data.leads;
    untrack(() => { if (nuevosLeads) leads = nuevosLeads; });
  });

  $effect(() => {
    if (data.broker) untrack(() => creditosIA = data.broker.ia_creditos_disponibles || 0);
  });

  let handledOpenId = $state(null);
  
  $effect(() => {
    const leadIdToOpen = page.url.searchParams.get('open');
    if (leadIdToOpen && leadIdToOpen !== handledOpenId && leads.length > 0) {
      const leadToOpen = leads.find(l => l.id === leadIdToOpen);
      if (leadToOpen) {
        handledOpenId = leadIdToOpen;
        abrirPanel(leadToOpen);
        const newUrl = new URL(page.url);
        newUrl.searchParams.delete('open');
        goto(newUrl.pathname + newUrl.search, { replaceState: true, keepFocus: true, noScroll: true });
      }
    }
  });

  function scrollBoard(direction) {
    if (boardContainer) boardContainer.scrollBy({ left: direction * 350, behavior: 'smooth' });
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
    if (!fechaRef) return 'text-slate-400 dark:text-zinc-500';
    const diffInDays = Math.floor((new Date() - new Date(fechaRef)) / (1000 * 60 * 60 * 24));
    if (lead.estado === 'nuevo' && diffInDays >= 1) return 'text-rose-600 dark:text-rose-400 font-black'; 
    if (lead.estado === 'negociacion' && diffInDays >= 3) return 'text-rose-600 dark:text-rose-400 font-black'; 
    if (diffInDays < 2) return 'text-emerald-600 dark:text-emerald-400';
    if (diffInDays < 7) return 'text-slate-500 dark:text-zinc-400'; 
    return 'text-rose-600 dark:text-rose-400 font-black'; 
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
    return new Date(dateString) <= new Date();
  }

  function getInitials(nombre) {
    return (nombre || '?').replace(/[^\p{L}\s]/gu, '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  function arrancar(event, id) {
    hoveredLeadId = null;
    draggedLeadId = id;
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.classList.add('opacity-30', 'scale-[0.98]'), 0);
  }

  function terminar(event) { 
    hoveredLeadId = null;
    draggedLeadId = null;
    event.target.classList.remove('opacity-30', 'scale-[0.98]'); 
  }
  
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
    const estadoAnterior = leads.find(l => l.id === leadId)?.estado; 
    
    leads = leads.map(l => l.id === leadId ? { ...l, estado: 'cerrado' } : l);
    cancelarCierre();

    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', 'cerrado');
    if (precioCopy) formData.append('precio_cierre', precioCopy);
    if (comisionCopy) formData.append('comision_cierre', comisionCopy);

    try {
      await postAction('actualizar', formData);
      invalidateAll();
    } catch (err) { 
      leads = leads.map(l => l.id === leadId ? { ...l, estado: estadoAnterior } : l);
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
      await postAction('actualizar', formData);
      invalidateAll();
    } catch (err) { 
      leads = leads.map(l => l.id === leadId ? { ...l, estado: estadoAnterior } : l);
      alert(`No se pudo mover la tarjeta: ${err.message}`); 
    }
  }

  async function completarRecordatorio(notaId) {
    const now = new Date();
    leads = leads.map(l => {
      if (l.id !== selectedLeadId) return l;
      const updatedNotas = (l.lead_notas || []).map(n => n.id === notaId ? { ...n, completado: true } : n);
      const tienePendientes = updatedNotas.some(n => n.tipo === 'recordatorio' && !n.completado && new Date(n.fecha_recordatorio) <= now);
      return { ...l, lead_notas: updatedNotas, has_pending_reminder: tienePendientes };
    });

    const formData = new FormData();
    formData.append('nota_id', notaId);
    
    try {
      await postAction('completarRecordatorio', formData);
      invalidateAll();
    } catch (err) { 
      alert(`⛔ No se pudo marcar como resuelto:\n${err.message}`); 
      invalidateAll(); 
    }
  }

  function abrirPanel(lead) {
    selectedLeadId = lead.id;
    nuevaNotaTexto = ''; 
    esRecordatorio = false;
  }

  function cerrarPanel() {
    selectedLeadId = null;
    nuevaNotaTexto = ''; 
    esRecordatorio = false; 
    fechaRecordatorio = ''; 
    horaRecordatorio = ''; 
  }

  function manejadorNota({ formData, cancel }) {
    const notaTemp = formData.get('contenido')?.trim();
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
    const nuevaNotaObj = { 
      id: 'temp-' + Date.now(), contenido: notaTemp, tipo: esRecordatorio ? 'recordatorio' : 'nota', 
      fecha_recordatorio: fechaFinalFormateada, completado: false, creado_en: nowISO 
    };
    
    leads = leads.map(l => {
      if (l.id === selectedLeadId) {
        return { ...l, actualizado_en: nowISO, estado: l.estado === 'nuevo' ? 'contactado' : l.estado, lead_notas: [nuevaNotaObj, ...(l.lead_notas || [])] };
      }
      return l;
    });

    return async ({ result, update }) => {
      guardandoNota = false;
      if (result.type === 'success') {
        nuevaNotaTexto = ''; esRecordatorio = false; fechaRecordatorio = ''; horaRecordatorio = '';
        await update(); await invalidateAll();
      } else {
        alert(`Falla detectada: ${result.data?.error || "Error Desconocido"}`);
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
        await update(); await invalidateAll();
      } else alert(result.data?.error || 'No se pudo guardar el prospecto.');
    };
  }

  function pedirEliminarLead(lead) { leadPorEliminar = lead; showModalEliminar = true; }
  function cancelarEliminar() { leadPorEliminar = null; showModalEliminar = false; }

  async function confirmarEliminar() {
    const id = leadPorEliminar.id;
    leads = leads.filter(l => l.id !== id);
    if (selectedLeadId === id) cerrarPanel();
    cancelarEliminar();

    const formData = new FormData(); 
    formData.append('id', id);
    try {
      await postAction('eliminar', formData);
      invalidateAll();
    } catch (err) { console.error('Error al eliminar lead:', err); }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
      e.preventDefault(); 
      if (nuevaNotaTexto.trim() && submitBtn) submitBtn.click(); 
    }
  }
</script>

<div class="fixed inset-0 bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative font-sans text-slate-900 dark:text-zinc-100 transition-colors duration-300">
  
  {#if data.advertenciaPago}
    <div class="w-full bg-amber-500 text-amber-950 px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 z-50">
      <AlertTriangle class="w-4 h-4" /> Alerta de Facturación: Actualiza tu método de pago para evitar suspensión.
    </div>
  {/if}
  {#if data.errorConexion}
    <div class="w-full bg-rose-500 text-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 z-50">
      <AlertTriangle class="w-4 h-4" /> Intermitencia en el servidor. Trabajando en modo degradado temporal.
    </div>
  {/if}

  <PageHeader title="Pipeline" icon={Users}>
    {#snippet subtitle()}
      Gestión de Prospectos CRM
      {#if totalRecordatoriosPendientes > 0}
        <span class="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md animate-pulse shadow-sm ring-1 ring-rose-500/50 flex items-center gap-1 ml-2">
          <BellRing class="w-3 h-3"/> {totalRecordatoriosPendientes} Pendientes
        </span>
      {/if}
    {/snippet}

    {#snippet actions()}
      <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div class="relative w-full md:max-w-md hidden sm:block flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"/>
          <input type="text" bind:value={searchQuery} placeholder="Buscar cliente..." class="w-full bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
        </div>
        
        <button onclick={() => showModalLeadManual = true} class="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors bg-slate-900 dark:bg-white text-white dark:text-zinc-950 border border-transparent hover:bg-slate-800 dark:hover:bg-zinc-200 h-11 px-5 gap-2 shadow-sm active:scale-95 shrink-0">
          <Plus class="w-4 h-4"/> Nuevo Prospecto
        </button>
      </div>
    {/snippet}
  </PageHeader>

  <div class="relative flex-1 flex overflow-hidden z-20 -mt-16 w-full">
    
    <button onclick={() => scrollBoard(-1)} class="{isPanelOpen ? 'hidden' : 'hidden sm:flex'} absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-zinc-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border border-slate-200 dark:border-zinc-700 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all backdrop-blur-sm cursor-pointer" aria-label="Desplazar tablero a la izquierda">
      <ChevronLeft class="w-6 h-6"/>
    </button>

    <button onclick={() => scrollBoard(1)} class="{isPanelOpen ? 'hidden' : 'hidden sm:flex'} absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/90 dark:bg-zinc-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 border border-slate-200 dark:border-zinc-700 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all backdrop-blur-sm cursor-pointer" aria-label="Desplazar tablero a la derecha">
      <ChevronRight class="w-6 h-6"/>
    </button>

    <!-- 🚀 KANBAN BOARD (Flujo Ininterrumpido 2026) -->
    <div class="transition-all duration-300 ease-out flex flex-col h-full overflow-hidden {isPanelOpen ? 'w-[360px] min-w-[360px] border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 hidden md:flex' : 'flex-1'} kanban-board px-4 sm:px-8 pb-6" bind:this={boardContainer}>
      <div class="flex gap-4 items-start h-full min-w-max xl:min-w-full">
        
        {#each columnas as columna}
          <div 
            class="{isPanelOpen ? 'w-[280px]' : 'w-[300px] xl:w-[340px]'} shrink-0 bg-white dark:bg-zinc-900 border {columna.border} rounded-2xl p-2.5 flex flex-col h-[calc(100vh-180px)] shadow-sm transition-colors duration-300"
            role="region"
            aria-label={`Columna ${columna.titulo}`}
            ondragover={permitirSoltar}
            ondrop={(e) => soltar(e, columna.id)}
          >
            <div class="sticky top-0 z-20 px-3 py-2.5 -mx-2.5 -mt-2.5 mb-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-t-xl border-b border-slate-200/60 dark:border-zinc-700/50 shadow-sm transition-colors duration-300">
              <div class="flex items-center justify-between mb-1.5">
                <h2 class="text-[10px] font-black uppercase tracking-widest {columna.text} flex items-center gap-1.5 drop-shadow-sm">
                  <span class="w-2 h-2 rounded-full {columna.dot} shadow-sm"></span>
                  {columna.titulo}
                </h2>
                <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 shadow-sm transition-colors">
                  {metricasColumnas[columna.id].count}
                </span>
              </div>
              
              {#if metricasColumnas[columna.id].comisionEstimada > 0 && !isPanelOpen}
                <div class="text-[9px] font-bold text-slate-500 dark:text-zinc-500 flex flex-col gap-0.5">
                  <span>Comisión est.: <span class="{columna.text} font-black">{formatMoney(metricasColumnas[columna.id].comisionEstimada)}</span></span>
                  <span class="text-slate-400 dark:text-zinc-600 font-normal">
                    · {metricasColumnas[columna.id].propiedadesCount} {metricasColumnas[columna.id].propiedadesCount === 1 ? 'propiedad en juego' : 'propiedades únicas'}
                  </span>
                </div>
              {:else}
                <div class="{isPanelOpen ? 'h-[0px]' : 'h-[26px]'}"></div> 
              {/if}
            </div>

            <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 pb-8 pt-1">
              {#each leadsPorColumna[columna.id] || [] as lead (lead.id)}
                
                <div 
                  draggable="true"
                  ondragstart={(e) => arrancar(e, lead.id)}
                  ondragend={terminar}
                  role="button"
                  tabindex="0"
                  aria-label={`Ver expediente de ${lead.nombre}`}
                  onclick={() => abrirPanel(lead)}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirPanel(lead); } }}
                  onmouseenter={() => hoveredLeadId = lead.id}
                  onmouseleave={() => hoveredLeadId = null}
                  class="bg-white dark:bg-zinc-800/50 p-3 rounded-xl border {selectedLeadId === lead.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : (lead.scoreObj?.isHot && lead.estado !== 'cerrado' && lead.estado !== 'descartado' ? 'border-orange-300 dark:border-orange-500/50 shadow-sm shadow-orange-500/10' : lead.has_pending_reminder ? 'border-rose-300 dark:border-rose-500/50 ring-1 ring-rose-500/50' : 'border-slate-200 dark:border-zinc-700')} cursor-grab hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none hover:border-slate-300 dark:hover:border-zinc-600 transition-all duration-200 relative flex flex-col gap-3"
                >
                  
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      
                      <div class="relative shrink-0">
                        <div class="w-8 h-8 rounded-full bg-slate-800 dark:bg-zinc-800 border border-slate-700 dark:border-zinc-700 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-inner">
                          {getInitials(lead.nombre)}
                        </div>
                        {#if lead.has_pending_reminder}
                          <div class="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full w-2.5 h-2.5 border-2 border-white dark:border-zinc-900 shadow-sm transition-colors"></div>
                        {/if}
                      </div>

                      <div class="min-w-0 flex flex-col">
                        <h3 class="text-sm font-bold text-slate-900 dark:text-zinc-100 leading-tight truncate">
                          {lead.nombre}
                        </h3>
                        <p class="text-[9px] {getUrgencyStyle(lead)} uppercase tracking-widest leading-none mt-1">
                          {timeAgoLabel(lead)}
                        </p>
                      </div>
                    </div>
                    
                    <div class="shrink-0">
                      {#if lead.scoreObj && lead.estado !== 'cerrado' && lead.estado !== 'descartado'}
                        <LeadScoreBadge scoreData={lead.scoreObj} />
                      {/if}
                    </div>
                  </div>

                  <div class="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-2 rounded-lg flex items-center gap-2.5 transition-colors">
                    <div class="w-9 h-9 rounded-md bg-slate-200 dark:bg-zinc-800 shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700 relative group-hover:border-slate-300 dark:group-hover:border-zinc-600 transition-colors">
                      {#if lead.propiedades?.imagen_url}
                        <img src={lead.propiedades.imagen_url} alt="Prop" class="w-full h-full object-cover">
                      {:else}
                        <div class="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 transition-colors"><Home class="w-4 h-4"/></div>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                      {#if lead.propiedades?.precio}
                        <p class="text-[11px] font-black text-emerald-700 dark:text-emerald-400 leading-none mb-1">{formatMoney(lead.propiedades.precio)}</p>
                      {/if}
                      <p class="text-[10px] font-bold text-slate-600 dark:text-zinc-400 truncate leading-tight" title={lead.propiedades?.titulo}>{lead.propiedades?.titulo || 'Inventario General'}</p>
                    </div>
                  </div>

                </div>
              {/each}

              {#if (leadsPorColumna[columna.id] || []).length === 0}
                <div class="flex-1 flex flex-col items-center justify-center border border-dashed {columna.border} rounded-xl bg-white/40 dark:bg-zinc-900/40 min-h-[80px] transition-colors">
                  <p class="text-[9px] font-bold uppercase tracking-widest {columna.text} opacity-40 text-center">Soltar Aquí</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- 🚀 OVERLAY DRAWER 2026: Flota a la derecha sin romper el Kanban -->
    {#if isPanelOpen && selectedLead}
      <div class="absolute inset-y-0 right-0 w-full md:w-[650px] bg-white dark:bg-zinc-950 shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.15)] dark:shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.5)] border-l border-slate-200 dark:border-zinc-800 z-50 flex flex-col animate-[slideInRight_0.3s_ease-out]">
        
        <!-- DRAWER HEADER (Sticky) -->
        <div class="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shrink-0">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shrink-0 border border-indigo-200 dark:border-indigo-500/30">
              {getInitials(selectedLead.nombre)}
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white leading-tight">{selectedLead.nombre}</h2>
              <div class="flex items-center gap-3 mt-1">
                <span class="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Phone class="w-3 h-3"/> {selectedLead.telefono || 'Sin teléfono'}</span>
                <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700"></span>
                <span class="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Mail class="w-3 h-3"/> {selectedLead.correo || 'Sin correo'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick={() => pedirEliminarLead(selectedLead)} class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-rose-500 transition-colors"><Trash2 class="w-4 h-4"/></button>
            <div class="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1"></div>
            <button onclick={cerrarPanel} class="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-sm"><X class="w-5 h-5"/></button>
          </div>
        </div>

        <!-- DRAWER BODY (Scrollable Timeline & Context) -->
        <div class="flex-1 overflow-y-auto hide-scrollbar bg-slate-50/50 dark:bg-zinc-950 p-6 flex flex-col gap-6">
          
          <!-- Contextual Bar: Acciones Directas & Propiedad -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
            <!-- Botonera Rápida -->
            <div class="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center gap-3">
              <a href="https://wa.me/{String(selectedLead.telefono || '').replace(/\D/g, '')}" target="_blank" class="w-full py-2.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors border border-[#25D366]/20 hover:border-[#25D366]">
                <MessageSquare class="w-4 h-4"/> Mensaje WhatsApp
              </a>
              <div class="flex gap-3">
                <a href="tel:{String(selectedLead.telefono || '').replace(/\D/g, '')}" class="flex-1 py-2 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors border border-indigo-100 dark:border-indigo-500/20">
                  <Phone class="w-3.5 h-3.5"/> Llamar
                </a>
                <a href="mailto:{selectedLead.correo || ''}" class="flex-1 py-2 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-800 text-slate-600 dark:text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-zinc-700">
                  <Mail class="w-3.5 h-3.5"/> Correo
                </a>
              </div>
            </div>

            <!-- Propiedad (Súper Compacta) -->
            {#if selectedLead.propiedades}
              <div class="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                <span class="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Home class="w-3 h-3"/> Interés Principal</span>
                <p class="text-sm font-bold text-slate-900 dark:text-white truncate mb-1">{selectedLead.propiedades.titulo}</p>
                <p class="text-base font-black text-emerald-600 dark:text-emerald-400 mb-2">{formatMoney(selectedLead.propiedades.precio)}</p>
                <div class="flex items-center gap-2">
                  <span class="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">{selectedLead.propiedades.operacion || 'Venta'}</span>
                  <a href="/admin/editar/{selectedLead.propiedades.id}" target="_blank" class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Ver ficha &rarr;</a>
                </div>
              </div>
            {/if}
          </div>

          <!-- Activity Timeline -->
          <div class="flex-1">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-4 px-2">Historial Operativo</h3>
            
            <div class="relative pl-4 space-y-6">
              <!-- Línea del tiempo -->
              <div class="absolute left-6 top-3 bottom-0 w-px bg-slate-200 dark:bg-zinc-800 pointer-events-none"></div>
              
              {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
                {#each selectedLead.lead_notas as nota}
                  <div class="flex gap-4 relative z-10">
                    <div class="w-5 h-5 rounded-full {nota.tipo === 'recordatorio' ? 'bg-amber-500 ring-4 ring-amber-50 dark:ring-amber-500/10' : 'bg-slate-400 dark:bg-zinc-600 ring-4 ring-white dark:ring-zinc-950'} flex items-center justify-center shrink-0 mt-0.5">
                      {#if nota.tipo === 'recordatorio'} <CalendarClock class="w-3 h-3 text-white"/> {:else} <Clock class="w-3 h-3 text-white"/> {/if}
                    </div>
                    <div class="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm group">
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-[10px] font-black uppercase tracking-widest {nota.tipo === 'recordatorio' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}">{nota.tipo === 'recordatorio' ? 'Tarea Programada' : 'Llamada / Nota'}</span>
                        <span class="text-[9px] font-bold text-slate-400 dark:text-zinc-500">{new Date(nota.creado_en || Date.now()).toLocaleString('es-MX', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p class="text-sm font-medium {nota.completado ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-800 dark:text-zinc-200'}">{nota.contenido}</p>
                      
                      {#if nota.tipo === 'recordatorio' && !nota.completado && !nota.id.startsWith('temp-')}
                        <div class="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/50">
                          <span class="text-[9px] font-bold {isOverdue(nota.fecha_recordatorio) ? 'text-rose-500' : 'text-slate-400 dark:text-zinc-500'} flex items-center gap-1"><Clock class="w-3 h-3"/> Para el: {formatDateTime(nota.fecha_recordatorio)}</span>
                          <button onclick={() => completarRecordatorio(nota.id)} class="text-[9px] font-black uppercase flex items-center gap-1 px-2 py-1 rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-200 transition-colors text-slate-500 shadow-sm"><CheckCircle2 class="w-3 h-3"/> Marcar Resuelto</button>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              {:else}
                <div class="pl-8 py-4 opacity-50 flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700"></div>
                  <p class="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Sin actividad registrada. Haz la primera jugada.</p>
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- 🚀 DRAWER FOOTER: Omnibox 2026 Integrado -->
        <div class="p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 shrink-0">
          <form method="POST" action="?/guardarNota" use:enhance={manejadorNota}>
            <input type="hidden" name="lead_id" value={selectedLead.id} />
            <div class="relative bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-inner overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              
              <textarea 
                name="contenido"
                bind:value={nuevaNotaTexto}
                onkeydown={handleKeyDown}
                placeholder="Registra una nota, programa una tarea o usa la IA Copiloto..."
                class="w-full bg-transparent px-4 py-3 text-sm font-medium text-slate-900 dark:text-white outline-none resize-none min-h-[50px] max-h-[150px] placeholder:text-slate-400"
              ></textarea>
              
              {#if esRecordatorio}
                <div class="px-4 pb-2 flex gap-2 animate-[fadeIn_0.2s_ease-out]">
                  <input type="date" lang="es-MX" bind:value={fechaRecordatorio} class="flex-1 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                  <input type="time" lang="es-MX" bind:value={horaRecordatorio} class="flex-1 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-1 text-xs font-bold text-slate-700 dark:text-zinc-200 outline-none shadow-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                </div>
              {/if}

              <div class="flex items-center justify-between px-3 pb-3 pt-1">
                <div class="flex items-center gap-2">
                  <!-- AI Copilot Button Embedded -->
                  <button type="button" 
                    onclick={async () => {
                        iaGenerandoWs = true;
                        try {
                            const formData = new FormData();
                            formData.append('lead_id', selectedLead.id);
                            const res = await postAction('generarScriptWhatsapp', formData);
                            if(res.data?.whatsapp) {
                                nuevaNotaTexto = res.data.whatsapp;
                                creditosIA = Math.max(0, creditosIA - 1);
                            }
                        } catch(e) {
                            alert(e.message);
                        } finally {
                            iaGenerandoWs = false;
                        }
                    }} 
                    disabled={iaGenerandoWs || creditosIA <= 0} 
                    class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors {iaGenerandoWs ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-sm disabled:opacity-50 disabled:grayscale'}">
                    {#if iaGenerandoWs}
                      <Loader2 class="w-3 h-3 animate-spin"/> IA Pensando...
                    {:else}
                      <Zap class="w-3 h-3"/> Copiloto AI ({creditosIA})
                    {/if}
                  </button>
                </div>
                
                <div class="flex items-center gap-2">
                  <button type="button" onclick={() => esRecordatorio = !esRecordatorio} class="px-3 py-1.5 rounded-lg {esRecordatorio ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/50' : 'bg-slate-200/50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'} hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                    <Calendar class="w-3 h-3"/> Tarea
                  </button>
                  <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50">
                    {#if guardandoNota}
                      <Loader2 class="w-4 h-4 animate-spin"/>
                    {:else}
                      <Send class="w-4 h-4"/>
                    {/if}
                  </button>
                </div>
              </div>
              
            </div>
          </form>
        </div>

      </div>
    {/if}
  </div>

  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4 transition-colors" role="presentation">
      <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-200 dark:border-zinc-800" role="dialog" aria-modal="true" tabindex="-1">
        <div class="p-8 border-b border-slate-100 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-500/10 text-center transition-colors">
          <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-zinc-900 shadow-sm transition-colors">
            <CheckCircle2 class="w-7 h-7 text-emerald-500 dark:text-emerald-400"/>
          </div>
          <h3 class="text-2xl font-black text-emerald-950 dark:text-emerald-100 tracking-tight">¡Cierre Exitoso!</h3>
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mt-1">Fin del Pipeline Operativo</p>
        </div>
        
        <div class="p-8 space-y-6 bg-white dark:bg-zinc-900 transition-colors">
          <p class="text-xs font-medium text-slate-500 dark:text-zinc-400 text-center leading-relaxed">Registra los datos financieros finales de la transacción para nutrir tu Dashboard de Inteligencia.</p>
          
          <div class="flex flex-col gap-2">
            <label for="precio-cierre-input" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest">Monto Final de Cierre</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-400 dark:text-zinc-500 font-black text-sm">MX$</span>
              <input id="precio-cierre-input" type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-3.5 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner transition-colors">
            </div>
          </div>
          
          <div class="flex flex-col gap-2">
            <label for="comision-cierre-input" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest">Comisión Pactada (%)</label>
            <div class="relative flex items-center">
              <input id="comision-cierre-input" type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl pl-4 pr-10 py-3.5 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right transition-colors">
              <span class="absolute right-4 text-slate-400 dark:text-zinc-500 font-black text-sm">%</span>
            </div>
          </div>
        </div>
        
        <div class="p-6 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-end gap-3 transition-colors">
          <button onclick={cancelarCierre} class="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-[10px] uppercase tracking-widest">Descartar Info</button>
          <button onclick={confirmarCierre} class="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95">
            Confirmar Ingreso
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showModalEliminar}
    <div class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4 transition-colors" role="presentation">
      <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out] border border-slate-200 dark:border-zinc-800" role="dialog" aria-modal="true" tabindex="-1">
        <div class="p-6 border-b border-slate-100 dark:border-zinc-800 bg-rose-50 dark:bg-rose-500/10 text-center transition-colors">
          <div class="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white dark:border-zinc-900 shadow-sm transition-colors">
            <AlertTriangle class="w-6 h-6 text-rose-500 dark:text-rose-400"/>
          </div>
          <h3 class="text-xl font-black text-rose-950 dark:text-rose-100">¿Eliminar prospecto?</h3>
        </div>
        
        <div class="p-6 bg-white dark:bg-zinc-900 transition-colors">
          <p class="text-xs font-medium text-slate-600 dark:text-zinc-400 text-center">
            Estás a punto de borrar permanentemente a <strong>{leadPorEliminar?.nombre}</strong>. Se perderá toda la bitácora y notas asociadas. Esta acción no se puede deshacer.
          </p>
        </div>
        
        <div class="p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-end gap-2.5 transition-colors">
          <button onclick={cancelarEliminar} class="px-5 py-2.5 rounded-lg font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-[10px] uppercase tracking-widest">Cancelar</button>
          <button onclick={confirmarEliminar} class="px-5 py-2.5 rounded-lg font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95">
            <Trash2 class="w-3.5 h-3.5"/> Eliminar
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showModalLeadManual}
    <div class="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-[130] flex items-center justify-center p-4 transition-colors" role="presentation">
      <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh] border border-slate-200 dark:border-zinc-800" role="dialog" aria-modal="true" tabindex="-1">
        <div class="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-between shrink-0 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
              <Users class="w-5 h-5 text-indigo-600 dark:text-indigo-400"/>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white">Nuevo Prospecto</h3>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mt-0.5">Ingreso Manual</p>
            </div>
          </div>
          <button onclick={() => showModalLeadManual = false} class="text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white p-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors" aria-label="Cerrar modal"><X class="w-5 h-5"/></button>
        </div>
        
        <div class="overflow-y-auto p-6 bg-white dark:bg-zinc-900 transition-colors">
          <form id="form-lead-manual" method="POST" action="?/crearLeadManual" use:enhance={manejadorLeadManual} class="space-y-4">
            <div>
              <label for="lead-nombre" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Nombre Completo <span class="text-rose-500 dark:text-rose-400">*</span></label>
              <input id="lead-nombre" type="text" name="nombre" required placeholder="Ej. Juan Pérez" class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-500">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="lead-telefono" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Teléfono / WhatsApp</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500"/>
                  <input id="lead-telefono" type="tel" name="telefono" placeholder="Opcional" class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-500">
                </div>
              </div>
              <div>
                <label for="lead-correo" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                <div class="relative">
                  <Mail class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-zinc-500"/>
                  <input id="lead-correo" type="email" name="correo" placeholder="Opcional" class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-500">
                </div>
              </div>
            </div>

            <div>
              <label for="lead-origen" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Canal de Origen</label>
              <select id="lead-origen" name="origen" class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors appearance-none">
                <option value="WhatsApp">Llegó por WhatsApp</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Recomendación">Recomendación</option>
                <option value="Redes Sociales">Redes Sociales (FB, IG)</option>
                <option value="Guardia / Rótulo">Vio rótulo en la calle</option>
                <option value="Manual" selected>Otro / Manual</option>
              </select>
            </div>

            <div>
              <label for="lead-propiedad" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">¿Le interesa una propiedad específica?</label>
              <select id="lead-propiedad" name="propiedad_id" class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors appearance-none">
                <option value="ninguna">Búsqueda General (No asignada)</option>
                {#each propiedadesOptions as prop}
                  <option value={prop.id}>{prop.titulo}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="lead-nota" class="block text-[10px] font-black text-slate-700 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Nota Inicial (Opcional)</label>
              <textarea id="lead-nota" name="nota_inicial" placeholder="Contexto: ¿Qué está buscando? Presupuesto, zonas..." class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors min-h-[80px] resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"></textarea>
            </div>
          </form>
        </div>
        
        <div class="p-5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-2.5 shrink-0 transition-colors">
          <button type="button" onclick={() => showModalLeadManual = false} class="px-5 py-2.5 rounded-lg font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-[10px] uppercase tracking-widest">Cancelar</button>
          <button type="submit" form="form-lead-manual" disabled={guardandoLeadManual} class="px-5 py-2.5 rounded-lg font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition-all text-[10px] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 min-w-[120px]">
            {#if guardandoLeadManual}
              <Loader2 class="w-4 h-4 animate-spin"/>
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
  .kanban-board::-webkit-scrollbar { height: 8px; width: 0px; }
  .kanban-board::-webkit-scrollbar-track { background: transparent; }
  .kanban-board::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .kanban-board::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  .kanban-board { cursor: grab; }
  .kanban-board:active { cursor: grabbing; }

  :global(.dark) .kanban-board::-webkit-scrollbar-thumb { background: #3f3f46; }
  :global(.dark) .kanban-board::-webkit-scrollbar-thumb:hover { background: #52525b; }

  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideInRight { 
    from { transform: translateX(100%); opacity: 0; } 
    to { transform: translateX(0); opacity: 1; } 
  }
</style>
