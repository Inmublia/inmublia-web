<!-- src/routes/admin/directorio/+page.svelte -->
<script>
  import { 
    Users, Target, Sparkles, MessageSquareQuote, 
    Search, MapPin, BadgeDollarSign, ArrowRight, Zap,
    Download, Activity, BarChart3, Clock, Building,
    Mail, EyeOff, Eye, AlertCircle
  } from 'lucide-svelte';
  
  import PageHeader from '$lib/components/PageHeader.svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let searchQuery = $state('');
  let mostrarDescartados = $state(false); 

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
    if (leadsMesPasado > 0 && leadsEsteMes > 0) {
      crecimiento = ((leadsEsteMes - leadsMesPasado) / leadsMesPasado) * 100;
    } else if (leadsMesPasado === 0 && leadsEsteMes > 0) {
      crecimiento = 100;
    }

    return {
      total: leadsEsteMes,
      crecimiento: Math.abs(crecimiento).toFixed(0),
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

  let clientesBase = $derived.by(() => {
    let mapa = {};
    
    leads.forEach(l => {
      // 🚀 FIX C2: Prevenir colisión de key vacía
      if (!l.correo && !l.telefono) return; // Saltar leads inútiles sin datos de contacto
      const emailKey = l.correo ? `email:${l.correo.toLowerCase().trim()}` : `tel:${String(l.telefono).replace(/\D/g, '')}`;

      let fechaActividad = l.ultima_actividad ? new Date(l.ultima_actividad) : new Date(l.creado_en);
      if (l.lead_notas && l.lead_notas.length > 0) {
        const maxNota = new Date(Math.max(...l.lead_notas.map(n => new Date(n.creado_en))));
        if (maxNota > fechaActividad) fechaActividad = maxNota;
      }

      if (!mapa[emailKey]) {
        mapa[emailKey] = {
          nombre: l.nombre,
          correo: l.correo,
          telefono: l.telefono,
          estado: (l.estado || 'nuevo').toLowerCase(),
          fuente: l.fuente || l.origen || 'Directo',   
          fecha_contacto: fechaActividad.toISOString(), 
          interesesHistorial: [],
          presupuestoInferido: 0,
          perfil: null,
          matches: []
        };
      } else {
        const fechaMapa = new Date(mapa[emailKey].fecha_contacto);
        if (fechaActividad > fechaMapa) {
          mapa[emailKey].fecha_contacto = fechaActividad.toISOString();
          // Actualizamos el estado solo si hay actividad más reciente
          mapa[emailKey].estado = (l.estado || 'nuevo').toLowerCase();
        }
      }

      if (l.propiedades) {
        if (!mapa[emailKey].interesesHistorial.find(i => i.id === l.propiedades.id)) {
          const propFull = propiedades.find(p => p.id === l.propiedades.id) || l.propiedades;
          mapa[emailKey].interesesHistorial.push(propFull);
        }
      }
    });

    return Object.values(mapa).map(cliente => {
      if (cliente.interesesHistorial.length > 0) {
        const conteoOperacion = {};
        const conteoTipo = {};
        let sumaRecamaras = 0;

        cliente.interesesHistorial.forEach(p => {
          sumaRecamaras += Number(p.recamaras) || 0;
          const op = p.operacion || 'Venta';
          const tp = p.tipo || 'Casa';
          conteoOperacion[op] = (conteoOperacion[op] || 0) + 1;
          conteoTipo[tp] = (conteoTipo[tp] || 0) + 1;
        });

        const precios = cliente.interesesHistorial.map(p => Number(p.precio) || 0).sort((a,b) => a - b);
        const mid = Math.floor(precios.length / 2);
        cliente.presupuestoInferido = precios.length === 0 ? 0 : (precios.length % 2 === 0
          ? (precios[mid - 1] + precios[mid]) / 2
          : precios[mid]);

        const recamarasPromedio = Math.round(sumaRecamaras / cliente.interesesHistorial.length);
        
        const operacionDominante = Object.keys(conteoOperacion).reduce((a, b) => conteoOperacion[a] > conteoOperacion[b] ? a : b);
        const tipoDominante = Object.keys(conteoTipo).reduce((a, b) => conteoTipo[a] > conteoTipo[b] ? a : b);

        cliente.perfil = { operacionDominante, tipoDominante, recamarasPromedio };

        // Matchmaking
        const matchesPuntuados = propiedades
          .filter(p => !cliente.interesesHistorial.find(i => i.id === p.id))
          .filter(p => p.operacion === operacionDominante)
          .map(p => {
            const diffPrecio = Math.abs(p.precio - cliente.presupuestoInferido) / (cliente.presupuestoInferido || 1);
            if (diffPrecio > 0.30) return null;

            let score = diffPrecio <= 0.15 ? 50 : 25;
            if (p.tipo === tipoDominante) score += 25;

            const pRec = Number(p.recamaras) || 0;
            score += pRec >= recamarasPromedio ? 25 : (pRec === recamarasPromedio - 1 ? 10 : 0);

            return score >= 60 ? { ...p, matchScore: score } : null;
          })
          .filter(Boolean);

        cliente.matches = matchesPuntuados.sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          return Math.abs(a.precio - cliente.presupuestoInferido) - Math.abs(b.precio - cliente.presupuestoInferido);
        });
      }
      return cliente;
    })
    .filter(c => mostrarDescartados || c.estado !== 'descartado')
    .sort((a, b) => new Date(b.fecha_contacto) - new Date(a.fecha_contacto)); 
  });

  let clientesInteligentes = $derived(
    searchQuery.trim() === ''
      ? clientesBase
      : clientesBase.filter(c =>
          c.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.correo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.telefono?.includes(searchQuery)
        )
  );

  let leadsSinSeguimiento = $derived.by(() => {
    const abandonados = clientesBase.filter(c => {
      if (['cerrado', 'descartado'].includes(c.estado)) return false;
      const dias = Math.floor((new Date() - new Date(c.fecha_contacto)) / (1000 * 60 * 60 * 24));
      return dias >= 3;
    });
    return abandonados.sort((a, b) => new Date(a.fecha_contacto) - new Date(b.fecha_contacto));
  });

  let tasaConversion = $derived.by(() => {
    const total = leads.length;
    if (total === 0) return { actual: 0, delta: 0 };
    const ganados = leads.filter(l => l.estado === 'cerrado').length;
    return { actual: ((ganados / total) * 100).toFixed(1), delta: 0 };
  });

  let totalMatches = $derived(clientesBase.reduce((acc, c) => acc + c.matches.length, 0));
  
  // 🚀 FIX F5: Calcular el Pipeline Total en Juego de los clientes listados
  let valorPipelineTotal = $derived(clientesBase.reduce((acc, c) => acc + (c.presupuestoInferido || 0), 0));
  
  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  function getEstadoStyle(estado) {
    if (estado === 'nuevo') return { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', dot: 'bg-blue-500' };
    if (estado === 'contactado') return { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', dot: 'bg-purple-500' };
    if (estado === 'visita' || estado === 'visita agendada') return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' };
    if (estado === 'negociacion' || estado === 'negociación') return { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20', dot: 'bg-indigo-500' };
    if (estado === 'cerrado') return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' };
    if (estado === 'descartado') return { bg: 'bg-slate-100 dark:bg-zinc-800/50', text: 'text-slate-500 dark:text-zinc-500', border: 'border-slate-200 dark:border-zinc-700', dot: 'bg-slate-400 dark:bg-zinc-600' };
    return { bg: 'bg-slate-50 dark:bg-zinc-800/50', text: 'text-slate-700 dark:text-zinc-400', border: 'border-slate-200 dark:border-zinc-700', dot: 'bg-slate-500 dark:bg-zinc-600' };
  }

  // 🚀 FIX I1: Ajuste de timezone simplificando a Días sin UTC complejas
  function formatearFechaRelativa(fechaIso) {
    if (!fechaIso) return 'Sin fecha';
    const fecha = new Date(fechaIso);
    const diffDias = Math.floor((new Date() - fecha) / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // 🚀 FIX I3: Mensaje de WhatsApp humanizado y persuasivo (No más porcentajes de robot)
  function enviarWhatsApp(telefono, nombreCliente, propiedadMatch) {
    if (!telefono) {
      alert("Este prospecto no tiene un número de WhatsApp registrado.");
      return;
    }

    const nombreLead = (nombreCliente || '').replace(/[^\p{L}\s]/gu, '').split(' ')[0].trim() || 'hola';
    const nombreBroker = (broker?.nombre_comercial || '').replace(/[^\p{L}\s]/gu, '').split(' ')[0].trim() || 'tu asesor';

    const msg = propiedadMatch 
      ? `¡Hola ${nombreLead}! Soy ${nombreBroker}. Recordando lo que buscabas, acaba de entrar a nuestro inventario una opción que creo que te va a encantar: ${propiedadMatch.titulo}. ¿Te comparto la ficha con las fotos?`
      : `¡Hola ${nombreLead}! Te saluda ${nombreBroker}. Quería darle seguimiento a tu búsqueda, ¿sigue en pie?`;
      
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // 🚀 FIX I2: Prevenir Memory Leak usando Try/Finally al crear object URLs
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
    
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Directorio_Boveda_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      URL.revokeObjectURL(url); // Garantizado que se ejecuta aunque a.click falle
    }
  }
</script>

<div class="fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<div class="w-full flex-1 flex flex-col font-sans text-slate-900 dark:text-zinc-100 pb-12 animate-[fadeIn_0.3s_ease-out] relative">
  
  <PageHeader title="Directorio & Matchmaking" icon={Target}>
    {#snippet subtitle()}
      Bóveda de Clientes e Inteligencia
    {/snippet}

    {#snippet actions()}
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-64">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" bind:value={searchQuery} placeholder="Buscar lead..." class="w-full bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
        </div>

        <button 
          onclick={() => mostrarDescartados = !mostrarDescartados}
          class="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold shrink-0 {mostrarDescartados ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20' : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 shadow-sm'}"
          title="Alternar Leads Descartados"
        >
          {#if mostrarDescartados}
            <Eye class="w-4 h-4" /> Descartados
          {:else}
            <EyeOff class="w-4 h-4" /> Descartados
          {/if}
        </button>
        
        <button onclick={descargarCSV} class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md dark:shadow-indigo-600/20 active:scale-95 whitespace-nowrap shrink-0 border border-transparent">
          <Download class="w-4 h-4" /> Exportar
        </button>
      </div>
    {/snippet}
  </PageHeader>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-12">
      <!-- 4 KPIS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <!-- 🚀 KPI NUEVO (Feature 5 de 2026): Valor en Pipeline -->
        <div class="bg-slate-900 dark:bg-zinc-900 p-4 rounded-2xl shadow-md border-t-4 border-emerald-400 border border-slate-800 flex flex-col justify-between transition-colors">
          <div>
            <p class="text-[11px] font-bold text-slate-400 mb-1">Pipeline Activo (Bóveda)</p>
            <p class="text-2xl font-black text-white tracking-tighter mb-1.5">{formatter.format(valorPipelineTotal)}</p>
          </div>
          <p class="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><BadgeDollarSign class="w-3 h-3"/> Valor de Leads Vivos</p>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div>
            <p class="text-[11px] font-bold text-slate-500 dark:text-zinc-500 mb-1">En negociación</p>
            <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1.5">{leadsEnNegociacion.total}</p>
          </div>
          {#if leadsEnNegociacion.nuevosSemana > 0}
            <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">↑ {leadsEnNegociacion.nuevosSemana} nuevos esta sem.</p>
          {:else}
            <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500">Sin cambios esta semana</p>
          {/if}
        </div>

        <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between overflow-visible transition-colors">
          <div>
            <p class="text-[11px] font-bold text-slate-500 dark:text-zinc-500 mb-1">Sin seguimiento +3d</p>
            <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1.5">{leadsSinSeguimiento.length}</p>
          </div>
          {#if leadsSinSeguimiento.length > 0}
            <div class="relative group cursor-help w-max">
              <span class="text-[10px] font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-500/20 transition-colors group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20">
                <AlertCircle class="w-3 h-3"/> Requieren acción
              </span>
              <div class="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xl rounded-xl p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <p class="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-zinc-800 pb-1.5">Leads en Riesgo</p>
                <ul class="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {#each leadsSinSeguimiento as leadObj}
                    <li class="text-[10px] font-medium text-slate-700 dark:text-zinc-300 truncate flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span> {leadObj.nombre}
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else}
            <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><Clock class="w-3 h-3"/> Al día</p>
          {/if}
        </div>

        <div class="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div>
            <p class="text-[11px] font-bold text-slate-500 dark:text-zinc-500 mb-1">Cruces (Matches)</p>
            <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1.5">{totalMatches}</p>
          </div>
          <p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Zap class="w-3 h-3 fill-current" /> Encontrados en bóveda
          </p>
        </div>
      </div>

      <!-- LISTA DEL DIRECTORIO -->
      <div class="space-y-3">
        {#each clientesInteligentes as cliente}
          {@const estiloEstado = getEstadoStyle(cliente.estado)}
          
          <div class="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border {cliente.estado === 'descartado' ? 'border-slate-100 dark:border-zinc-800 opacity-60' : 'border-slate-200 dark:border-zinc-800'} overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-zinc-700 hover:opacity-100">
            <div class="flex-1 p-3.5 lg:px-5 lg:py-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-zinc-800 flex items-start gap-3.5 transition-colors">
              
              <div class="w-10 h-10 mt-1 rounded-full bg-slate-800 dark:bg-zinc-800 shrink-0 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-white text-[11px] font-black hidden sm:flex tracking-widest shadow-inner uppercase transition-colors">
                {(cliente.nombre || '?').replace(/[^\p{L}\s]/gu, '').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>

              <div class="flex-1 flex flex-col justify-center min-w-0">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-baseline gap-2.5 truncate">
                    <h3 class="text-[15px] font-black text-slate-900 dark:text-white tracking-tight truncate">{cliente.nombre}</h3>
                    <p class="text-[10px] font-medium text-slate-400 dark:text-zinc-500 font-mono truncate hidden sm:block">{cliente.telefono} • {cliente.correo}</p>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    {#if cliente.correo}
                      <a href="mailto:{cliente.correo}" title="Enviar Correo (No recomendado)" class="text-slate-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 p-2 rounded-full transition-colors flex items-center justify-center"><Mail class="w-4 h-4" /></a>
                    {/if}
                    <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, null)} class="text-[#25D366] hover:bg-[#25D366]/10 p-2 rounded-full transition-colors flex items-center justify-center" title="WhatsApp Directo">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </button>
                  </div>
                </div>
                <p class="text-[10px] font-medium text-slate-400 dark:text-zinc-500 font-mono truncate sm:hidden mb-2">{cliente.telefono} • {cliente.correo}</p>
                
                <div class="flex flex-wrap items-center gap-2 mb-2.5">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 {estiloEstado.bg} {estiloEstado.text} {estiloEstado.border}">
                    <span class="w-1.5 h-1.5 rounded-full {estiloEstado.dot}"></span>
                    <span class="capitalize">{cliente.estado}</span>
                  </span>
                  <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold text-slate-600 dark:text-zinc-400 capitalize transition-colors">{cliente.fuente}</span>
                  
                  {#if cliente.perfil}
                    <span class="text-[10px] font-bold text-slate-500 dark:text-zinc-500 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 uppercase tracking-wider transition-colors">{cliente.perfil.operacionDominante} • {cliente.perfil.tipoDominante}</span>
                  {/if}
                  
                  <span class="text-[10px] font-medium text-slate-500 dark:text-zinc-500 flex items-center gap-1 ml-auto shrink-0 bg-slate-50 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md border border-slate-100 dark:border-zinc-800 transition-colors">
                    <Clock class="w-3 h-3 text-slate-400 dark:text-zinc-600"/> {formatearFechaRelativa(cliente.fecha_contacto)}
                  </span>
                </div>

                {#if cliente.interesesHistorial.length > 0}
                  {@const propInteres = cliente.interesesHistorial[0]}
                  <a href="/admin/editar/{propInteres.id}" target="_blank" title="Ver propiedad original" class="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 rounded-lg p-2 flex items-center gap-2.5 transition-colors">
                    {#if propInteres.imagen_url}
                      <img src={propInteres.imagen_url} alt="Interés" class="w-7 h-7 rounded flex-shrink-0 object-cover border border-slate-200 dark:border-zinc-700">
                    {:else}
                      <Building class="w-4 h-4 text-slate-400 dark:text-zinc-600 shrink-0 mx-1.5" />
                    {/if}
                    <div class="flex-1 overflow-hidden flex items-center justify-between gap-3">
                      <p class="text-[11px] font-bold text-slate-700 dark:text-zinc-300 truncate">{propInteres.titulo}</p>
                      <p class="text-[10px] font-black text-slate-600 dark:text-zinc-400 shrink-0 bg-white dark:bg-zinc-900 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-zinc-800 transition-colors">{formatter.format(propInteres.precio)}</p>
                    </div>
                  </a>
                {/if}
              </div>
            </div>
            
            <div class="w-full lg:w-[200px] xl:w-[260px] bg-slate-50/50 dark:bg-zinc-800/30 p-3 lg:p-4 shrink-0 flex flex-col justify-center relative border-t lg:border-t-0 border-slate-100 dark:border-zinc-800 transition-colors">
              {#if cliente.matches.length > 0}
                {@const bestMatch = cliente.matches[0]}
                <div class="flex items-center justify-between mb-2 relative">
                  <p class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles class="w-3.5 h-3.5" /> Match Inteligente</p>
                  {#if cliente.matches.length > 1}
                    <div class="relative group">
                      <span class="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 text-[9px] font-black px-2 py-0.5 rounded shadow-sm border border-indigo-200 dark:border-indigo-500/30 cursor-help flex items-center transition-colors">+{cliente.matches.length - 1} más</span>
                      
                      <div class="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 shadow-xl rounded-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p class="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-zinc-800 pb-1.5 transition-colors">Otras coincidencias</p>
                        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {#each cliente.matches.slice(1) as extraMatch}
                            <a href="/admin/editar/{extraMatch.id}" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-zinc-700">
                              <img src={extraMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover shrink-0 border border-slate-200 dark:border-zinc-700">
                              <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-slate-900 dark:text-white truncate">{extraMatch.titulo}</p>
                                <div class="flex items-center gap-2 mt-1">
                                  <p class="text-[9px] font-black text-slate-500 dark:text-zinc-400">{formatter.format(extraMatch.precio)}</p>
                                </div>
                              </div>
                            </a>
                          {/each}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
                
                <a href="/admin/editar/{bestMatch.id}" target="_blank" rel="noopener noreferrer" class="bg-white dark:bg-zinc-900 rounded-xl p-2 border border-indigo-100 dark:border-indigo-500/30 shadow-sm mb-2.5 flex gap-2.5 items-center cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors relative overflow-hidden">
                  <div class="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl shadow-sm z-10">{bestMatch.matchScore}%</div>
                  <img src={bestMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover border border-slate-100 dark:border-zinc-800">
                  <div class="flex-1 truncate">
                    <p class="text-[11px] font-bold text-slate-900 dark:text-white truncate pr-5">{bestMatch.titulo}</p>
                    <p class="text-[10px] font-black text-slate-500 dark:text-zinc-500 tracking-tight mt-0.5">{formatter.format(bestMatch.precio)}</p>
                  </div>
                </a>
                
                <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, bestMatch)} class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-[11px] active:scale-95">
                  Proponer Inmueble <ArrowRight class="w-3.5 h-3.5" />
                </button>
              {:else}
                <div class="flex flex-col items-center justify-center text-center opacity-50 h-full py-2">
                  <Search class="w-4 h-4 text-slate-400 dark:text-zinc-500 mb-1.5" />
                  <p class="text-[9px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Sin Coincidencias</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if clientesInteligentes.length === 0}
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto transition-colors shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-3 shadow-inner transition-colors"><Search class="w-5 h-5" /></div>
            <h3 class="text-base font-black text-slate-900 dark:text-white tracking-tight mb-1.5">Bóveda Vacía</h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium max-w-sm">No tienes prospectos registrados o ninguno coincide con tu búsqueda actual.</p>
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
