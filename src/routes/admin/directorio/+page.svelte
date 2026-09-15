<!-- src/routes/admin/directorio/+page.svelte -->
<script>
  import { 
    Users, Target, Sparkles, MessageSquareQuote, 
    Search, MapPin, BadgeDollarSign, ArrowRight, Zap,
    Download, Activity, BarChart3, Clock, Building,
    Mail, EyeOff, Eye, AlertCircle
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let searchQuery = $state('');
  let mostrarDescartados = $state(false); 

  // -------------------------------------------------------------
  // LÓGICA DE KPIS (TARJETAS SUPERIORES)
  // -------------------------------------------------------------
  let metricasMes = $derived.by(() => {
    const ahora = new Date();
    const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    
    let leadsEsteMes = 0;
    let leadsMesPasado = 0;

    leads.forEach(l => {
      const fecha = new Date(l.creado_en);
      if (fecha >= inicioEsteMes) leadsEsteMes++;
      else if (fecha >= inicioMesPasado && fecha < inicioEsteMes) leadsMesPasado++;
    });

    let crecimiento = 0;
    if (leadsMesPasado > 0) {
      crecimiento = ((leadsEsteMes - leadsMesPasado) / leadsMesPasado) * 100;
    } else if (leadsEsteMes > 0) {
      crecimiento = 100; 
    }

    return {
      total: leadsEsteMes,
      crecimiento: crecimiento.toFixed(0),
      esPositivo: crecimiento >= 0
    };
  });

  let leadsEnNegociacion = $derived.by(() => {
    const ahora = new Date();
    const haceUnaSemana = new Date(ahora.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    let total = 0;
    let nuevosSemana = 0;

    leads.forEach(l => {
      if (l.estado === 'negociacion') {
        total++;
        if (new Date(l.creado_en) >= haceUnaSemana) nuevosSemana++;
      }
    });

    return { total, nuevosSemana };
  });

  // FIX LÓGICO: Usar actualizado_en para reiniciar el reloj con cada nota/cambio
  let leadsSinSeguimiento = $derived.by(() => {
    const abandonados = leads.filter(l => {
      if (['cerrado', 'descartado'].includes(l.estado)) return false;
      const ultimaActividad = l.actualizado_en ? new Date(l.actualizado_en) : new Date(l.creado_en);
      const dias = Math.floor((new Date() - ultimaActividad) / (1000 * 60 * 60 * 24));
      return dias >= 3;
    });
    return abandonados.sort((a, b) => {
      const fechaA = a.actualizado_en ? new Date(a.actualizado_en) : new Date(a.creado_en);
      const fechaB = b.actualizado_en ? new Date(b.actualizado_en) : new Date(b.creado_en);
      return fechaA - fechaB; // Los más antiguos arriba
    });
  });

  let tasaConversion = $derived.by(() => {
    const total = leads.length;
    if (total === 0) return { actual: 0, delta: 0 };
    
    const ganados = leads.filter(l => l.estado === 'cerrado').length;
    return {
      actual: ((ganados / total) * 100).toFixed(1),
      delta: 0 
    };
  });

  // -------------------------------------------------------------
  // MATCHMAKING ENGINE V2 (PONDERACIÓN INTELIGENTE)
  // -------------------------------------------------------------
  let clientesInteligentes = $derived.by(() => {
    let mapa = {};
    
    leads.forEach(l => {
      if (!mapa[l.correo]) {
        mapa[l.correo] = {
          nombre: l.nombre,
          correo: l.correo,
          telefono: l.telefono,
          estado: (l.estado || 'nuevo').toLowerCase(),
          fuente: l.fuente || l.origen || 'Directo',   
          fecha_contacto: l.actualizado_en || l.creado_en || new Date().toISOString(), 
          interesesHistorial: [],
          presupuestoInferido: 0,
          perfil: null,
          matches: []
        };
      }
      
      const fechaLeadActual = new Date(l.actualizado_en || l.creado_en);
      const fechaMapa = new Date(mapa[l.correo].fecha_contacto);
      if (fechaLeadActual > fechaMapa) {
        mapa[l.correo].fecha_contacto = fechaLeadActual.toISOString();
        mapa[l.correo].estado = (l.estado || 'nuevo').toLowerCase();
      }

      if (l.propiedades) {
        if (!mapa[l.correo].interesesHistorial.find(i => i.id === l.propiedades.id)) {
          const propFull = propiedades.find(p => p.id === l.propiedades.id) || l.propiedades;
          mapa[l.correo].interesesHistorial.push(propFull);
        }
      }
    });

    return Object.values(mapa).map(cliente => {
      if (cliente.interesesHistorial.length > 0) {
        const conteoOperacion = {};
        const conteoTipo = {};
        let sumaPrecio = 0;
        let sumaRecamaras = 0;

        cliente.interesesHistorial.forEach(p => {
          sumaPrecio += Number(p.precio) || 0;
          sumaRecamaras += Number(p.recamaras) || 0;
          
          const op = p.operacion || 'Venta';
          const tp = p.tipo || 'Casa';
          conteoOperacion[op] = (conteoOperacion[op] || 0) + 1;
          conteoTipo[tp] = (conteoTipo[tp] || 0) + 1;
        });

        cliente.presupuestoInferido = sumaPrecio / cliente.interesesHistorial.length;
        const recamarasPromedio = Math.round(sumaRecamaras / cliente.interesesHistorial.length);
        
        const operacionDominante = Object.keys(conteoOperacion).reduce((a, b) => conteoOperacion[a] > conteoOperacion[b] ? a : b);
        const tipoDominante = Object.keys(conteoTipo).reduce((a, b) => conteoTipo[a] > conteoTipo[b] ? a : b);

        cliente.perfil = { operacionDominante, tipoDominante, recamarasPromedio };

        let matchesPuntuados = [];

        propiedades.forEach(p => {
          if (cliente.interesesHistorial.find(i => i.id === p.id)) return;
          if (p.operacion !== operacionDominante) return;

          let score = 0;
          const diffPrecio = Math.abs(p.precio - cliente.presupuestoInferido) / cliente.presupuestoInferido;
          if (diffPrecio <= 0.15) score += 50;      
          else if (diffPrecio <= 0.30) score += 25; 
          else return; 

          if (p.tipo === tipoDominante) score += 25;

          const pRec = Number(p.recamaras) || 0;
          if (pRec >= recamarasPromedio) score += 25;
          else if (pRec === recamarasPromedio - 1) score += 10;

          if (score >= 60) {
            matchesPuntuados.push({ ...p, matchScore: score });
          }
        });

        cliente.matches = matchesPuntuados.sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          return Math.abs(a.precio - cliente.presupuestoInferido) - Math.abs(b.precio - cliente.presupuestoInferido);
        });
      }
      return cliente;
    })
    .filter(c => mostrarDescartados || c.estado !== 'descartado')
    .filter(c => c.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || c.correo?.toLowerCase().includes(searchQuery.toLowerCase()) || c.telefono?.includes(searchQuery))
    .sort((a, b) => new Date(b.fecha_contacto) - new Date(a.fecha_contacto)); 
  });

  let totalMatches = $derived(clientesInteligentes.reduce((acc, c) => acc + c.matches.length, 0));
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  function getEstadoStyle(estado) {
    if (estado === 'nuevo') return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    if (estado === 'contactado') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
    if (estado === 'visita' || estado === 'visita agendada') return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    if (estado === 'negociacion' || estado === 'negociación') return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    if (estado === 'cerrado') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    if (estado === 'descartado') return { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' };
    return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
  }

  function formatearFechaRelativa(fechaIso) {
    if (!fechaIso) return 'Sin fecha';
    const fecha = new Date(fechaIso);
    const hoy = new Date();
    const diffMs = hoy - fecha;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const horaStr = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

    if (diffDias === 0 && hoy.getDate() === fecha.getDate()) return `Hoy ${horaStr}`;
    if (diffDias === 1 || (diffDias === 0 && hoy.getDate() !== fecha.getDate())) return `Ayer ${horaStr}`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function enviarWhatsApp(telefono, cliente, propiedadMatch) {
    if (!telefono) {
      alert("Este prospecto no tiene un número de WhatsApp registrado.");
      return;
    }

    const nombreLead = cliente?.split(' ')[0] || 'inversor';
    const nombreBroker = broker?.nombre_comercial?.split(' ')[0] || 'tu asesor';

    const msg = propiedadMatch 
      ? `Hola ${nombreLead}, soy ${nombreBroker}. Revisando mis archivos, noté que estabas buscando propiedades de cierto perfil. Acabo de captar una exclusiva que encaja un ${propiedadMatch.matchScore}% con lo que buscabas: ${propiedadMatch.titulo}. ¿Te gustaría que te envíe el Smart Brochure?`
      : `Hola ${nombreLead}, te saluda ${nombreBroker}. ¿Cómo va tu búsqueda de propiedad?`;
      
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function descargarCSV() {
    if (clientesInteligentes.length === 0) return alert("No hay prospectos para exportar.");

    const cabeceras = ['Nombre del Prospecto', 'Teléfono', 'Correo', 'Estado', 'Fuente', 'Propiedad Original', 'Objetivo (MXN)', 'Opciones de Match'];
    
    const filas = clientesInteligentes.map(l => {
      const propOriginal = l.interesesHistorial.length > 0 ? l.interesesHistorial[0].titulo : 'Ninguna registrada';
      return [
        `"${(l.nombre || '').replace(/"/g, '""')}"`,
        `"${l.telefono || ''}"`,
        `"${l.correo || ''}"`,
        `"${l.estado || ''}"`,
        `"${l.fuente || ''}"`,
        `"${propOriginal.replace(/"/g, '""')}"`,
        l.presupuestoInferido || 0,
        l.matches.length
      ];
    });

    const contenidoCSV = [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Directorio_Boveda_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="fixed inset-0 w-screen h-screen bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full flex-1 flex flex-col font-sans text-slate-900 pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-10 pb-28 px-6 sm:px-12 relative overflow-hidden shadow-2xl shadow-zinc-900/20 shrink-0">
    <div class="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none -translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-white drop-shadow-sm">Directorio & Matchmaking</h1>
        <p class="text-xs font-bold text-indigo-400 mt-1.5 flex items-center gap-2 uppercase tracking-widest">
          <Target class="w-3.5 h-3.5" /> Bóveda de Clientes e Inteligencia
        </p>
      </div>
      
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-64">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" bind:value={searchQuery} placeholder="Buscar lead..." class="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
        </div>

        <button 
          onclick={() => mostrarDescartados = !mostrarDescartados}
          class="flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-xs font-bold shrink-0 {mostrarDescartados ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}"
          title="Alternar Leads Descartados"
        >
          {#if mostrarDescartados}
            <Eye class="w-4 h-4" /> Descartados
          {:else}
            <EyeOff class="w-4 h-4" /> Descartados
          {/if}
        </button>
        
        <button onclick={descargarCSV} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap shrink-0">
          <Download class="w-4 h-4" /> Exportar Leads
        </button>
      </div>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-12">
      
      <!-- GRID DE 5 KPIS VITALES -->
      <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div class="bg-white p-4 rounded-2xl shadow-sm border-t-4 border-blue-500 border-x border-b border-x-slate-200 border-b-slate-200 flex flex-col justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-500 mb-1">Leads este mes</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">{metricasMes.total}</p>
          </div>
          {#if metricasMes.esPositivo}
            <p class="text-[10px] font-bold text-emerald-600">↑ {metricasMes.crecimiento}% vs mes ant.</p>
          {:else}
            <p class="text-[10px] font-bold text-rose-600">↓ {Math.abs(metricasMes.crecimiento)}% vs mes ant.</p>
          {/if}
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border-t-4 border-emerald-500 border-x border-b border-x-slate-200 border-b-slate-200 flex flex-col justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-500 mb-1">En negociación</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">{leadsEnNegociacion.total}</p>
          </div>
          {#if leadsEnNegociacion.nuevosSemana > 0}
            <p class="text-[10px] font-bold text-emerald-600">↑ {leadsEnNegociacion.nuevosSemana} nuevos esta sem.</p>
          {:else}
            <p class="text-[10px] font-bold text-slate-400">Sin cambios esta semana</p>
          {/if}
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border-t-4 border-amber-500 border-x border-b border-x-slate-200 border-b-slate-200 flex flex-col justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-500 mb-1">Sin seguimiento +3d</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">{leadsSinSeguimiento.length}</p>
          </div>
          
          <!-- LÓGICA DE HOVER PARA NOMBRES -->
          {#if leadsSinSeguimiento.length > 0}
            <div class="relative group cursor-help">
              <span class="text-[10px] font-bold text-rose-500 flex items-center gap-1 inline-flex bg-rose-50 px-2 py-0.5 rounded border border-rose-100 transition-colors group-hover:bg-rose-100">
                <AlertCircle class="w-3 h-3"/> Requieren acción
              </span>
              
              <!-- TOOLTIP CON LISTA DE NOMBRES -->
              <div class="absolute top-full left-0 mt-2 w-52 bg-zinc-900 border border-zinc-800 shadow-xl rounded-xl p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2 border-b border-zinc-800 pb-1.5">Leads en Riesgo</p>
                <ul class="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {#each leadsSinSeguimiento as leadObj}
                    <li class="text-[10px] font-medium text-white truncate flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span> {leadObj.nombre}
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else}
            <p class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><Clock class="w-3 h-3"/> Al día</p>
          {/if}
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border-t-4 border-indigo-500 border-x border-b border-x-slate-200 border-b-slate-200 flex flex-col justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-500 mb-1">Tasa de conversión</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">{tasaConversion.actual}%</p>
          </div>
          <p class="text-[10px] font-bold text-emerald-600">↑ Histórico global</p>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-sm border-t-4 border-purple-500 border-x border-b border-x-slate-200 border-b-slate-200 flex flex-col justify-between">
          <div>
            <p class="text-[11px] font-bold text-slate-500 mb-1">Cruces exitosos</p>
            <p class="text-2xl font-black text-slate-900 tracking-tighter mb-1.5">{totalMatches}</p>
          </div>
          <p class="text-[10px] font-bold text-purple-600 flex items-center gap-1">
            <Zap class="w-3 h-3 fill-current" /> Matches en bóveda
          </p>
        </div>
      </div>

      <!-- LISTADO DE CLIENTES -->
      <div class="space-y-3">
        {#each clientesInteligentes as cliente}
          {@const estiloEstado = getEstadoStyle(cliente.estado)}
          
          <div class="bg-white rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)] border {cliente.estado === 'descartado' ? 'border-slate-100 opacity-60' : 'border-slate-200'} overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-[0_4px_15px_rgb(0,0,0,0.05)] hover:border-slate-300 hover:opacity-100">
            
            <!-- Columna Izquierda (Info CRM) -->
            <div class="flex-1 p-3.5 lg:px-5 lg:py-4 border-b lg:border-b-0 lg:border-r border-slate-100 flex items-start gap-3.5">
              <div class="w-10 h-10 mt-1 rounded-full bg-slate-100 shrink-0 shadow-inner border border-slate-200 overflow-hidden hidden sm:block">
                <img src="https://ui-avatars.com/api/?name={cliente.nombre || 'Lead'}&background=0f172a&color=fff&bold=true&size=100" alt="Avatar" class="w-full h-full object-cover">
              </div>
              
              <div class="flex-1 flex flex-col justify-center min-w-0">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-baseline gap-2.5 truncate">
                    <h3 class="text-[15px] font-black text-slate-900 tracking-tight truncate">{cliente.nombre}</h3>
                    <p class="text-[10px] font-medium text-slate-400 font-mono truncate hidden sm:block">{cliente.telefono} • {cliente.correo}</p>
                  </div>
                  
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    {#if cliente.correo}
                      <a href="mailto:{cliente.correo}" title="Enviar Correo (No recomendado)" class="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors flex items-center justify-center">
                        <Mail class="w-4 h-4" />
                      </a>
                    {/if}
                    <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, null)} class="text-[#25D366] hover:bg-[#25D366]/10 p-2 rounded-full transition-colors flex items-center justify-center" title="WhatsApp Directo">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </button>
                  </div>
                </div>

                <p class="text-[10px] font-medium text-slate-400 font-mono truncate sm:hidden mb-2">{cliente.telefono} • {cliente.correo}</p>
                
                <div class="flex flex-wrap items-center gap-2 mb-2.5">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 {estiloEstado.bg} {estiloEstado.text} {estiloEstado.border}">
                    <span class="w-1.5 h-1.5 rounded-full {estiloEstado.dot}"></span>
                    <span class="capitalize">{cliente.estado}</span>
                  </span>
                  
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 capitalize">
                    {cliente.fuente}
                  </span>

                  {#if cliente.perfil}
                    <span class="text-[10px] font-bold text-slate-500 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 uppercase tracking-wider">
                      {cliente.perfil.operacionDominante} • {cliente.perfil.tipoDominante}
                    </span>
                  {/if}
                  
                  <span class="text-[10px] font-medium text-slate-500 flex items-center gap-1 ml-auto shrink-0 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Clock class="w-3 h-3 text-slate-400"/> {formatearFechaRelativa(cliente.fecha_contacto)}
                  </span>
                </div>

                {#if cliente.interesesHistorial.length > 0}
                  {@const propInteres = cliente.interesesHistorial[0]}
                  <a href="/admin/editar/{propInteres.id}" target="_blank" title="Ver propiedad original" class="bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 rounded-lg p-2 flex items-center gap-2.5 transition-colors">
                    {#if propInteres.imagen_url}
                      <img src={propInteres.imagen_url} alt="Interés" class="w-7 h-7 rounded flex-shrink-0 object-cover border border-slate-200">
                    {:else}
                      <Building class="w-4 h-4 text-slate-400 shrink-0 mx-1.5" />
                    {/if}
                    <div class="flex-1 overflow-hidden flex items-center justify-between gap-3">
                      <p class="text-[11px] font-bold text-slate-700 truncate">{propInteres.titulo}</p>
                      <p class="text-[10px] font-black text-slate-600 shrink-0 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100">
                        {formatter.format(propInteres.precio)}
                      </p>
                    </div>
                  </a>
                {/if}
              </div>
            </div>

            <!-- COLUMNA MATCHMAKING V2 (DERECHA) -->
            <div class="w-full lg:w-[250px] bg-slate-50/50 p-3 lg:p-4 shrink-0 flex flex-col justify-center relative border-t lg:border-t-0 border-slate-100">
              {#if cliente.matches.length > 0}
                {@const bestMatch = cliente.matches[0]}
                <div class="flex items-center justify-between mb-2 relative">
                  <p class="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5" /> Match 
                  </p>
                  
                  {#if cliente.matches.length > 1}
                    <div class="relative group">
                      <span class="bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded shadow-sm border border-indigo-200 cursor-help flex items-center">
                        +{cliente.matches.length - 1} opciones
                      </span>
                      <div class="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1.5">Otras coincidencias</p>
                        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {#each cliente.matches.slice(1) as extraMatch}
                            <a href="/admin/editar/{extraMatch.id}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                              <img src={extraMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover shrink-0 border border-slate-200">
                              <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-slate-900 truncate">{extraMatch.titulo}</p>
                                <div class="flex items-center gap-2 mt-1">
                                  <p class="text-[9px] font-black text-slate-500">{formatter.format(extraMatch.precio)}</p>
                                  <span class="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{extraMatch.matchScore}%</span>
                                </div>
                              </div>
                            </a>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>

                <a href="/admin/editar/{bestMatch.id}" target="_blank" rel="noopener noreferrer" class="bg-white rounded-xl p-2 border border-indigo-100 shadow-sm mb-2.5 flex gap-2.5 items-center cursor-pointer hover:bg-indigo-50/50 transition-colors relative overflow-hidden">
                  <div class="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl shadow-sm z-10">
                    {bestMatch.matchScore}% 
                  </div>
                  <img src={bestMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover border border-slate-100">
                  <div class="flex-1 truncate">
                    <p class="text-[11px] font-bold text-slate-900 truncate pr-5">{bestMatch.titulo}</p>
                    <p class="text-[10px] font-black text-slate-500 tracking-tight mt-0.5">{formatter.format(bestMatch.precio)}</p>
                  </div>
                </a>

                <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, bestMatch)} class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-[11px] active:scale-95">
                  Enviar Propiedad <ArrowRight class="w-3.5 h-3.5" />
                </button>
              {:else}
                <div class="flex flex-col items-center justify-center text-center opacity-50 h-full py-2">
                  <Search class="w-4 h-4 text-slate-400 mb-1.5" />
                  <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sin Coincidencias</p>
                </div>
              {/if}
            </div>

          </div>
        {/each}

        {#if clientesInteligentes.length === 0}
          <div class="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto">
            <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
              <Search class="w-5 h-5" />
            </div>
            <h3 class="text-base font-black text-slate-900 tracking-tight mb-1.5">Bóveda Vacía</h3>
            <p class="text-xs text-slate-500 font-medium max-w-sm">No tienes prospectos registrados o ninguno coincide con tu búsqueda actual.</p>
          </div>
        {/if}
      </div>

    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
