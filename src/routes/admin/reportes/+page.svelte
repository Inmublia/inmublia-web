<!-- src/routes/admin/reportes/+page.svelte -->
<script>
  import { 
    TrendingUp, Activity, BarChart3, RefreshCw, LineChart, PieChart, Building2,
    DollarSign, CheckCircle2, Clock, Users, Timer, Target, AlertTriangle, Lightbulb, Download
  } from 'lucide-svelte';

  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);
  let metricas = $derived(data.metricas || {});
  let aiInsight = $derived(data.aiInsight || null);

  let comisionBroker = $derived((broker.comision_default || 5) / 100);
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  // Filtro de Tiempo (Feature 4)
  let periodoSeleccionado = $state('all');

  let leadsFiltrados = $derived.by(() => {
    if (periodoSeleccionado === 'all') return leads;
    const dias = parseInt(periodoSeleccionado);
    const limite = new Date(Date.now() - (dias * 86400000));
    return leads.filter(l => new Date(l.creado_en || l.created_at) >= limite);
  });

  let totalLeads = $derived(leadsFiltrados.length);
  let leadsGanados = $derived(leadsFiltrados.filter(l => l.estado?.toLowerCase().trim() === 'cerrado'));
  let tasaCierre = $derived(totalLeads > 0 ? ((leadsGanados.length / totalLeads) * 100).toFixed(1) : '0.0');

  let pipelineValue = $derived(leadsFiltrados.reduce((acc, lead) => {
    const est = lead.estado?.toLowerCase().trim();
    if (est !== 'descartado' && est !== 'cerrado' && lead.propiedades?.precio) {
      return acc + (lead.propiedades.precio * comisionBroker);
    }
    return acc;
  }, 0));

  let revenueWon = $derived.by(() => {
    return leadsGanados.reduce((acc, lead) => {
      const precioBase = lead.precio_cierre || lead.propiedades?.precio || 0;
      const pct = lead.comision_cierre ? (lead.comision_cierre / 100) : comisionBroker;
      return acc + (precioBase * pct);
    }, 0);
  });

  // Embudo Acumulativo (FIX I1)
  let funnelAdvanced = $derived.by(() => {
    const etapas = [
      { id: 'nuevo', label: 'Prospectos Captados', color: '#6366F1' },
      { id: 'contactado', label: 'Contactados', color: '#3B82F6' },
      { id: 'visita', label: 'Visitas / Citas', color: '#8B5CF6' },
      { id: 'negociacion', label: 'En Negociación', color: '#F59E0B' },
      { id: 'cerrado', label: 'Cierres (Ganados)', color: '#10B981' }
    ];

    return etapas.map((etapa, i) => {
      const count = leadsFiltrados.filter(l => {
        const est = l.estado?.toLowerCase().trim();
        // Lógica acumulativa: si está en cerrado, pasó por todas las anteriores.
        if (est === 'descartado') return false;
        if (i === 0) return true;
        if (i === 1) return ['contactado', 'visita', 'negociacion', 'cerrado'].includes(est);
        if (i === 2) return ['visita', 'negociacion', 'cerrado'].includes(est);
        if (i === 3) return ['negociacion', 'cerrado'].includes(est);
        if (i === 4) return est === 'cerrado';
        return false;
      }).length;
      return { ...etapa, count };
    });
  });

  // Feature 5: Pseudo-Export
  function imprimirReporte() {
    window.print();
  }
</script>

<div class="fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<div class="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 animate-[fadeIn_0.3s_ease-out] relative min-h-screen lg:h-screen lg:overflow-hidden">
  
  <div class="w-full shrink-0 flex flex-col relative z-30 pb-2 lg:pb-4 transition-colors duration-300 print:hidden">
    <PageHeader title="Panel de Rendimiento" icon={LineChart}>
      {#snippet subtitle()} Métricas, Finanzas y Marketing Inteligente {/snippet}
      {#snippet actions()}
        <div class="flex items-center gap-3">
          <select bind:value={periodoSeleccionado} class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer">
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="180">Últimos 6 meses</option>
            <option value="all">Todo el historial</option>
          </select>
          <button onclick={imprimirReporte} class="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl shadow-md transition-all active:scale-95" title="Exportar PDF">
            <Download class="w-5 h-5" />
          </button>
        </div>
      {/snippet}
    </PageHeader>

    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 relative z-20 -mt-16">
      
      <!-- TOP 4 KPIS -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <!-- KPI 1: Proyección de Ventas (Reemplaza Comisión Potencial Pasiva) -->
        <div class="bg-zinc-950 p-6 rounded-3xl shadow-md shadow-zinc-900/10 text-white relative overflow-hidden border border-zinc-800 flex flex-col justify-between transition-colors">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proyección Próx. Mes</p>
            <TrendingUp class="w-5 h-5 text-indigo-400" />
          </div>
          <div class="relative z-10">
            <h2 class="text-3xl font-black tracking-tighter truncate">{formatearDinero(metricas.proyeccionVentas)}</h2>
            <p class="text-[10px] font-semibold text-zinc-500 mt-1">Pipeliene total: {formatearDinero(pipelineValue)}</p>
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
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">De <strong class="text-emerald-600 dark:text-emerald-400">{leadsGanados.length} transacciones</strong>.</p>
          </div>
        </div>

        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Win Rate</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-transparent">
              <Target class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{tasaCierre}%</h2>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">De <strong class="text-blue-600 dark:text-blue-400">{totalLeads} prospectos</strong>.</p>
          </div>
        </div>

        <!-- KPI 4: Velocidad de Respuesta (Feature 2) -->
        <div class="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 flex flex-col justify-between transition-colors">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Respuesta Rápida</p>
            <div class="w-8 h-8 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-sm transition-colors">
              <Timer class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-3xl font-black tracking-tighter text-slate-900 dark:text-white truncate">{metricas.velocidadMedia !== null ? `${metricas.velocidadMedia}h` : '--'}</h2>
            <p class="text-[10px] font-semibold text-slate-500 dark:text-zinc-500 mt-1">{metricas.pctEn1h}% respondidos en < 1h.</p>
          </div>
        </div>

      </div>
    </div>
  </div>

  <main class="w-full flex-1 relative z-20 pt-4 pb-12 overflow-visible lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">

      <!-- Insight Engine Inteligente (Feature 1 Adaptada) -->
      {#if aiInsight}
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700/30 rounded-2xl p-5 mb-6 shadow-sm print:shadow-none">
          <div class="flex items-center gap-2 mb-3">
            <Lightbulb class="w-4 h-4 text-indigo-500" />
            <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">✨ Análisis Smart de Inmublia</span>
          </div>
          <p class="text-sm font-medium text-slate-700 dark:text-zinc-300 mb-3 leading-relaxed">{aiInsight.resumen}</p>
          {#if aiInsight.accion_prioritaria}
            <div class="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 border border-indigo-100 dark:border-indigo-800/30">
              <p class="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Recomendación para hoy</p>
              <p class="text-sm font-bold text-slate-900 dark:text-white">{aiInsight.accion_prioritaria}</p>
            </div>
          {/if}
        </div>
      {/if}

      <!-- EMBUDO Y ROI -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        <!-- Embudo Acumulativo -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm transition-colors">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500" /> Embudo Acumulativo
              </h3>
              <p class="text-xs font-semibold text-slate-400 mt-1">Leads que llegaron a cada etapa.</p>
            </div>
            {#if metricas.leadsEstancados > 0}
              <div class="bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-500/20 flex items-center gap-2">
                <AlertTriangle class="w-3.5 h-3.5 text-rose-500" />
                <span class="text-[9px] font-black uppercase tracking-widest text-rose-600">{metricas.leadsEstancados} Inactivos > 15d</span>
              </div>
            {/if}
          </div>

          <div class="space-y-4">
            {#each funnelAdvanced as etapa, i}
              {@const baseCount = funnelAdvanced[0].count}
              {@const pct = baseCount === 0 ? 0 : Math.round((etapa.count / baseCount) * 100)}
              {@const perdidos = i > 0 ? funnelAdvanced[i-1].count - etapa.count : 0}
              
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-700 dark:text-zinc-300">{etapa.label}</span>
                  <div class="flex items-center gap-3">
                    {#if perdidos > 0}
                      <span class="text-[9px] text-rose-500 font-bold bg-rose-50 px-1.5 rounded border border-rose-100">-{perdidos}</span>
                    {/if}
                    <span class="text-sm font-black text-slate-900 dark:text-white">{etapa.count}</span>
                    <span class="text-[10px] font-bold text-slate-400 w-8 text-right">{pct}%</span>
                  </div>
                </div>
                <div class="h-5 bg-slate-100 dark:bg-zinc-800 rounded-lg overflow-hidden flex shadow-inner">
                  <div class="h-full rounded-lg transition-all duration-700" style="width:{pct}%; background:{etapa.color}"></div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- ROI Por Fuente Pre-calculado en Servidor -->
        <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8 shadow-sm flex flex-col">
          <div class="mb-6">
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart class="w-5 h-5 text-emerald-500" /> Retorno por Canal (Histórico)
            </h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Tasas de cierre calculadas desde backend.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 space-y-4 scrollbar-thin">
            {#if metricas.fuentesROI.length === 0}
              <div class="h-full flex items-center justify-center opacity-50">
                <p class="text-xs font-bold text-slate-500">Sin cierres registrados aún.</p>
              </div>
            {:else}
              {#each metricas.fuentesROI as fuente}
                {@const pctBar = (fuente.total / metricas.fuentesROI[0].total) * 100}
                <div class="flex items-center gap-3">
                  <div class="w-28 shrink-0">
                    <span class="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block" title={fuente.nombre}>{fuente.nombre}</span>
                  </div>
                  <div class="flex-1 h-6 bg-slate-100 dark:bg-zinc-800 rounded-md overflow-hidden relative shadow-inner">
                    <div class="h-full rounded-md transition-all flex items-center px-2 bg-indigo-50 dark:bg-indigo-500/20" style="width:{pctBar}%;">
                      <span class="text-[9px] font-black text-indigo-600">{fuente.total}</span>
                    </div>
                  </div>
                  <div class="w-16 text-right shrink-0">
                    <span class="text-xs font-black {fuente.tasa > 5 ? 'text-emerald-600' : 'text-slate-500'}">{fuente.tasa.toFixed(1)}%</span>
                    <p class="text-[8px] font-bold uppercase text-slate-400">Cierre</p>
                  </div>
                  <div class="w-20 text-right shrink-0">
                    <span class="text-xs font-black">{formatearDinero(fuente.comision)}</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

      </div>

      <!-- Rendimiento Propiedades -->
      <div class="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-zinc-800 transition-colors">
        <div class="mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/50 flex justify-between items-center">
          <div>
            <h3 class="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 class="w-5 h-5 text-amber-500" /> Rendimiento de Inventario
            </h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Propiedades que generan leads vs las que convierten.</p>
          </div>
        </div>

        <div class="overflow-auto scrollbar-thin">
          {#if metricas.rendimientoPropiedades.length === 0}
            <div class="flex flex-col items-center opacity-50 py-10">
              <RefreshCw class="w-10 h-10 text-slate-400 mb-3" />
              <p class="text-sm font-bold">Aún no hay interacciones registradas</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each metricas.rendimientoPropiedades as prop}
                <div class="p-4 rounded-xl border border-slate-100 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 shadow-sm">
                  <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate mb-3" title={prop.titulo}>{prop.titulo}</h4>
                  <div class="flex justify-between items-end">
                    <div>
                      <p class="text-xl font-black text-blue-600">{prop.totalLeads}</p>
                      <p class="text-[9px] font-black uppercase text-slate-400">Leads Totales</p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-black {prop.convertidos > 0 ? 'text-emerald-500' : 'text-slate-400'}">{prop.tasa}%</p>
                      <p class="text-[9px] font-black uppercase text-slate-400">Conversión ({prop.convertidos} cierres)</p>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    </div>
  </main>
</div>

<style>
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
