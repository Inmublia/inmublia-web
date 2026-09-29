<!-- src/routes/admin/reportes/+page.svelte -->
<script>
  import { 
    TrendingUp, Activity, BarChart3, RefreshCw, LineChart, PieChart, Building2,
    DollarSign, CheckCircle2, Clock, Users, Timer, Target, AlertTriangle, Lightbulb
  } from 'lucide-svelte';

  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let comisionBroker = $derived((broker.comision_default || 5) / 100);
  
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  let totalLeads = $derived(leads.length);
  
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

  let funnelAdvanced = $derived.by(() => {
    const etapas = [
      { id: 'nuevo', label: 'Prospectos Captados', color: '#6366F1' },
      { id: 'contactado', label: 'Contactados', color: '#3B82F6' },
      { id: 'visita', label: 'Visitas / Citas', color: '#8B5CF6' },
      { id: 'negociacion', label: 'En Negociación', color: '#F59E0B' },
      { id: 'cerrado', label: 'Cierres (Ganados)', color: '#10B981' }
    ];

    return etapas.map((etapa, i) => {
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
      .sort((a, b) => b.tasa - a.tasa); 
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

<div class="fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<!-- 🚀 FIX: Arquitectura Split-Screen B2B. Bloqueamos el scroll global en Desktop (lg:h-screen lg:overflow-hidden) -->
<div class="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 animate-[fadeIn_0.3s_ease-out] relative min-h-screen lg:h-screen lg:overflow-hidden">
  
  <!-- ============================================== -->
  <!-- ZONA SUPERIOR ESTÁTICA (Enmarcada en tu imagen) -->
  <!-- ============================================== -->
  <div class="w-full shrink-0 flex flex-col relative z-30 pb-4 lg:pb-6 shadow-sm dark:shadow-none bg-slate-50/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-zinc-800/50 transition-colors duration-300">
    
    <PageHeader title="Panel de Rendimiento" icon={LineChart}>
      {#snippet subtitle()}
        Métricas, Finanzas y Marketing Inteligente
      {/snippet}

      {#snippet actions()}
        {#if tiempoPromedioCierre}
          <div class="bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-slate-200 dark:border-zinc-800 px-5 py-3 rounded-2xl flex items-center gap-4 transition-colors shadow-sm">
            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
              <Timer class="w-5 h-5" />
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Velocidad de Cierre</p>
              <p class="text-lg font-black text-slate-900 dark:text-white">{tiempoPromedioCierre} Días <span class="text-xs font-medium text-slate-400 dark:text-zinc-500 ml-1">en promedio</span></p>
            </div>
          </div>
        {/if}
      {/snippet}
    </PageHeader>

    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 relative z-20 -mt-16">
      <!-- TOP 4 KPIS -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div class="bg-zinc-950 p-6 rounded-3xl shadow-md shadow-zinc-900/10 text-white relative overflow-hidden border border-zinc-800 flex flex-col justify-between transition-colors">
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

        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Comisiones Ganadas</p>
            <div class="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-transparent">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{formatearDinero(revenueWon)}</h2>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">De <strong class="text-emerald-600 dark:text-emerald-400">{totalCierres} transacciones</strong> cerradas.</p>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Tasa de Cierre (Win Rate)</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-transparent">
              <Target class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{tasaCierre}%</h2>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">
              Conversión de <strong class="text-blue-600 dark:text-blue-400">{totalLeads} prospectos</strong>.
            </p>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-zinc-600 transition-all">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Leads Históricos</p>
            <div class="w-8 h-8 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-sm dark:shadow-none transition-colors">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{totalLeads}</h2>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">Registrados en la bóveda</p>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- ============================================== -->
  <!-- ZONA INFERIOR SCROLLABLE INDEPENDIENTE         -->
  <!-- ============================================== -->
  <!-- 🚀 FIX: Esta zona tiene su propio scrollbar estilizado. Nunca pisará las tarjetas superiores -->
  <main class="w-full flex-1 relative z-20 pt-6 pb-12 overflow-visible lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">

      <!-- SECCIÓN EMBUDO AVANZADO Y ROI POR FUENTE -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        <!-- EMBUDO WATERFALL -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm transition-colors">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Embudo de Conversión
              </h3>
              <p class="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-1">Identifica dónde pierdes prospectos.</p>
            </div>
            {#if leadsEstancados > 0}
              <div class="bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 flex items-center gap-2 transition-colors" title="Leads estancados > 15 días">
                <AlertTriangle class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span class="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">{leadsEstancados} Estancados</span>
              </div>
            {/if}
          </div>

          <div class="space-y-4">
            {#each funnelAdvanced as etapa, i}
              {@const pct = i === 0 || funnelAdvanced[0].count === 0 ? 100 : Math.round((etapa.count / funnelAdvanced[0].count) * 100)}
              {@const perdidos = i > 0 ? funnelAdvanced[i-1].count - etapa.count : 0}
              
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-700 dark:text-zinc-300">{etapa.label}</span>
                  <div class="flex items-center gap-3">
                    {#if perdidos > 0}
                      <span class="text-[9px] text-rose-500 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-1.5 rounded border border-rose-100 dark:border-rose-500/20 transition-colors">-{perdidos} perdidos</span>
                    {/if}
                    <span class="text-sm font-black text-slate-900 dark:text-white">{etapa.count}</span>
                    <span class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div class="h-5 bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex shadow-inner transition-colors">
                  <div class="h-full rounded-lg transition-all duration-700" style="width:{pct}%; background:{etapa.color}"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- ROI POR FUENTE -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col transition-colors">
          <div class="mb-6">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart class="w-5 h-5 text-emerald-500 dark:text-emerald-400" /> Retorno por Canal (ROI)
            </h3>
            <p class="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-1">Descubre qué portal te genera más comisiones.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 space-y-4 scrollbar-thin dark:scrollbar-thumb-zinc-700">
            {#if fuentesROI.length === 0}
              <div class="h-full flex items-center justify-center opacity-50">
                <p class="text-xs font-bold text-slate-500 dark:text-zinc-500">Aún no hay datos de cierre por fuente.</p>
              </div>
            {:else}
              {#each fuentesROI as fuente}
                {@const pctBar = (fuente.total / fuentesROI[0].total) * 100}
                <div class="flex items-center gap-3">
                  <div class="w-28 shrink-0">
                    <span class="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block" title={fuente.nombre}>{fuente.nombre}</span>
                  </div>
                  <div class="flex-1 h-6 bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden relative shadow-inner transition-colors">
                    <div class="h-full rounded-md transition-all duration-500 flex items-center px-2 bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30" style="width:{pctBar}%;">
                      <span class="text-[9px] font-black text-indigo-600 dark:text-indigo-400">{fuente.total}</span>
                    </div>
                  </div>
                  <div class="w-16 text-right shrink-0">
                    <span class="text-xs font-black {fuente.tasa > 10 ? 'text-emerald-600 dark:text-emerald-400' : fuente.tasa > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-500'}">
                      {fuente.tasa.toFixed(1)}%
                    </span>
                    <p class="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">Conversión</p>
                  </div>
                  <div class="w-20 text-right shrink-0">
                    {#if fuente.comision > 0}
                      <span class="text-xs font-black text-slate-900 dark:text-white">{formatearDinero(fuente.comision)}</span>
                    {:else}
                      <span class="text-[10px] font-bold text-slate-300 dark:text-zinc-700">--</span>
                    {/if}
                    <p class="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">Comisión</p>
                  </div>
                </div>
              {/each}
              
              {#if fuentesROI.length >= 2}
                {@const mejor = fuentesROI.reduce((a,b) => a.tasa > b.tasa ? a : b)}
                <div class="mt-6 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20 flex items-start gap-2 transition-colors">
                  <Lightbulb class="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p class="text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed font-medium">
                    <strong class="font-black text-amber-900 dark:text-amber-100">{mejor.nombre}</strong> es tu canal con mejor conversión de cierre (<strong class="font-black">{mejor.tasa.toFixed(1)}%</strong>). Enfoca tus esfuerzos e inversión ahí.
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
        <div class="lg:col-span-8 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col transition-colors">
          <div class="mb-8">
            <h3 class="text-lg font-black text-slate-900 dark:text-white">Comisiones generadas por mes</h3>
            <p class="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-1">Total: {formatearDinero(tendenciaComisionesMeses.total)} MXN en los últimos 6 meses</p>
          </div>

          <div class="flex-1 flex flex-col justify-end min-h-[180px] mb-6 pt-4">
            <div class="flex justify-between items-end h-36 gap-3 sm:gap-6 relative">
              <!-- Líneas Guía (Grid) -->
              <div class="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                <div class="w-full h-px bg-slate-900 dark:bg-white"></div>
                <div class="w-full h-px bg-slate-900 dark:bg-white"></div>
                <div class="w-full h-px bg-slate-900 dark:bg-white"></div>
              </div>

              {#each tendenciaComisionesMeses.datos as mes, i}
                <div class="flex-1 flex flex-col items-center gap-2 group relative z-10 h-full justify-end">
                  <span class="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white px-2 py-1 rounded-md shadow-md z-20 whitespace-nowrap border border-slate-200 dark:border-zinc-700">
                    {formatearDinero(mes.count)}
                  </span>
                  
                  <div class="w-full max-w-[40px] {i === 5 ? 'bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)] dark:shadow-[0_4px_15px_rgba(16,185,129,0.2)]' : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'} rounded-t-lg transition-all duration-500 cursor-pointer relative" style="height: {(mes.count / tendenciaComisionesMeses.maxCount) * 100}%"></div>
                  
                  <span class="text-[10px] font-bold {i === 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-zinc-500'} capitalize mt-1 flex items-center gap-0.5 transition-colors">
                    {mes.label} {#if i === 5}<span class="text-[8px]">↑</span>{/if}
                  </span>
                </div>
              {/each}
            </div>
            <div class="w-full h-px bg-slate-200 dark:bg-zinc-800 mt-2 transition-colors"></div>
          </div>

          <div class="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Promedio mensual</p>
              <p class="text-xl font-black text-slate-900 dark:text-white">{formatearDinero(tendenciaComisionesMeses.promedio)}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Mejor mes</p>
              <p class="text-xl font-black text-emerald-600 dark:text-emerald-400 capitalize"><span class="text-sm font-bold text-slate-900 dark:text-white truncate block sm:inline">{tendenciaComisionesMeses.mejorMes.label}</span> • {formatearDinero(tendenciaComisionesMeses.mejorMes.count)}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Crecimiento</p>
              <p class="text-xl font-black {tendenciaComisionesMeses.tendencia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}">
                {tendenciaComisionesMeses.tendencia >= 0 ? '↑' : '↓'} {Math.abs(tendenciaComisionesMeses.tendencia)}%
              </p>
            </div>
          </div>
        </div>

        <!-- TOP INVENTARIO -->
        <div class="lg:col-span-4 bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col transition-colors">
          <div class="mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 class="w-5 h-5 text-amber-500 dark:text-amber-400" /> Top Inventario
            </h3>
            <p class="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-1">Propiedades con mayor tracción comercial.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 scrollbar-thin dark:scrollbar-thumb-zinc-700">
            {#if rendimientoPropiedades.length === 0}
              <div class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                <RefreshCw class="w-10 h-10 text-slate-400 dark:text-zinc-500 mb-3" />
                <p class="text-sm font-bold text-slate-500 dark:text-zinc-400">Aún no hay datos</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each rendimientoPropiedades as prop, i}
                  <div class="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-zinc-700/50 bg-slate-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 hover:border-slate-200 dark:hover:border-zinc-600 transition-colors shadow-sm dark:shadow-none">
                    <div class="flex items-center gap-3 truncate pr-4">
                      <div class="w-7 h-7 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm dark:shadow-none transition-colors">
                        {i + 1}
                      </div>
                      <div class="truncate">
                        <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate" title={prop.titulo}>{prop.titulo}</h4>
                        <p class="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">{prop.estatus}</p>
                      </div>
                    </div>
                    <div class="text-right shrink-0 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-zinc-700/50 shadow-sm dark:shadow-none transition-colors">
                      <p class="text-sm font-black text-blue-600 dark:text-blue-400">{prop.totalLeads}</p>
                      <p class="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Leads</p>
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
