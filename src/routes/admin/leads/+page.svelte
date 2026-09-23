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
    ArrowLeft, Building2
  } from 'lucide-svelte';
  
  import LeadScoreBadge from '$lib/components/LeadScoreBadge.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let propiedadesOptions = $derived(data.propiedades || []); 
  
  let leads = $state(data.leads || []);
  let draggedLeadId = $state(null);
  
  let hoveredLeadId = $state(null);

  let selectedLeadId = $state(null);
  let isPanelOpen = $state(false);
  let selectedLead = $derived(leads.find(l => l.id === selectedLeadId) || null);

  let nuevaNotaTexto = $state('');
  let guardandoNota = $state(false);
  let submitBtn = $state(null);

  let esRecordatorio = $state(false);
  let fechaRecordatorio = $state('');
  let horaRecordatorio = $state(''); 
  
  let iaGenerandoWs = $state(false);
  let iaWsGenerado = $state('');
  let iaWsError = $state('');
  
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

  // 🚀 REDISEÑO 2026: Paleta oscura para las columnas
  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-indigo-400' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-sky-400' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-amber-400' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-purple-400' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-emerald-400' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-slate-500', bgCol: 'bg-slate-900/40', border: 'border-slate-800/60', text: 'text-slate-400' }
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
      const totalValor = leadsCol.reduce((sum, lead) => {
        return sum + (lead.propiedades?.precio || 0);
      }, 0);
      acc[col.id] = { count: leadsCol.length, totalValue: totalValor };
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
    if (result.type === 'error' || result.type === 'failure') {
      throw new Error(result.data?.error || 'Error interno del servidor');
    }
    return result;
  }

  $effect(() => {
    if (typeof document !== 'undefined') {
      if (isPanelOpen) {
        document.body.classList.add('canvas-open');
      } else {
        document.body.classList.remove('canvas-open');
      }
    }
  });

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
    if (data.broker) {
      untrack(() => {
        creditosIA = data.broker.ia_creditos_disponibles || 0;
      });
    }
  });

  let handledOpenId = null;
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

  // 🚀 REDISEÑO 2026: Ajuste de colores de urgencia para fondos oscuros
  function getUrgencyStyle(lead) {
    const fechaRef = lead.ultima_actividad || lead.actualizado_en || lead.creado_en;
    if (!fechaRef) return 'text-slate-500';
    const diffInDays = Math.floor((new Date() - new Date(fechaRef)) / (1000 * 60 * 60 * 24));
    
    if (lead.estado === 'nuevo' && diffInDays >= 1) return 'text-rose-400 font-black'; 
    if (lead.estado === 'negociacion' && diffInDays >= 3) return 'text-rose-400 font-black'; 
    if (diffInDays < 2) return 'text-emerald-400';
    if (diffInDays < 7) return 'text-slate-400'; 
    return 'text-rose-400 font-black'; 
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
      const updatedNotas = (l.lead_notas || []).map(n => 
        n.id === notaId ? { ...n, completado: true } : n
      );
      const tienePendientes = updatedNotas.some(
        n => n.tipo === 'recordatorio' && !n.completado && new Date(n.fecha_recordatorio) <= now
      );
      return {
        ...l,
        lead_notas: updatedNotas,
        has_pending_reminder: tienePendientes
      };
    });

    const formData = new FormData();
    formData.append('nota_id', notaId);
    try {
      await postAction('completarRecordatorio', formData);
      invalidateAll();
    } catch (err) { 
      console.error('Error al completar recordatorio:', err); 
    }
  }

  function abrirPanel(lead) {
    selectedLeadId = lead.id;
    isPanelOpen = true;
  }

  function cerrarPanel() {
    isPanelOpen = false;
    setTimeout(() => { 
      selectedLeadId = null; 
      nuevaNotaTexto = ''; 
      esRecordatorio = false; 
      fechaRecordatorio = ''; 
      horaRecordatorio = ''; 
      iaGenerandoWs = false; 
      iaWsGenerado = ''; 
      iaWsError = '';
    }, 200);
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
      id: 'temp-' + Date.now(), 
      contenido: notaTemp, 
      tipo: esRecordatorio ? 'recordatorio' : 'nota', 
      fecha_recordatorio: fechaFinalFormateada, 
      completado: false, 
      creado_en: nowISO 
    };
    
    leads = leads.map(l => {
      if (l.id === selectedLeadId) {
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
        nuevaNotaTexto = ''; 
        esRecordatorio = false; 
        fechaRecordatorio = ''; 
        horaRecordatorio = '';
        await update(); 
        await invalidateAll();
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
    if (selectedLeadId === id) cerrarPanel();
    cancelarEliminar();

    const formData = new FormData(); 
    formData.append('id', id);
    try {
      await postAction('eliminar', formData);
      invalidateAll();
    } catch (err) { 
      console.error('Error al eliminar lead:', err); 
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { 
      e.preventDefault(); 
      if (nuevaNotaTexto.trim() && submitBtn) submitBtn.click(); 
    }
  }
</script>

<!-- 🚀 REDISEÑO 2026: Fondo Global Oscuro Constante -->
<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-zinc-950 font-sans text-slate-200">
  
  {#if data.advertenciaPago}
    <div class="w-full bg-amber-500 text-amber-950 px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 z-50">
      <AlertTriangle class="w-4 h-4" /> Alerta de Facturación: Actualiza tu método de pago para evitar suspensión del servicio.
    </div>
  {/if}
  {#if data.errorConexion}
    <div class="w-full bg-rose-500 text-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 z-50">
      <AlertTriangle class="w-4 h-4" /> Intermitencia en el servidor. Trabajando en modo degradado temporal.
    </div>
  {/if}

  <header class="w-full bg-transparent text-white pt-8 pb-28 px-4 sm:px-8 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          Pipeline
          {#if totalRecordatoriosPendientes > 0}
            <span class="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md animate-pulse shadow-sm ring-1 ring-rose-500/50 flex items-center gap-1">
              <BellRing class="w-3 h-3"/> {totalRecordatoriosPendientes} Pendientes
            </span>
          {/if}
        </h1>
        <p class="text-sm font-medium text-slate-400 mt-1 flex items-center gap-2">
          <MessageSquareQuote class="w-4 h-4"/> Gestión de Prospectos CRM
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div class="relative w-full md:max-w-md hidden sm:block flex-1">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"/>
          <input type="text" bind:value={searchQuery} placeholder="Buscar cliente..." class="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner">
        </div>
        
        <button onclick={() => showModalLeadManual = true} class="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-colors bg-white text-zinc-950 hover:bg-slate-200 h-11 px-5 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 shrink-0">
          <Plus class="w-4 h-4"/> Nuevo Prospecto
        </button>
      </div>
    </div>
  </header>

  <!-- CONTENEDOR INTEGRADO -->
  <div class="relative flex-1 flex overflow-hidden z-20 -mt-16 w-full">
    
    <button onclick={() => scrollBoard(-1)} class="{isPanelOpen ? 'hidden' : 'hidden sm:flex'} absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-300 hover:text-white transition-all backdrop-blur-sm cursor-pointer" aria-label="Desplazar tablero a la izquierda">
      <ChevronLeft class="w-6 h-6"/>
    </button>

    <button onclick={() => scrollBoard(1)} class="{isPanelOpen ? 'hidden' : 'hidden sm:flex'} absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 shadow-xl w-10 h-10 rounded-full items-center justify-center text-slate-300 hover:text-white transition-all backdrop-blur-sm cursor-pointer" aria-label="Desplazar tablero a la derecha">
      <ChevronRight class="w-6 h-6"/>
    </button>

    <!-- KANBAN BOARD -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden kanban-board px-4 sm:px-8 pb-6 {isPanelOpen ? 'hidden' : 'block'}" bind:this={boardContainer}>
      <div class="flex gap-4 items-start h-full min-w-max xl:min-w-full">
        
        {#each columnas as columna}
          <div 
            class="flex-1 min-w-[240px] xl:min-w-[220px] shrink-0 {columna.bgCol} border {columna.border} rounded-2xl p-2.5 flex flex-col h-[calc(100vh-180px)] shadow-lg backdrop-blur-sm"
            ondragover={permitirSoltar}
            ondrop={(e) => soltar(e, columna.id)}
          >
            <!-- 🚀 REDISEÑO 2026: Cabecera de columna adaptada al fondo oscuro -->
            <div class="sticky top-0 z-20 pb-3 border-b border-slate-800 mb-2 pt-1">
              <div class="flex items-center justify-between mb-1.5">
                <h2 class="text-[10px] font-black uppercase tracking-widest {columna.text} flex items-center gap-1.5 drop-shadow-sm">
                  <span class="w-2 h-2 rounded-full {columna.dot} shadow-sm"></span>
                  {columna.titulo}
                </h2>
                <span class="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 shadow-sm">
                  {metricasColumnas[columna.id].count}
                </span>
              </div>
              
              {#if metricasColumnas[columna.id].totalValue > 0}
                <div class="text-[9px] font-bold text-slate-500">
                  Proyectado: <span class="{columna.text} font-black">{formatMoney(metricasColumnas[columna.id].totalValue)}</span>
                </div>
              {:else}
                <div class="h-3.5"></div>
              {/if}
            </div>

            <div class="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 pb-8 pt-1">
              {#each leadsPorColumna[columna.id] || [] as lead (lead.id)}
                
                <!-- 🚀 REDISEÑO 2026: Tarjetas Dark UI -->
                <div 
                  draggable="true"
                  ondragstart={(e) => arrancar(e, lead.id)}
                  ondragend={terminar}
                  role="button"
                  tabindex="0"
                  aria-label={`Ver expediente de ${lead.nombre}`}
                  onclick={() => abrirPanel(lead)}
                  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') abrirPanel(lead); }}
                  onmouseenter={() => hoveredLeadId = lead.id}
                  onmouseleave={() => hoveredLeadId = null}
                  class="bg-slate-900 p-3 rounded-xl border {lead.scoreObj?.isHot && lead.estado !== 'cerrado' && lead.estado !== 'descartado' ? 'border-orange-500/50 shadow-sm shadow-orange-500/10' : lead.has_pending_reminder ? 'border-rose-500/50 ring-1 ring-rose-500/50' : 'border-slate-800'} cursor-grab hover:-translate-y-1 hover:shadow-xl hover:border-slate-700 transition-all duration-200 relative flex flex-col gap-3"
                >
                  
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      
                      <div class="relative shrink-0">
                        <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-white flex items-center justify-center text-[10px] font-black uppercase shadow-inner">
                          {getInitials(lead.nombre)}
                        </div>
                        {#if lead.has_pending_reminder}
                          <div class="absolute -top-0.5 -right-0.5 bg-rose-500 rounded-full w-2.5 h-2.5 border-2 border-slate-900 shadow-sm"></div>
                        {/if}
                      </div>

                      <div class="min-w-0 flex flex-col">
                        <h3 class="text-sm font-bold text-slate-200 leading-tight truncate">
                          {lead.nombre}
                        </h3>
                        <p class="text-[9px] {getUrgencyStyle(lead)} uppercase tracking-widest leading-none mt-1">
                          {timeAgoLabel(lead)}
                        </p>
                      </div>
                    </div>
                    
                    <div class="shrink-0">
                      {#if lead.scoreObj && lead.estado !== 'cerrado' && lead.estado !== 'descartado'}
                        <div class="flex items-center gap-1 px-1.5 py-1 rounded-md {lead.scoreObj.score >= 75 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : lead.scoreObj.score >= 40 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}">
                          {#if lead.scoreObj.score >= 75}
                            <Flame class="w-3 h-3"/>
                          {:else if lead.scoreObj.score < 40}
                            <span class="text-[10px]">❄️</span>
                          {:else}
                            <Sparkles class="w-3 h-3"/>
                          {/if}
                          <span class="text-[10px] font-black">{lead.scoreObj.score}</span>
                        </div>
                      {/if}
                    </div>
                  </div>

                  <div class="bg-slate-950/50 border border-slate-800 p-2 rounded-lg flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-md bg-slate-800 shrink-0 overflow-hidden border border-slate-700 relative group-hover:border-slate-600 transition-colors">
                      {#if lead.propiedades?.imagen_url}
                        <img src={lead.propiedades.imagen_url} alt="Prop" class="w-full h-full object-cover">
                      {:else}
                        <div class="absolute inset-0 flex items-center justify-center text-slate-600"><Home class="w-4 h-4"/></div>
                      {/if}
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                      {#if lead.propiedades?.precio}
                        <p class="text-[11px] font-black text-emerald-400 leading-none mb-1">{formatMoney(lead.propiedades.precio)}</p>
                      {/if}
                      <p class="text-[10px] font-bold text-slate-400 truncate leading-tight" title={lead.propiedades?.titulo}>{lead.propiedades?.titulo || 'Inventario General'}</p>
                    </div>
                  </div>

                  <!-- ACCIONES RÁPIDAS EN HOVER (Adaptadas al tema oscuro) -->
                  {#if hoveredLeadId === lead.id}
                    <div class="absolute -top-3 -right-2 flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl shadow-xl border border-slate-700 z-30 animate-[fadeIn_0.1s_ease-out]">
                      {#if lead.telefono}
                        <a href="https://wa.me/{String(lead.telefono).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-colors" aria-label={`Enviar mensaje de WhatsApp a ${lead.nombre}`} onclick={(e) => e.stopPropagation()}>
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                        <a href="tel:{String(lead.telefono).replace(/\D/g, '')}" class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-colors" aria-label={`Llamar por teléfono a ${lead.nombre}`} onclick={(e) => e.stopPropagation()}>
                          <Phone class="w-4 h-4" />
                        </a>
                      {/if}
                      <button onclick={(e) => { e.stopPropagation(); pedirEliminarLead(lead); }} class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors" aria-label={`Eliminar prospecto ${lead.nombre}`}>
                        <Trash2 class="w-4 h-4"/>
                      </button>
                    </div>
                  {/if}

                </div>

              {/each}

              {#if (leadsPorColumna[columna.id] || []).length === 0}
                <div class="flex-1 flex flex-col items-center justify-center border border-dashed {columna.border} rounded-xl bg-slate-900/40 min-h-[80px]">
                  <p class="text-[9px] font-bold uppercase tracking-widest {columna.text} opacity-40 text-center">Soltar Aquí</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- CANVAS MODULAR CONFINADO (Integrado perfectamente al layout oscuro) -->
    {#if isPanelOpen && selectedLead}
      <div class="flex-1 w-full px-4 sm:px-8 pb-6 animate-[fadeIn_0.2s_ease-out] overflow-hidden">
          
          <div class="w-full h-full bg-slate-950 rounded-3xl shadow-2xl flex flex-col p-4 sm:p-6 overflow-hidden border border-slate-800">
              
              <!-- HEADER DE EXPEDIENTE -->
              <div class="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-lg shrink-0 gap-4 mb-5">
                  <div class="flex items-center gap-4 w-full sm:w-auto">
                      <button aria-label="Volver al pipeline" onclick={cerrarPanel} class="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 shrink-0">
                          <ArrowLeft class="w-5 h-5" />
                      </button>
                      <div class="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-bold text-indigo-400 shrink-0">
                          {getInitials(selectedLead.nombre)}
                      </div>
                      <div class="min-w-0 flex-1">
                          <h2 class="text-lg font-black text-white flex items-center gap-3 truncate">
                              {selectedLead.nombre}
                              <select 
                                  aria-label="Cambiar etapa del prospecto"
                                  class="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer outline-none hover:bg-slate-700 transition-all appearance-none"
                                  onchange={(e) => {
                                      if (e.target.value === 'cerrado') {
                                          leadPorCerrar = selectedLead;
                                          precioCierreFinal = selectedLead.propiedades?.precio || '';
                                          comisionCobrada = broker.comision_default || 5;
                                          showModalCierre = true;
                                      } else {
                                          actualizarEstadoLocalYBD(selectedLead.id, e.target.value);
                                      }
                                  }}
                              >
                                  {#each columnas as col}
                                      <option value={col.id} selected={selectedLead.estado === col.id}>{col.titulo}</option>
                                  {/each}
                              </select>
                          </h2>
                          <div class="flex items-center gap-4 text-xs font-medium text-slate-400 mt-1">
                              <span class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5"/> {selectedLead.telefono || 'Sin teléfono'}</span>
                              <span class="flex items-center gap-1.5 truncate max-w-[200px]" title={selectedLead.correo}><Mail class="w-3.5 h-3.5"/> {selectedLead.correo || 'Sin correo'}</span>
                          </div>
                      </div>
                  </div>
                  
                  <div class="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                      <button onclick={() => pedirEliminarLead(selectedLead)} class="px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-bold transition-colors border border-slate-700 hover:border-rose-500/30 flex items-center gap-2" aria-label="Eliminar prospecto">
                          <Trash2 class="w-4 h-4"/>
                      </button>
                      <div class="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 whitespace-nowrap">
                          <Sparkles class="w-4 h-4" /> {creditosIA} Créditos
                      </div>
                      <a href="https://wa.me/{String(selectedLead.telefono || '').replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg shadow-emerald-600/20">
                          <Send class="w-4 h-4"/> WhatsApp
                      </a>
                  </div>
              </div>

              <!-- SPLIT VIEW INTERNO -->
              <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                  
                  <!-- COLUMNA IZQUIERDA: TERMOSTATO + PROPIEDAD -->
                  <div class="md:col-span-5 flex flex-col gap-5 overflow-y-auto hide-scrollbar">
                      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col">
                          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Termostato del Lead</span>
                          
                          {#if selectedLead.scoreObj && selectedLead.estado !== 'cerrado' && selectedLead.estado !== 'descartado'}
                              <div class="flex items-end gap-3 mb-5">
                                  <div class="text-5xl font-black {selectedLead.scoreObj.isHot ? 'text-orange-400' : 'text-indigo-400'} leading-none">{selectedLead.scoreObj.score}</div>
                                  <div class="text-base text-slate-500 font-black mb-1">/100</div>
                              </div>
                              
                              <div class="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 mb-5">
                                  <span class="text-[9px] font-black {selectedLead.scoreObj.isHot ? 'text-orange-400' : 'text-indigo-400'} uppercase tracking-widest block mb-1.5">{selectedLead.scoreObj.etiqueta}</span>
                                  <p class="text-xs text-slate-300 font-medium leading-relaxed mb-2.5">{selectedLead.scoreObj.razon}</p>
                                  <div class="flex items-start gap-2 bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20">
                                      <ArrowRight class="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"/>
                                      <p class="text-[11px] text-indigo-200 font-bold leading-snug">{selectedLead.scoreObj.accion}</p>
                                  </div>
                              </div>
                          {:else}
                              <div class="text-5xl font-black text-slate-600 leading-none mb-5">--<span class="text-base text-slate-700">/100</span></div>
                          {/if}

                          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5 border-t border-slate-800 pt-5">Propiedad Anclada</span>
                          {#if selectedLead.propiedades}
                              <div class="rounded-xl overflow-hidden border border-slate-800 relative aspect-video group">
                                  {#if selectedLead.propiedades.imagen_url}
                                      <img src={selectedLead.propiedades.imagen_url} alt="Inmueble de interés" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                                  {:else}
                                      <div class="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600"><Home class="w-8 h-8"/></div>
                                  {/if}
                                  <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none"></div>
                                  <div class="absolute bottom-3 left-3 right-3">
                                      <p class="text-sm font-bold text-white truncate drop-shadow-md">{selectedLead.propiedades.titulo}</p>
                                      <p class="text-[10px] font-black text-emerald-400 mt-0.5 uppercase tracking-widest drop-shadow-md">{formatMoney(selectedLead.propiedades.precio)} MXN</p>
                                  </div>
                              </div>
                          {:else}
                              <div class="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center gap-3">
                                  <div class="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0"><Building2 class="w-4 h-4"/></div>
                                  <p class="text-xs font-medium text-slate-400">Búsqueda general. Sin anclaje.</p>
                              </div>
                          {/if}
                      </div>
                  </div>

                  <!-- COLUMNA DERECHA: COPILOTO IA + REGISTRO -->
                  <div class="md:col-span-7 flex flex-col gap-5 overflow-hidden">
                      
                      <div class="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 shadow-lg shrink-0 flex flex-col">
                          <div class="flex items-center justify-between mb-3">
                              <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                  ⚡ Sugerencia Inmublia AI
                              </span>
                              
                              <form id="form-whatsapp-ia" method="POST" action="?/generarScriptWhatsapp" use:enhance={() => {
                                  iaGenerandoWs = true; iaWsError = ''; iaWsGenerado = '';
                                  return async ({ result, update }) => {
                                      iaGenerandoWs = false;
                                      if (result.type === 'success' && result.data?.whatsapp) {
                                          iaWsGenerado = result.data.whatsapp;
                                          creditosIA = Math.max(0, creditosIA - 1); 
                                          await update({ reset: false });
                                          await invalidateAll();
                                      } else if (result.type === 'failure') {
                                          iaWsError = result.data?.error || 'No se pudo generar el script de IA.';
                                      }
                                  };
                              }}>
                                  <input type="hidden" name="lead_id" value={selectedLead.id}>
                                  <button type="submit" disabled={iaGenerandoWs || creditosIA <= 0} class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5">
                                      {#if iaGenerandoWs}
                                          <Loader2 class="w-3.5 h-3.5 animate-spin"/> Generando...
                                      {:else}
                                          <Sparkles class="w-3.5 h-3.5"/> Autocompletar
                                      {/if}
                                  </button>
                              </form>
                          </div>

                          {#if iaWsError}
                              <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl font-medium flex items-start gap-2 mb-3">
                                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5"/> {iaWsError}
                                  <button onclick={() => iaWsError = ''} class="ml-auto hover:text-rose-300"><X class="w-3.5 h-3.5"/></button>
                              </div>
                          {/if}

                          <textarea 
                              bind:value={iaWsGenerado}
                              placeholder="Presiona 'Autocompletar' y el Copiloto redactará el seguimiento ideal basado en el historial..."
                              class="w-full bg-slate-900/50 border border-indigo-500/20 rounded-xl p-3.5 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all resize-none min-h-[70px] outline-none placeholder:text-slate-600"
                          ></textarea>
                          
                          {#if iaWsGenerado}
                              <div class="flex justify-end gap-2 mt-3 animate-[fadeIn_0.2s_ease-out]">
                                  <button onclick={() => iaWsGenerado = ''} class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">Descartar</button>
                                  <a href="https://wa.me/{String(selectedLead.telefono || '').replace(/\D/g, '')}?text={encodeURIComponent(iaWsGenerado)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5">
                                      <Send class="w-3.5 h-3.5"/> Enviar WhatsApp
                                  </a>
                              </div>
                          {/if}
                      </div>

                      <!-- REGISTRO OPERATIVO Y BITÁCORA -->
                      <div class="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                          
                          <div class="p-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
                              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Registro Operativo</span>
                              <form method="POST" action="?/guardarNota" use:enhance={manejadorNota} class="flex flex-col gap-2.5">
                                  <input type="hidden" name="lead_id" value={selectedLead.id} />
                                  
                                  <div class="flex gap-2 mb-0.5">
                                      <button type="button" onclick={() => esRecordatorio = false} class="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {!esRecordatorio ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'} border border-slate-700">
                                          <MessageSquareQuote class="w-3 h-3"/> Minuta
                                      </button>
                                      <button type="button" onclick={() => esRecordatorio = true} class="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 {esRecordatorio ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'} border border-slate-700">
                                          <CalendarClock class="w-3 h-3"/> Tarea / Cita
                                      </button>
                                  </div>

                                  {#if esRecordatorio}
                                      <div class="flex gap-2.5 animate-[fadeIn_0.2s_ease-out]">
                                          <input type="date" lang="es-MX" bind:value={fechaRecordatorio} class="flex-1 bg-slate-950 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-amber-500/50 outline-none">
                                          <input type="time" lang="es-MX" bind:value={horaRecordatorio} class="flex-1 bg-slate-950 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-200 focus:ring-2 focus:ring-amber-500/50 outline-none">
                                      </div>
                                  {/if}

                                  <div class="relative flex items-end gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                                      <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Describe la acción o fecha a agendar..." : "Registra una llamada o minuta rápida..."} class="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-600 resize-none min-h-[38px] px-2 py-1 font-medium" required></textarea>
                                      <button type="submit" bind:this={submitBtn} disabled={guardandoNota || !nuevaNotaTexto.trim()} class="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg {esRecordatorio ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' : 'bg-indigo-600 hover:bg-indigo-500 text-white'} transition-colors disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-600" aria-label="Guardar nota o recordatorio">
                                          {#if guardandoNota}
                                              <Loader2 class="w-4 h-4 animate-spin"/>
                                          {:else}
                                              <ArrowRight class="w-4 h-4"/>
                                          {/if}
                                      </button>
                                  </div>
                              </form>
                          </div>

                          <!-- TIMELINE -->
                          <div class="flex-1 overflow-y-auto p-5 hide-scrollbar">
                              {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
                                  <div class="space-y-5 relative before:absolute before:inset-0 before:ml-[15px] before:h-full before:w-px before:bg-slate-800">
                                      {#each selectedLead.lead_notas as nota}
                                          <div class="relative flex items-start gap-4">
                                              
                                              <div class="absolute left-0 w-[30px] h-[30px] rounded-full border-[2.5px] border-slate-900/80 flex items-center justify-center z-10 shadow-sm {nota.tipo === 'recordatorio' ? (nota.completado ? 'bg-slate-800' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500/20 border-rose-500/40' : 'bg-amber-500/20 border-amber-500/40')) : 'bg-slate-800 border-slate-700'}">
                                                  {#if nota.tipo === 'recordatorio'}
                                                      <CalendarClock class="w-3.5 h-3.5 {nota.completado ? 'text-slate-500' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-400' : 'text-amber-400')}"/>
                                                  {:else}
                                                      <MessageSquareQuote class="w-3.5 h-3.5 text-slate-400"/>
                                                  {/if}
                                              </div>
                                              
                                              <div class="ml-11 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 shadow-sm w-full transition-colors hover:border-slate-700">
                                                  <div class="flex justify-between items-center mb-2">
                                                      <span class="text-[9px] font-black uppercase tracking-widest {nota.tipo === 'recordatorio' ? (nota.completado ? 'text-slate-500' : (isOverdue(nota.fecha_recordatorio) ? 'text-rose-400' : 'text-amber-400')) : 'text-slate-500'}">
                                                          {nota.tipo === 'recordatorio' ? (nota.completado ? 'Tarea Completada' : 'Recordatorio Programado') : 'Nota Interna'}
                                                      </span>
                                                      <span class="text-[9px] font-bold text-slate-500">
                                                          {nota.tipo === 'recordatorio' && !nota.completado ? formatDateTime(nota.fecha_recordatorio) : formatDateTime(nota.creado_en)}
                                                      </span>
                                                  </div>
                                                  <p class="text-sm text-slate-300 font-medium whitespace-pre-wrap leading-relaxed {nota.completado ? 'line-through opacity-50' : ''}">{nota.contenido}</p>
                                                  
                                                  {#if nota.tipo === 'recordatorio' && !nota.completado && !nota.id.startsWith('temp-')}
                                                      <div class="flex justify-end pt-2.5 mt-2.5 border-t border-slate-800/50">
                                                          <button onclick={() => completarRecordatorio(nota.id)} class="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors active:scale-95 text-slate-400">
                                                              <CheckCircle2 class="w-3 h-3"/> Marcar como Resuelto
                                                          </button>
                                                      </div>
                                                  {/if}
                                              </div>
                                          </div>
                                      {/each}
                                  </div>
                              {:else}
                                  <div class="flex flex-col items-center justify-center h-full text-center opacity-50">
                                      <Clock class="w-9 h-9 text-slate-600 mb-2"/>
                                      <p class="text-xs font-bold text-slate-400">Aún no hay actividad.</p>
                                      <p class="text-[10px] text-slate-500 mt-0.5">Registra la primera interacción en el formulario superior.</p>
                                  </div>
                              {/if}
                          </div>
                      </div>

                  </div>
              </div>
          </div>
      </div>
    {/if}
  </div>

  <!-- MODALES DE NEGOCIO -->
  {#if showModalCierre}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-8 border-b border-slate-100 bg-emerald-50 text-center">
          <div class="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
            <CheckCircle2 class="w-7 h-7 text-emerald-500"/>
          </div>
          <h3 class="text-2xl font-black text-emerald-950 tracking-tight">¡Cierre Exitoso!</h3>
          <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 mt-1">Fin del Pipeline Operativo</p>
        </div>
        
        <div class="p-8 space-y-6 bg-white">
          <p class="text-xs font-medium text-slate-500 text-center leading-relaxed">Registra los datos financieros finales de la transacción para nutrir tu Dashboard de Inteligencia.</p>
          
          <div class="flex flex-col gap-2">
            <label for="precio-cierre-input" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest">Monto Final de Cierre</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-400 font-black text-sm">MX$</span>
              <input id="precio-cierre-input" type="number" bind:value={precioCierreFinal} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner transition-colors">
            </div>
          </div>
          
          <div class="flex flex-col gap-2">
            <label for="comision-cierre-input" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest">Comisión Pactada (%)</label>
            <div class="relative flex items-center">
              <input id="comision-cierre-input" type="number" step="0.1" bind:value={comisionCobrada} class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3.5 text-lg font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-inner text-right transition-colors">
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
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div class="p-6 border-b border-slate-100 bg-rose-50 text-center">
          <div class="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white shadow-sm">
            <AlertTriangle class="w-6 h-6 text-rose-500"/>
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
            <Trash2 class="w-3.5 h-3.5"/> Eliminar
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showModalLeadManual}
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-4" onclick={() => showModalLeadManual = false} role="presentation">
      <div class="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.4)] w-full max-w-lg overflow-hidden animate-[fadeIn_0.2s_ease-out] flex flex-col max-h-[90vh]" onclick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div class="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200">
              <Users class="w-5 h-5 text-indigo-600"/>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">Nuevo Prospecto</h3>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Ingreso Manual</p>
            </div>
          </div>
          <button onclick={() => showModalLeadManual = false} class="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Cerrar modal"><X class="w-5 h-5"/></button>
        </div>
        
        <div class="overflow-y-auto p-6 bg-white">
          <form id="form-lead-manual" method="POST" action="?/crearLeadManual" use:enhance={manejadorLeadManual} class="space-y-4">
            <div>
              <label for="lead-nombre" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Nombre Completo <span class="text-rose-500">*</span></label>
              <input id="lead-nombre" type="text" name="nombre" required placeholder="Ej. Juan Pérez" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="lead-telefono" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Teléfono / WhatsApp</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                  <input id="lead-telefono" type="tel" name="telefono" placeholder="Opcional" class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                </div>
              </div>
              <div>
                <label for="lead-correo" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                <div class="relative">
                  <Mail class="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                  <input id="lead-correo" type="email" name="correo" placeholder="Opcional" class="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                </div>
              </div>
            </div>

            <div>
              <label for="lead-origen" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Canal de Origen</label>
              <select id="lead-origen" name="origen" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                <option value="WhatsApp">Llegó por WhatsApp</option>
                <option value="Llamada">Llamada Telefónica</option>
                <option value="Recomendación">Recomendación</option>
                <option value="Redes Sociales">Redes Sociales (FB, IG)</option>
                <option value="Guardia / Rótulo">Vio rótulo en la calle</option>
                <option value="Manual" selected>Otro / Manual</option>
              </select>
            </div>

            <div>
              <label for="lead-propiedad" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">¿Le interesa una propiedad específica?</label>
              <select id="lead-propiedad" name="propiedad_id" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors">
                <option value="ninguna">Búsqueda General (No asignada)</option>
                {#each propiedadesOptions as prop}
                  <option value={prop.id}>{prop.titulo}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="lead-nota" class="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Nota Inicial (Opcional)</label>
              <textarea id="lead-nota" name="nota_inicial" placeholder="Contexto: ¿Qué está buscando? Presupuesto, zonas..." class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors min-h-[80px] resize-none"></textarea>
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

  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
