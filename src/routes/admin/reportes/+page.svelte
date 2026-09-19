<!-- src/routes/admin/reportes/+page.svelte -->
<script>
  import { 
    TrendingUp, Activity, BarChart3, RefreshCw, LineChart, PieChart, Building2,
    DollarSign, CheckCircle2, Clock, Users, Timer, Target, AlertTriangle, Lightbulb
  } from 'lucide-svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let comisionBroker = $derived((broker.comision_default || 5) / 100);
  
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  let totalLeads = $derived(leads.length);
  
  // 🚀 FIX: Normalización estricta (case-insensitive)
  let leadsGanados = $derived(leads.filter(l => l.estado?.toLowerCase().trim() === 'cerrado'));
  let propiedadesVendidas = $derived(propiedades.filter(p => p.estatus?.toLowerCase().trim() === 'vendida'));
  
  let tasaCierre = $derived(totalLeads > 0 ? ((leadsGanados.length / totalLeads) * 100).toFixed(1) : '0.0');
  
  let leadsEstancados = $derived(leads.filter(l => {
    const est = l.estado?.toLowerCase().trim();
    if (est === 'cerrado' || est === 'descartado') return false;
    const dias = Math.floor((new Date() - new Date(l.creado_en)) / (1000 * 60 * 60 * 24));
    return dias > 15;
  }).length);

  let pipelineValue = $derived(leads.reduce((acc, lead) => {
    const est = lead.estado?.toLowerCase().trim();
    if (est !== 'descartado' && est !== 'cerrado' && lead.propiedades?.precio) {
      return acc + (lead.propiedades.precio * comisionBroker);
    }
    return acc;
  }, 0));

  let revenueWon = $derived.by(() => {
    let totalCrm = leadsGanados.reduce((acc, lead) => {
      const precioBase = lead.precio_cierre || lead.propiedades?.precio || 0;
      const porcentajeCierre = lead.comision_cierre ? (lead.comision_cierre / 100) : comisionBroker;
      return acc + (precioBase * porcentajeCierre);
    }, 0);

    const idsPropiedadesCerradasEnCrm = leadsGanados.map(l => l.propiedades?.id).filter(id => id);
    let totalInventarioHuerfano = propiedadesVendidas
      .filter(p => !idsPropiedadesCerradasEnCrm.includes(p.id))
      .reduce((acc, prop) => acc + ((prop.precio || 0) * comisionBroker), 0);

    return totalCrm + totalInventarioHuerfano;
  });

  let totalCierres = $derived.by(() => {
     const idsPropiedadesCerradasEnCrm = leadsGanados.map(l => l.propiedades?.id).filter(id => id);
     const huerfanos = propiedadesVendidas.filter(p => !idsPropiedadesCerradasEnCrm.includes(p.id)).length;
     return leadsGanados.length + huerfanos;
  });

  // 🚀 MEJORA 1: Tiempo Promedio de Cierre (Métrica Enterprise)
  let tiempoPromedioCierre = $derived.by(() => {
    const cerradosValidos = leadsGanados.filter(l => l.creado_en && l.actualizado_en);
    if (cerradosValidos.length === 0) return null;
    
    const dias = cerradosValidos.map(l => {
      const inicio = new Date(l.creado_en).getTime();
      const fin = new Date(l.actualizado_en).getTime();
      return Math.max(1, (fin - inicio) / (1000 * 60 * 60 * 24));
    });
    
    const promedio = dias.reduce((s, d) => s + d, 0) / dias.length;
    return Math.round(promedio);
  });

  // 🚀 MEJORA 2: Embudo de Conversión "Waterfall" (Muestra caídas reales)
  let funnelAdvanced = $derived.by(() => {
    const etapas = [
      { id: 'nuevo', label: 'Prospectos Captados', color: '#6366F1' },
      { id: 'contactado', label: 'Contactados', color: '#3B82F6' },
      { id: 'visita', label: 'Visitas / Citas', color: '#8B5CF6' },
      { id: 'negociacion', label: 'En Negociación', color: '#F59E0B' },
      { id: 'cerrado', label: 'Cierres (Ganados)', color: '#10B981' }
    ];

    return etapas.map((etapa, i) => {
      // Para un embudo real, contamos los leads que llegaron "al menos" a esta etapa
      const count = leads.filter(l => {
        const est = l.estado?.toLowerCase().trim();
        if (i === 0) return est !== 'descartado'; 
        if (i === 1) return ['contactado', 'visita', 'negociacion', 'cerrado'].includes(est);
        if (i === 2) return ['visita', 'negociacion', 'cerrado'].includes(est);
        if (i === 3) return ['negociacion', 'cerrado'].includes(est);
        if (i === 4) return est === 'cerrado';
        return false;
      }).length;
      return { ...etapa, count };
    });
  });

  // 🚀 MEJORA 3: ROI por Fuente (Deja de ser un Donut, ahora es dinero)
  let fuentesROI = $derived.by(() => {
    const mapa = {};
    leads.forEach(l => {
      const f = (l.origen || l.fuente || 'Directo / Manual').trim();
      if (!mapa[f]) mapa[f] = { nombre: f, total: 0, cerrados: 0, comision: 0 };
      
      mapa[f].total++;
      if (l.estado?.toLowerCase().trim() === 'cerrado') {
        mapa[f].cerrados++;
        const precioBase = l.precio_cierre || l.propiedades?.precio || 0;
        const porcentaje = l.comision_cierre ? (l.comision_cierre / 100) : comisionBroker;
        mapa[f].comision += (precioBase * porcentaje);
      }
    });
    
    return Object.values(mapa)
      .map(f => ({ ...f, tasa: f.total > 0 ? (f.cerrados / f.total) * 100 : 0 }))
      .sort((a, b) => b.tasa - a.tasa); // Ordenar por las que mejor convierten
  });

  let tendenciaComisionesMeses = $derived.by(() => {
    const hoy = new Date();
    const meses = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({
        m: d.getMonth(), 
        y: d.getFullYear(), 
        label: d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''),
        count: 0
      });
    }

    leadsGanados.forEach(l => {
      const d = new Date(l.actualizado_en || l.creado_en);
      const match = meses.find(x => x.m === d.getMonth() && x.y === d.getFullYear());
      if (match) {
        const precioBase = l.precio_cierre || l.propiedades?.precio || 0;
        const porcentaje = l.comision_cierre ? (l.comision_cierre / 100) : comisionBroker;
        match.count += (precioBase * porcentaje);
      }
    });

    const total6m = meses.reduce((sum, curr) => sum + curr.count, 0);
    const promedio = (total6m / 6);
    
    let mejorMes = meses[0];
    meses.forEach(m => { if(m.count > mejorMes.count) mejorMes = m; });

    const maxCount = Math.max(...meses.map(m => m.count), 1);
    
    let tendPct = 0;
    if (meses[4].count > 0) tendPct = ((meses[5].count - meses[4].count) / meses[4].count) * 100;
    else if (meses[5].count > 0) tendPct = 100;

    return { datos: meses, total: total6m, promedio, mejorMes, maxCount, tendencia: tendPct.toFixed(0) };
  });

  let rendimientoPropiedades = $derived.by(() => {
    const conteo = {};
    leads.forEach(lead => {
      if (lead.propiedades) {
        const pId = lead.propiedades.id;
        if (!conteo[pId]) {
          conteo[pId] = { titulo: lead.propiedades.titulo, estatus: lead.propiedades.estatus, totalLeads: 0 };
        }
        conteo[pId].totalLeads++;
      }
    });
    return Object.values(conteo).sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 5);
  });
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
          <LineChart class="w-7 h-7 text-indigo-400" />
          Panel de Rendimiento
        </h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          Métricas, Finanzas y Marketing Inteligente
        </p>
      </div>
      
      {#if tiempoPromedioCierre}
        <div class="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300">
            <Timer class="w-5 h-5" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Velocidad de Cierre</p>
            <p class="text-lg font-black text-white">{tiempoPromedioCierre} Días <span class="text-xs font-medium text-zinc-500 ml-1">en promedio</span></p>
          </div>
        </div>
      {/if}
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">

      <!-- TOP 4 KPIS -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div class="bg-zinc-950 p-6 rounded-3xl shadow-xl shadow-zinc-900/10 text-white relative overflow-hidden border border-zinc-800 flex flex-col justify-between">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Comisiones Potenciales</p>
            <DollarSign class="w-5 h-5 text-indigo-400" />
          </div>
          <div class="relative z-10">
            <h2 class="text-3xl font-black tracking-tighter truncate">{formatearDinero(pipelineValue)}</h2>
            <p class="text-[10px] font-semibold text-zinc-500 mt-1">En el pipeline activo actual</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Comisiones Ganadas</p>
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 truncate">{formatearDinero(revenueWon)}</h2>
            <p class="text-[10px] font-semibold text-slate-500 mt-1">De <strong class="text-emerald-600">{totalCierres} transacciones</strong> cerradas.</p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tasa de Cierre (Win Rate)</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Target class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 truncate">{tasaCierre}%</h2>
            <p class="text-[10px] font-semibold text-slate-500 mt-1">
              Conversión de <strong class="text-blue-600">{totalLeads} prospectos</strong>.
            </p>
          </div>
        </div>

        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leads Históricos</p>
            <div class="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 truncate">{totalLeads}</h2>
            <p class="text-[10px] font-semibold text-slate-500 mt-1">Registrados en la bóveda</p>
          </div>
        </div>

      </div>

      <!-- SECCIÓN EMBUDO AVANZADO Y ROI POR FUENTE -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        <!-- EMBUDO WATERFALL -->
        <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500" /> Embudo de Conversión
              </h3>
              <p class="text-xs font-semibold text-slate-400 mt-1">Identifica dónde pierdes prospectos.</p>
            </div>
            {#if leadsEstancados > 0}
              <div class="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2" title="Leads estancados > 15 días">
                <AlertTriangle class="w-3.5 h-3.5 text-rose-500" />
                <span class="text-[9px] font-black uppercase tracking-widest text-rose-600">{leadsEstancados} Estancados</span>
              </div>
            {/if}
          </div>

          <div class="space-y-4">
            {#each funnelAdvanced as etapa, i}
              {@const pct = i === 0 || funnelAdvanced[0].count === 0 ? 100 : Math.round((etapa.count / funnelAdvanced[0].count) * 100)}
              {@const perdidos = i > 0 ? funnelAdvanced[i-1].count - etapa.count : 0}
              
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-700">{etapa.label}</span>
                  <div class="flex items-center gap-3">
                    {#if perdidos > 0}
                      <span class="text-[9px] text-rose-400 font-bold bg-rose-50 px-1.5 rounded">-{perdidos} perdidos</span>
                    {/if}
                    <span class="text-sm font-black text-slate-900">{etapa.count}</span>
                    <span class="text-[10px] font-bold text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div class="h-5 bg-slate-100 rounded-lg overflow-hidden flex shadow-inner">
                  <div class="h-full rounded-lg transition-all duration-700" style="width:{pct}%; background:{etapa.color}"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- ROI POR FUENTE (ELIMINAMOS EL DONUT) -->
        <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col">
          <div class="mb-6">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <PieChart class="w-5 h-5 text-emerald-500" /> Retorno por Canal (ROI)
            </h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Descubre qué portal te genera más comisiones.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 space-y-4 scrollbar-thin">
            {#if fuentesROI.length === 0}
              <div class="h-full flex items-center justify-center opacity-50">
                <p class="text-xs font-bold text-slate-500">Aún no hay datos de cierre por fuente.</p>
              </div>
            {:else}
              {#each fuentesROI as fuente}
                {@const pctBar = (fuente.total / fuentesROI[0].total) * 100}
                <div class="flex items-center gap-3">
                  <div class="w-28 shrink-0">
                    <span class="text-xs font-bold text-slate-800 truncate block" title={fuente.nombre}>{fuente.nombre}</span>
                  </div>
                  <div class="flex-1 h-6 bg-slate-100 rounded-md overflow-hidden relative shadow-inner">
                    <div class="h-full rounded-md transition-all duration-500 flex items-center px-2 bg-indigo-500/20 border border-indigo-500/30" style="width:{pctBar}%;">
                      <span class="text-[9px] font-black text-indigo-700">{fuente.total}</span>
                    </div>
                  </div>
                  <div class="w-16 text-right shrink-0">
                    <span class="text-xs font-black {fuente.tasa > 10 ? 'text-emerald-600' : fuente.tasa > 5 ? 'text-amber-600' : 'text-slate-500'}">
                      {fuente.tasa.toFixed(1)}%
                    </span>
                    <p class="text-[8px] font-bold uppercase tracking-widest text-slate-400">Conversión</p>
                  </div>
                  <div class="w-20 text-right shrink-0">
                    {#if fuente.comision > 0}
                      <span class="text-xs font-black text-slate-900">{formatearDinero(fuente.comision)}</span>
                    {:else}
                      <span class="text-[10px] font-bold text-slate-300">--</span>
                    {/if}
                    <p class="text-[8px] font-bold uppercase tracking-widest text-slate-400">Comisión</p>
                  </div>
                </div>
              {/each}
              
              {#if fuentesROI.length >= 2}
                {@const mejor = fuentesROI.reduce((a,b) => a.tasa > b.tasa ? a : b)}
                <div class="mt-6 p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                  <Lightbulb class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p class="text-[10px] text-amber-800 leading-relaxed font-medium">
                    <strong class="font-black text-amber-900">{mejor.nombre}</strong> es tu canal con mejor conversión de cierre (<strong class="font-black">{mejor.tasa.toFixed(1)}%</strong>). Enfoca tus esfuerzos e inversión ahí.
                  </p>
                </div>
              {/if}
            {/if}
          </div>
        </div>

      </div>

      <!-- SECCIÓN GRÁFICAS FINANCIERAS Y TOP INVENTARIO -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        <!-- TENDENCIA 6 MESES -->
        <div class="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="mb-8">
            <h3 class="text-lg font-black text-slate-900">Comisiones generadas por mes</h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Total: {formatearDinero(tendenciaComisionesMeses.total)} MXN en los últimos 6 meses</p>
          </div>

          <div class="flex-1 flex flex-col justify-end min-h-[180px] mb-6 pt-4">
            <div class="flex justify-between items-end h-36 gap-3 sm:gap-6 relative">
              <div class="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                <div class="w-full h-px bg-slate-900"></div>
                <div class="w-full h-px bg-slate-900"></div>
                <div class="w-full h-px bg-slate-900"></div>
              </div>

              {#each tendenciaComisionesMeses.datos as mes, i}
                <div class="flex-1 flex flex-col items-center gap-2 group relative z-10 h-full justify-end">
                  <span class="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-slate-900 text-white px-2 py-1 rounded-md shadow-md z-20 whitespace-nowrap">
                    {formatearDinero(mes.count)}
                  </span>
                  
                  <div class="w-full max-w-[40px] {i === 5 ? 'bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)]' : 'bg-slate-100 hover:bg-slate-200'} rounded-t-lg transition-all duration-500 cursor-pointer relative" style="height: {(mes.count / tendenciaComisionesMeses.maxCount) * 100}%"></div>
                  
                  <span class="text-[10px] font-bold {i === 5 ? 'text-emerald-600' : 'text-slate-400'} capitalize mt-1 flex items-center gap-0.5">
                    {mes.label} {#if i === 5}<span class="text-[8px]">↑</span>{/if}
                  </span>
                </div>
              {/each}
            </div>
            <div class="w-full h-px bg-slate-200 mt-2"></div>
          </div>

          <div class="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Promedio mensual</p>
              <p class="text-xl font-black text-slate-900">{formatearDinero(tendenciaComisionesMeses.promedio)}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mejor mes</p>
              <p class="text-xl font-black text-emerald-600 capitalize"><span class="text-sm font-bold text-slate-900 truncate block sm:inline">{tendenciaComisionesMeses.mejorMes.label}</span> • {formatearDinero(tendenciaComisionesMeses.mejorMes.count)}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Crecimiento</p>
              <p class="text-xl font-black {tendenciaComisionesMeses.tendencia >= 0 ? 'text-emerald-600' : 'text-rose-500'}">
                {tendenciaComisionesMeses.tendencia >= 0 ? '↑' : '↓'} {Math.abs(tendenciaComisionesMeses.tendencia)}%
              </p>
            </div>
          </div>
        </div>

        <!-- TOP INVENTARIO -->
        <div class="lg:col-span-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="mb-6 pb-4 border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 class="w-5 h-5 text-amber-500" /> Top Inventario
            </h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Propiedades con mayor tracción comercial.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 scrollbar-thin">
            {#if rendimientoPropiedades.length === 0}
              <div class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                <RefreshCw class="w-10 h-10 text-slate-400 mb-3" />
                <p class="text-sm font-bold text-slate-500">Aún no hay datos</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each rendimientoPropiedades as prop, i}
                  <div class="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 transition-colors shadow-sm">
                    <div class="flex items-center gap-3 truncate pr-4">
                      <div class="w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                        {i + 1}
                      </div>
                      <div class="truncate">
                        <h4 class="text-sm font-bold text-slate-900 truncate" title={prop.titulo}>{prop.titulo}</h4>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{prop.estatus}</p>
                      </div>
                    </div>
                    <div class="text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                      <p class="text-sm font-black text-blue-600">{prop.totalLeads}</p>
                      <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Leads</p>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
        
      </div>

    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
