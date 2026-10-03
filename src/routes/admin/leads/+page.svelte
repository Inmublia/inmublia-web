<!-- src/routes/admin/leads/+page.svelte -->
<script>
  import { invalidateAll, goto } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { page } from '$app/state'; 
  import { untrack, onMount } from 'svelte';
  
  import { 
    Search, X, Phone, Mail, Home, Send, Trash2, Clock, UserCircle,
    GripVertical, MessageSquareQuote, BellRing, CalendarClock, CheckCircle2, MessageSquare,
    ChevronLeft, ChevronRight, AlertTriangle, Plus, Users, Flame, Sparkles, Loader2, ArrowRight,
    ArrowLeft, Building2, MoreHorizontal, Zap, Calendar
  } from 'lucide-svelte';
  
  import LeadScoreBadge from '$lib/components/LeadScoreBadge.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let propiedadesOptions = $derived(data.propiedades || []); 
  
  // 🚀 V6: Aislamiento por Tenant para Idempotencia de Red
  let effectiveBrokerId = $derived(broker.id);
  let REQUEST_KEY = $derived(`inmublia:ai:leads:request:${effectiveBrokerId || 'guest'}`);
  let iaRequestId = '';

  onMount(() => {
    if (effectiveBrokerId) {
      iaRequestId = sessionStorage.getItem(REQUEST_KEY) ?? '';
    }
  });

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
  
  // 🚀 Lógica de Tiempo Custom Inline Svelte 5
  let selectedHour = $state('10');
  let selectedMinute = $state('00');
  const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0'));
  let showTimePicker = $state(false);
  let horaSeleccionada = $derived(`${selectedHour}:${selectedMinute}`);
  
  let iaGenerandoWs = $state(false);
  let iaWsGenerado = $state('');
  let iaWsError = $state('');
  
  let creditosIA = $state(0);
  let showMenuContextual = $state(false);

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
    { id: 'nuevo', titulo: 'Nuevos Inicios', dot: 'bg-indigo-500', bgCol: 'bg-indigo-100 dark:bg-indigo-500/20', border: 'border-indigo-200 dark:border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-400' },
    { id: 'contactado', titulo: 'En Conversación', dot: 'bg-sky-500', bgCol: 'bg-sky-100 dark:bg-sky-500/20', border: 'border-sky-200 dark:border-sky-500/30', text: 'text-sky-700 dark:text-sky-400' },
    { id: 'visita', titulo: 'Recorridos Agendados', dot: 'bg-amber-500', bgCol: 'bg-amber-100 dark:bg-amber-500/20', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-400' },
    { id: 'negociacion', titulo: 'Ofertas / Negociación', dot: 'bg-purple-500', bgCol: 'bg-purple-100 dark:bg-purple-500/20', border: 'border-purple-200 dark:border-purple-500/30', text: 'text-purple-700 dark:text-purple-400' },
    { id: 'cerrado', titulo: 'Cierres Exitosos', dot: 'bg-emerald-500', bgCol: 'bg-emerald-100 dark:bg-emerald-500/20', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-slate-400', bgCol: 'bg-slate-100 dark:bg-zinc-800', border: 'border-slate-200 dark:border-zinc-700/50', text: 'text-slate-600 dark:text-zinc-400' }
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

  let leadColumna = $derived.by(() => {
    if (!selectedLead) return columnas[0];
    return columnas.find(c => c.id === selectedLead.estado) || columnas[0];
  });

  let infoVistaRapida = $derived.by(() => {
    if (!selectedLead || !selectedLead.lead_notas) return null;
    
    const tareasPendientes = selectedLead.lead_notas.filter(n => n.tipo === 'recordatorio' && !n.completado).sort((a,b) => new Date(a.fecha_recordatorio) - new Date(b.fecha_recordatorio));
    if (tareasPendientes.length > 0) {
      const urgente = tareasPendientes[0];
      const overdue = isOverdue(urgente.fecha_recordatorio);
      return { 
        tipo: 'tarea', 
        titulo: overdue ? 'TAREA ATRASADA' : 'PRÓXIMA TAREA', 
        texto: urgente.contenido, 
        fecha: formatDateTime(urgente.fecha_recordatorio),
        colorCinta: overdue ? 'bg-rose-500' : 'bg-amber-500',
        iconColor: overdue ? 'text-rose-500' : 'text-amber-500'
      };
    }
    
    if (selectedLead.lead_notas.length > 0) {
      const ultima = selectedLead.lead_notas[0];
      return {
        tipo: 'actividad', 
        titulo: 'ÚLTIMA INTERACCIÓN', 
        texto: ultima.contenido, 
        fecha: formatDateTime(ultima.creado_en),
        colorCinta: 'bg-slate-300 dark:bg-zinc-600',
        iconColor: 'text-slate-400'
      };
    }
    return null;
  });

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
    if (isPanelOpen) {
      document.body.classList.add('canvas-open');
    } else {
      document.body.classList.remove('canvas-open');
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
      const updatedNotas = (l.lead_notas || []).map(n => 
        n.id === notaId ? { ...n, completado: true } : n
      );
      const tienePendientes = updatedNotas.some(
        n => n.tipo === 'recordatorio' && !n.completado && new Date(n.fecha_recordatorio) <= now
      );
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
    isPanelOpen = true;
    showMenuContextual = false;
  }

  function cerrarPanel() {
    isPanelOpen = false;
    setTimeout(() => { 
      selectedLeadId = null; 
      nuevaNotaTexto = ''; 
      esRecordatorio = false; 
      fechaRecordatorio = ''; 
      selectedHour = '10';
      selectedMinute = '00';
      iaGenerandoWs = false; 
      iaWsGenerado = ''; 
      iaWsError = '';
      showMenuContextual = false;
      showTimePicker = false;
    }, 200);
  }

  function manejadorNota({ formData, cancel }) {
    const notaTemp = formData.get('contenido')?.trim();
    
    const textoAGuardar = iaWsGenerado && !notaTemp ? iaWsGenerado : notaTemp;
    
    if (!textoAGuardar || guardandoNota) { cancel(); return; }
    if (esRecordatorio && (!fechaRecordatorio || !selectedHour || !selectedMinute)) { alert("Selecciona fecha y hora para la tarea"); cancel(); return; }
    
    guardandoNota = true;
    let fechaFinalFormateada = null;
    if (esRecordatorio) {
      const [year, month, day] = fechaRecordatorio.split('-');
      fechaFinalFormateada = new Date(year, month - 1, day, selectedHour, selectedMinute).toISOString();
    }

    formData.set('contenido', textoAGuardar); 
    formData.append('is_recordatorio', esRecordatorio);
    if (esRecordatorio) formData.append('fecha_recordatorio', fechaFinalFormateada);
    
    const nowISO = new Date().toISOString();
    const nuevaNotaObj = { 
      id: 'temp-' + Date.now(), 
      contenido: textoAGuardar, 
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
        selectedHour = '10';
        selectedMinute = '00';
        iaWsGenerado = ''; 
        showTimePicker = false;
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
    showMenuContextual = false;
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
      if ((nuevaNotaTexto.trim() || iaWsGenerado.trim()) && submitBtn) submitBtn.click(); 
    }
  }

  function toggleTimePicker(e) {
    e.stopPropagation();
    showTimePicker = !showTimePicker;
  }
</script>

<svelte:window onclick={() => { if(showTimePicker) showTimePicker = false; }} />

<div class="fixed inset-0 bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative font-sans text-slate-900 dark:text-zinc-100 transition-colors duration-300">
  
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

    <!-- KANBAN BOARD -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden kanban-board px-4 sm:px-8 pb-6 {isPanelOpen ? 'hidden' : 'block'}" bind:this={boardContainer}>
      <div class="flex gap-4 items-start h-full min-w-max xl:min-w-full">
        
        {#each columnas as columna}
          <div 
            class="flex-1 min-w-[240px] xl:min-w-[220px] shrink-0 bg-white dark:bg-zinc-900 border {columna.border} rounded-2xl p-2.5 flex flex-col h-[calc(100vh-180px)] shadow-sm transition-colors duration-300"
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
              
              {#if metricasColumnas[columna.id].comisionEstimada > 0}
                <div class="text-[9px] font-bold text-slate-500 dark:text-zinc-500 flex flex-col gap-0.5">
                  <span>Comisión est.: <span class="{columna.text} font-black">{formatMoney(metricasColumnas[columna.id].comisionEstimada)}</span></span>
                  <span class="text-slate-400 dark:text-zinc-600 font-normal">
                    · {metricasColumnas[columna.id].propiedadesCount} {metricasColumnas[columna.id].propiedadesCount === 1 ? 'propiedad en juego' : 'propiedades únicas'}
                  </span>
                </div>
              {:else}
                <div class="h-[26px]"></div>
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
                  class="bg-white dark:bg-zinc-800/50 p-3 rounded-xl border {lead.scoreObj?.isHot && lead.estado !== 'cerrado' && lead.estado !== 'descartado' ? 'border-orange-300 dark:border-orange-500/50 shadow-sm shadow-orange-500/10' : lead.has_pending_reminder ? 'border-rose-300 dark:border-rose-500/50 ring-1 ring-rose-500/50' : 'border-slate-200 dark:border-zinc-700'} cursor-grab hover:-translate-y-1 hover:shadow-md dark:hover:shadow-none hover:border-slate-300 dark:hover:border-zinc-600 transition-all duration-200 relative flex flex-col gap-3"
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

                  {#if hoveredLeadId === lead.id}
                    <div class="absolute -top-3 -right-2 flex items-center gap-1.5 bg-white dark:bg-zinc-800 p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-zinc-700 z-30 animate-[fadeIn_0.1s_ease-out] transition-colors">
                      {#if lead.telefono}
                        <a href="https://wa.me/{String(lead.telefono).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-colors" aria-label={`Enviar mensaje de WhatsApp a ${lead.nombre}`} onclick={(e) => e.stopPropagation()}>
                          <MessageSquare class="w-4 h-4" />
                        </a>
                        <a href="tel:{String(lead.telefono).replace(/\D/g, '')}" class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-colors" aria-label={`Llamar por teléfono a ${lead.nombre}`} onclick={(e) => e.stopPropagation()}>
                          <Phone class="w-4 h-4" />
                        </a>
                      {/if}
                      <button onclick={(e) => { e.stopPropagation(); pedirEliminarLead(lead); }} class="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 dark:hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors" aria-label={`Eliminar prospecto ${lead.nombre}`}>
                        <Trash2 class="w-4 h-4"/>
                      </button>
                    </div>
                  {/if}

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

    <!-- CANVAS MODULAR (Vista Detalle Bimodal) -->
    {#if isPanelOpen && selectedLead}
      <div class="flex-1 w-full px-4 sm:px-8 pb-6 animate-[fadeIn_0.2s_ease-out] overflow-hidden">
          
          <div class="w-full h-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col p-4 sm:p-6 overflow-hidden border border-slate-200 dark:border-zinc-800 transition-colors">
              
              <!-- HEADER DE EXPEDIENTE -->
              <div class="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col xl:flex-row justify-between items-start xl:items-center shadow-sm shrink-0 gap-4 mb-5 transition-colors">
                  
                  <div class="flex items-start gap-4 min-w-0">
                      <button aria-label="Volver al pipeline" onclick={cerrarPanel} class="p-2 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-xl transition-colors border border-slate-200 dark:border-zinc-700 shrink-0 shadow-sm mt-1">
                          <ArrowLeft class="w-5 h-5" />
                      </button>
                      <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm transition-colors mt-0.5">
                          {getInitials(selectedLead.nombre)}
                      </div>
                      
                      <div class="min-w-0 flex flex-col justify-center">
                          <div class="flex items-center gap-3">
                              <h2 class="text-xl font-black text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[280px] leading-tight">
                                  {selectedLead.nombre}
                              </h2>
                              <select 
                                  aria-label="Cambiar etapa del prospecto"
                                  class="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest {leadColumna.bgCol} {leadColumna.text} border {leadColumna.border} cursor-pointer outline-none shadow-sm transition-colors appearance-none"
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
                          </div>
                          
                          <div class="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-zinc-400 mt-1 transition-colors">
                              {#if selectedLead.telefono}
                                <a href="tel:{String(selectedLead.telefono).replace(/\D/g, '')}" class="flex items-center gap-1 hover:text-indigo-600 transition-colors"><Phone class="w-3.5 h-3.5"/> {selectedLead.telefono}</a>
                              {/if}
                              {#if selectedLead.correo}
                                <span class="w-1 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full"></span>
                                <a href="mailto:{selectedLead.correo}" class="flex items-center gap-1 truncate max-w-[200px] hover:text-indigo-600 transition-colors"><Mail class="w-3.5 h-3.5"/> {selectedLead.correo}</a>
                              {/if}
                          </div>
                      </div>
                  </div>
                  
                  {#if infoVistaRapida}
                    <div class="hidden xl:flex flex-1 justify-center mx-4 animate-[fadeIn_0.3s_ease-out]">
                      <div class="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-5 py-4 flex flex-col justify-center relative overflow-hidden shadow-sm min-w-[280px] max-w-[360px]">
                        <div class="absolute left-0 top-0 bottom-0 w-1.5 {infoVistaRapida.colorCinta}"></div>
                        <div class="pl-2.5">
                          <div class="flex items-center justify-between mb-1.5">
                            <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"><Clock class="w-3.5 h-3.5 {infoVistaRapida.iconColor}"/> {infoVistaRapida.titulo}</span>
                            <span class="text-[10px] font-bold text-slate-400">{infoVistaRapida.fecha}</span>
                          </div>
                          <p class="text-[14px] font-bold text-slate-800 dark:text-zinc-200 truncate">{infoVistaRapida.texto}</p>
                        </div>
                      </div>
                    </div>
                  {/if}

                  <div class="flex items-start gap-2 w-full xl:w-auto shrink-0 justify-end mt-2 xl:mt-0 relative">
                      
                      <div class="flex flex-col items-end gap-1.5 w-[140px]">
                        <div class="w-full px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-md text-indigo-700 dark:text-indigo-400 text-[9px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                            <Sparkles class="w-3 h-3" /> {creditosIA} Créditos
                        </div>
                        
                        {#if selectedLead.telefono}
                          <a href="https://wa.me/{String(selectedLead.telefono).replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer" class="w-full px-4 py-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#25D366]/20">
                              <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                          </a>
                        {/if}
                      </div>

                      <div class="relative mt-1">
                        <button onclick={() => showMenuContextual = !showMenuContextual} class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-300 transition-colors">
                          <MoreHorizontal class="w-5 h-5"/>
                        </button>
                        {#if showMenuContextual}
                          <div class="absolute top-8 right-0 w-40 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-xl py-1 z-50 animate-[fadeIn_0.1s_ease-out]">
                            <button onclick={(e) => { e.stopPropagation(); pedirEliminarLead(selectedLead); }} class="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2"><Trash2 class="w-3.5 h-3.5"/> Eliminar Lead</button>
                          </div>
                        {/if}
                      </div>
                  </div>
              </div>

              <!-- SPLIT VIEW INTERNO -->
              <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-hidden">
                  
                  <!-- COLUMNA IZQUIERDA -->
                  <div class="md:col-span-5 flex flex-col gap-3 overflow-y-auto hide-scrollbar pb-4">
                      
                      <!-- 🚀 V6: SUGERENCIA IA CON IDEMPOTENCIA -->
                      <div class="bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl p-4 shadow-sm shrink-0 flex flex-col transition-colors">
                          <div class="flex items-center justify-between mb-3">
                              <span class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                  <Sparkles class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Inmublia AI
                              </span>
                              
                              <form id="form-whatsapp-ia" method="POST" action="?/generarScriptWhatsapp" use:enhance={({ formData, cancel }) => {
                                  if (iaGenerandoWs) return cancel();
                                  iaGenerandoWs = true; iaWsError = ''; iaWsGenerado = '';

                                  if (!iaRequestId) {
                                      iaRequestId = crypto.randomUUID();
                                      sessionStorage.setItem(REQUEST_KEY, iaRequestId);
                                  }
                                  formData.append('request_id', iaRequestId);

                                  return async ({ result, update }) => {
                                      iaGenerandoWs = false;
                                      
                                      if (result.type === 'success' && result.data?.whatsapp) {
                                          iaWsGenerado = result.data.whatsapp;
                                          creditosIA = Math.max(0, creditosIA - 1); 
                                          sessionStorage.removeItem(REQUEST_KEY);
                                          iaRequestId = '';
                                          await update({ reset: false });
                                          await invalidateAll();
                                      } else if (result.type === 'failure') {
                                          iaWsError = result.data?.error || 'No se pudo generar el script de IA.';
                                          const terminalStates = ['released', 'already_finalized', 'ineligible'];
                                          if (terminalStates.includes(result.data?.status) || result.data?.error?.includes('créditos') || result.data?.error?.includes('inactiva') || result.data?.error?.includes('corrupto')) {
                                             sessionStorage.removeItem(REQUEST_KEY);
                                             iaRequestId = ''; 
                                          }
                                      } else if (result.type === 'error') {
                                          iaWsError = 'Error de red. Reintenta (no se descontarán créditos adicionales).';
                                      }
                                  };
                              }}>
                                  <input type="hidden" name="lead_id" value={selectedLead.id}>
                                  <button type="submit" disabled={iaGenerandoWs || creditosIA <= 0} class="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:bg-slate-300 dark:disabled:bg-zinc-700 disabled:text-slate-500 dark:disabled:text-zinc-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 shadow-sm">
                                      {#if iaGenerandoWs}
                                          <Loader2 class="w-3 h-3 animate-spin"/> Generando...
                                      {:else}
                                          <Sparkles class="w-3 h-3"/> Autocompletar
                                      {/if}
                                  </button>
                              </form>
                          </div>

                          {#if iaWsError}
                              <div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs p-3 rounded-xl font-medium flex items-start gap-2 mb-3 shadow-sm transition-colors">
                                  <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400"/> {iaWsError}
                                  <button aria-label="Cerrar error" type="button" onclick={() => iaWsError = ''} class="ml-auto hover:text-rose-800 dark:hover:text-rose-300"><X class="w-3.5 h-3.5"/></button>
                              </div>
                          {/if}

                          <label for="ia_generado" class="sr-only">Texto generado por IA para WhatsApp</label>
                          <textarea 
                              id="ia_generado"
                              bind:value={iaWsGenerado}
                              placeholder="Presiona 'Autocompletar' y el Copiloto redactará el seguimiento ideal basado en el historial..."
                              class="w-full bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3.5 text-sm font-medium text-slate-800 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none min-h-[100px] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 shadow-inner"
                          ></textarea>
                          
                          {#if iaWsGenerado}
                              <div class="flex justify-end gap-2 mt-3 animate-[fadeIn_0.2s_ease-out]">
                                  <button type="button" onclick={() => iaWsGenerado = ''} class="px-2.5 py-1.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors shadow-sm">Descartar</button>
                                  <a href="https://wa.me/{String(selectedLead.telefono || '').replace(/\D/g, '')}?text={encodeURIComponent(iaWsGenerado)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 shadow-md shadow-[#25D366]/20">
                                      Enviar a WhatsApp
                                  </a>
                              </div>
                          {/if}
                      </div>

                      <!-- TERMOSTATO RADIAL -->
                      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm shrink-0 transition-colors">
                          <span class="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-4">Termostato del Lead</span>
                          
                          {#if selectedLead.scoreObj && selectedLead.estado !== 'cerrado' && selectedLead.estado !== 'descartado'}
                              <div class="flex items-center gap-5 mb-5">
                                  <div class="relative w-20 h-20 shrink-0">
                                      <svg class="w-full h-full" viewBox="0 0 100 100" style="transform: rotate(135deg);">
                                          <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="8" fill="transparent" class="text-slate-100 dark:text-zinc-800" stroke-dasharray="188.5 251.2" stroke-linecap="round" />
                                          <circle cx="50" cy="50" r="40" stroke="url(#score-gradient)" stroke-width="8" fill="transparent" stroke-dasharray="188.5 251.2" stroke-dashoffset={188.5 - (188.5 * selectedLead.scoreObj.score / 100)} stroke-linecap="round" class="transition-all duration-1000 ease-out" />
                                          <defs>
                                              <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                  <stop offset="0%" stop-color="#818cf8" />
                                                  <stop offset="100%" stop-color="#a78bfa" />
                                              </linearGradient>
                                          </defs>
                                      </svg>
                                      <div class="absolute inset-0 flex flex-col items-center justify-center pt-1">
                                          <span class="text-2xl font-black text-slate-800 dark:text-white leading-none">{selectedLead.scoreObj.score}</span>
                                      </div>
                                  </div>
                                  
                                  <div class="flex-1">
                                      <span class="text-[11px] font-black {selectedLead.scoreObj.isHot ? 'text-orange-500 dark:text-orange-400' : 'text-indigo-600 dark:text-indigo-400'} uppercase tracking-widest block mb-1">{selectedLead.scoreObj.etiqueta}</span>
                                      <p class="text-xs text-slate-600 dark:text-zinc-400 font-medium leading-snug">{selectedLead.scoreObj.razon}</p>
                                  </div>
                              </div>
                              
                              <div class="flex items-start gap-2 bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 transition-colors">
                                  <ArrowRight class="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5"/>
                                  <p class="text-[10px] text-indigo-800 dark:text-indigo-300 font-bold leading-snug">{selectedLead.scoreObj.accion}</p>
                              </div>
                          {:else}
                              <div class="flex items-center gap-5 mb-5">
                                  <div class="text-4xl font-black text-slate-300 dark:text-zinc-700 leading-none">--</div>
                              </div>
                          {/if}
                      </div>

                      <!-- TARJETA PROPIEDAD -->
                      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3.5 shadow-sm shrink-0 flex flex-col transition-colors">
                          <span class="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">Propiedad de Interés</span>
                          {#if selectedLead.propiedades}
                              <div class="flex items-center gap-4">
                                  <div class="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 shrink-0 bg-slate-100 dark:bg-zinc-800">
                                      {#if selectedLead.propiedades.imagen_url}
                                          <img src={selectedLead.propiedades.imagen_url} alt="Inmueble de interés" class="w-full h-full object-cover">
                                      {:else}
                                          <div class="w-full h-full flex items-center justify-center text-slate-400 dark:text-zinc-600"><Home class="w-5 h-5"/></div>
                                      {/if}
                                  </div>
                                  <div class="min-w-0 flex-1">
                                      <p class="text-[11px] font-bold text-slate-900 dark:text-white truncate">{selectedLead.propiedades.titulo}</p>
                                      <p class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{formatMoney(selectedLead.propiedades.precio)}</p>
                                      <a href="/admin/editar/{selectedLead.propiedades.id}" target="_blank" class="text-[8px] font-black text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 uppercase tracking-widest inline-block mt-1 hover:underline">Ficha Completa →</a>
                                  </div>
                              </div>
                          {:else}
                              <div class="p-2 bg-slate-50 dark:bg-zinc-800/50 shadow-sm rounded-lg border border-slate-100 dark:border-zinc-700 flex items-center gap-2 transition-colors">
                                  <div class="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-400 dark:text-zinc-500 shrink-0"><Building2 class="w-3 h-3"/></div>
                                  <p class="text-[9px] font-medium text-slate-500 dark:text-zinc-400">Búsqueda general. Sin anclaje.</p>
                              </div>
                          {/if}
                      </div>
                  </div>

                  <!-- COLUMNA DERECHA -->
                  <div class="md:col-span-7 flex flex-col gap-0 overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl transition-colors">
                      
                      <div class="p-4 border-b border-slate-100 dark:border-zinc-800 shrink-0 flex items-center gap-2">
                        <Clock class="w-4 h-4 text-indigo-500"/>
                        <span class="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest block">Registro de Seguimiento</span>
                      </div>

                      <div class="flex-1 overflow-y-auto p-5 hide-scrollbar relative">
                          <div class="absolute left-9 top-6 bottom-6 w-px bg-slate-100 dark:bg-zinc-800 pointer-events-none"></div>

                          {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
                              <div class="space-y-4 relative z-10">
                                  {#each selectedLead.lead_notas as nota}
                                      <div class="relative flex items-center gap-3">
                                          
                                          <div class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white dark:ring-zinc-900 shadow-sm {nota.tipo === 'recordatorio' ? (nota.completado ? 'bg-emerald-500' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-500' : 'bg-amber-400')) : 'bg-slate-400 dark:bg-zinc-600'}">
                                            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                                          </div>
                                          
                                          <div class="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl py-2 px-3.5 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors flex flex-row items-center gap-3 group">
                                              
                                              <span class="shrink-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded {nota.tipo === 'recordatorio' ? (nota.completado ? 'bg-emerald-50 text-emerald-600' : (isOverdue(nota.fecha_recordatorio) ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')) : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'}">
                                                  {nota.tipo === 'recordatorio' ? (nota.completado ? 'Tarea Completada' : 'Tarea Programada') : 'Nota'}
                                              </span>
                                              
                                              <p class="flex-1 text-[13px] font-medium {nota.completado ? 'text-slate-400 dark:text-zinc-500 line-through' : 'text-slate-700 dark:text-zinc-200'} truncate" title={nota.contenido}>
                                                  {nota.contenido}
                                              </p>
                                              
                                              <span class="shrink-0 text-[9px] font-bold text-slate-400 dark:text-zinc-500 ml-auto flex items-center gap-1.5">
                                                  {#if nota.tipo === 'recordatorio' && !nota.completado && !nota.id.startsWith('temp-')}
                                                    <span class="text-rose-500 flex items-center gap-1"><Clock class="w-3 h-3"/> Vence: {formatDateTime(nota.fecha_recordatorio)}</span>
                                                  {:else}
                                                    {new Date(nota.creado_en || Date.now()).toLocaleString('es-MX', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
                                                  {/if}
                                              </span>

                                              {#if nota.tipo === 'recordatorio' && !nota.completado && !nota.id.startsWith('temp-')}
                                                <button type="button" onclick={() => completarRecordatorio(nota.id)} class="shrink-0 ml-1 text-[9px] font-black uppercase flex items-center gap-1 px-1.5 py-1 rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors active:scale-95 text-slate-500 dark:text-zinc-400 shadow-sm" title="Marcar Resuelto">
                                                    <CheckCircle2 class="w-3 h-3"/>
                                                </button>
                                              {/if}

                                              {#if nota.id.startsWith('temp-')}
                                                <span class="shrink-0 ml-2 text-[9px] text-slate-400 flex items-center gap-1 font-bold">
                                                    <Loader2 class="w-3 h-3 animate-spin"/> Guardando...
                                                </span>
                                              {/if}
                                          </div>
                                      </div>
                                  {/each}
                              </div>
                          {:else}
                              <div class="flex flex-col items-center justify-center h-full text-center opacity-50 py-10">
                                  <MessageSquareQuote class="w-10 h-10 text-slate-300 dark:text-zinc-700 mb-2"/>
                                  <p class="text-xs font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Aún no hay actividad.</p>
                              </div>
                          {/if}
                      </div>

                      <!-- OMNIBOX INFERIOR -->
                      <div class="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 shrink-0 transition-colors overflow-visible">
                          <form method="POST" action="?/guardarNota" use:enhance={manejadorNota}>
                              <input type="hidden" name="lead_id" value={selectedLead.id} />

                              <div class="flex flex-wrap items-center gap-2 mb-2">
                                  <button type="button" onclick={() => esRecordatorio = false} class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 {!esRecordatorio ? 'bg-indigo-600 text-white shadow-sm border-indigo-600' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'} border">
                                      <MessageSquareQuote class="w-3 h-3"/> Minuta / Nota
                                  </button>
                                  <button type="button" onclick={() => esRecordatorio = true} class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1.5 {esRecordatorio ? 'bg-amber-500 text-white shadow-sm border-amber-500' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'} border">
                                      <CalendarClock class="w-3 h-3"/> Agendar Tarea
                                  </button>

                                  {#if esRecordatorio}
                                      <div class="h-4 w-px bg-slate-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>
                                      <div class="flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                                          <div class="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-sm focus-within:border-amber-500 transition-colors h-[28px] px-2.5 cursor-text">
                                            <input type="date" lang="es-MX" bind:value={fechaRecordatorio} class="bg-transparent text-[10px] font-bold text-slate-700 dark:text-zinc-200 outline-none cursor-pointer" required>
                                          </div>
                                          
                                          <div class="relative flex items-center">
                                            <button type="button" onclick={(e) => { e.stopPropagation(); showTimePicker = !showTimePicker; }} class="flex items-center justify-between gap-1.5 bg-white dark:bg-zinc-900 border {showTimePicker ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200 dark:border-zinc-700 hover:border-amber-400'} rounded-lg px-2.5 text-[10px] font-bold text-slate-700 dark:text-zinc-200 shadow-sm transition-all h-[28px] min-w-[75px] outline-none">
                                                {horaSeleccionada} <Clock class="w-3 h-3 text-amber-500"/>
                                            </button>
                                            
                                            {#if showTimePicker}
                                                <div class="absolute z-[100] bottom-full left-0 mb-2 w-44 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl shadow-2xl flex overflow-hidden animate-[fadeIn_0.15s_ease-out]" onclick={(e) => e.stopPropagation()}>
                                                    <div class="flex-1 h-40 overflow-y-auto hide-scrollbar border-r border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900/50">
                                                        <div class="sticky top-0 bg-slate-100/90 dark:bg-zinc-800/90 backdrop-blur-md text-center py-1.5 text-[9px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest z-10 border-b border-slate-200 dark:border-zinc-700">Hora</div>
                                                        <div class="p-1.5 space-y-0.5">
                                                            {#each hours as h}
                                                                <button type="button" onclick={() => selectedHour = h} class="w-full py-1.5 text-xs font-bold rounded-lg transition-all {selectedHour === h ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-500/10'}">{h}</button>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                    <div class="flex-1 h-40 overflow-y-auto hide-scrollbar bg-slate-50 dark:bg-zinc-900/50">
                                                        <div class="sticky top-0 bg-slate-100/90 dark:bg-zinc-800/90 backdrop-blur-md text-center py-1.5 text-[9px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest z-10 border-b border-slate-200 dark:border-zinc-700">Min</div>
                                                        <div class="p-1.5 space-y-0.5">
                                                            {#each minutes as m}
                                                                <button type="button" onclick={() => { selectedMinute = m; showTimePicker = false; }} class="w-full py-1.5 text-xs font-bold rounded-lg transition-all {selectedMinute === m ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-500/10'}">{m}</button>
                                                            {/each}
                                                        </div>
                                                    </div>
                                                </div>
                                            {/if}
                                          </div>
                                      </div>
                                  {/if}
                              </div>

                              <div class="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-sm focus-within:border-indigo-500 focus-within:ring-1 transition-colors flex flex-col">
                                  <div class="relative flex items-end gap-2 p-2">
                                      <textarea name="contenido" bind:value={nuevaNotaTexto} onkeydown={handleKeyDown} placeholder={esRecordatorio ? "Describe la tarea..." : "Escribe una nota..."} class="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 resize-none min-h-[40px] px-2 py-1 font-medium leading-snug" required></textarea>
                                      <button type="submit" bind:this={submitBtn} disabled={guardandoNota || (!nuevaNotaTexto.trim() && !iaWsGenerado.trim())} class="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg {esRecordatorio ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 dark:bg-white hover:bg-indigo-600 text-white dark:text-zinc-900'} shadow-sm transition-colors disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-zinc-800" aria-label="Guardar nota o recordatorio">
                                          {#if guardandoNota} <Loader2 class="w-4 h-4 animate-spin"/> {:else} <Send class="w-4 h-4"/> {/if}
                                      </button>
                                  </div>
                              </div>
                          </form>
                      </div>
                  </div>

              </div>
          </div>
      </div>
    {/if}
  </div>

  <!-- MODALES COMPLEMENTARIOS -->
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
  .kanban-board::-webkit-scrollbar { 
    height: 8px; 
    width: 0px; 
  }
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
