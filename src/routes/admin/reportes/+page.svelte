<!-- src/routes/admin/reportes/+page.svelte -->
<script>
  import { 
    TrendingUp, 
    Activity, 
    BarChart3, 
    RefreshCw, 
    LineChart,
    PieChart,
    Building2,
    DollarSign,
    CheckCircle2,
    Clock,
    Users
  } from 'lucide-svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let comisionBroker = $derived((broker.comision_default || 5) / 100);
  
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  // 🚀 FIX: CÁLCULOS CRUZADOS (LEADS + PROPIEDADES VENDIDAS)
  let totalLeads = $derived(leads.length);
  
  // Propiedades que se marcaron como "Vendida" en el inventario
  let propiedadesVendidas = $derived(propiedades.filter(p => p.estatus === 'Vendida'));
  
  // Leads ganados en el CRM
  let leadsGanados = $derived(leads.filter(l => l.estado === 'cerrado'));
  
  // 🚀 Tasa de Cierre General: (Leads Ganados / Total de Leads)
  let tasaCierre = $derived(totalLeads > 0 ? ((leadsGanados.length / totalLeads) * 100).toFixed(1) : 0);
  
  let leadsEstancados = $derived(leads.filter(l => {
    if (l.estado === 'cerrado' || l.estado === 'descartado') return false;
    const dias = Math.floor((new Date() - new Date(l.creado_en)) / (1000 * 60 * 60 * 24));
    return dias > 15;
  }).length);

  let pipelineValue = $derived(leads.reduce((acc, lead) => {
    if (lead.estado !== 'descartado' && lead.estado !== 'cerrado' && lead.propiedades?.precio) {
      return acc + (lead.propiedades.precio * comisionBroker);
    }
    return acc;
  }, 0));

  // 🚀 FIX: Comisiones Ganadas Reales (Leads Cerrados + Inventario Vendido Huerfano)
  let revenueWon = $derived.by(() => {
    // 1. Sumamos lo cerrado en el CRM (que tiene prioridad de datos exactos)
    let totalCrm = leadsGanados.reduce((acc, lead) => {
      const precioBase = lead.precio_cierre || lead.propiedades?.precio || 0;
      const porcentajeCierre = lead.comision_cierre ? (lead.comision_cierre / 100) : comisionBroker;
      return acc + (precioBase * porcentajeCierre);
    }, 0);

    // 2. Sumamos las propiedades "Vendidas" que NO tienen un lead cerrado asociado para evitar duplicidad
    const idsPropiedadesCerradasEnCrm = leadsGanados.map(l => l.propiedades?.id).filter(id => id);
    let totalInventarioHuerfano = propiedadesVendidas
      .filter(p => !idsPropiedadesCerradasEnCrm.includes(p.id))
      .reduce((acc, prop) => {
         return acc + ((prop.precio || 0) * comisionBroker);
      }, 0);

    return totalCrm + totalInventarioHuerfano;
  });

  // 🚀 FIX: Transacciones Totales
  let totalCierres = $derived.by(() => {
     const idsPropiedadesCerradasEnCrm = leadsGanados.map(l => l.propiedades?.id).filter(id => id);
     const huerfanos = propiedadesVendidas.filter(p => !idsPropiedadesCerradasEnCrm.includes(p.id)).length;
     return leadsGanados.length + huerfanos;
  });

  let funnel = $derived({
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    visita: leads.filter(l => l.estado === 'visita').length,
    negociacion: leads.filter(l => l.estado === 'negociacion').length,
    cerrado: leads.filter(l => l.estado === 'cerrado').length,
    descartado: leads.filter(l => l.estado === 'descartado').length
  });

  let maxFunnelValue = $derived(Math.max(funnel.nuevo, funnel.contactado, funnel.visita, funnel.negociacion, funnel.cerrado, 1));

  let rendimientoPropiedades = $derived.by(() => {
    const conteo = {};
    leads.forEach(lead => {
      if (lead.propiedades) {
        const pId = lead.propiedades.id;
        if (!conteo[pId]) {
          conteo[pId] = { titulo: lead.propiedades.titulo, precio: lead.propiedades.precio, estatus: lead.propiedades.estatus, totalLeads: 0 };
        }
        conteo[pId].totalLeads++;
      }
    });
    return Object.values(conteo).sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 5);
  });

  // -------------------------------------------------------------
  // Lógica Gráfica Tendencia 6 Meses (COMISIONES GENERADAS)
  // -------------------------------------------------------------
  let tendenciaComisionesMeses = $derived.by(() => {
    const hoy = new Date();
    const meses = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      meses.push({
        m: d.getMonth(), 
        y: d.getFullYear(), 
        label: d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''),
        count: 0 // Aquí sumaremos el dinero
      });
    }

    // Sumamos comisiones de CRM
    leadsGanados.forEach(l => {
      const d = new Date(l.updated_at || l.creado_en); // Fecha de cierre o creación
      const match = meses.find(x => x.m === d.getMonth() && x.y === d.getFullYear());
      if (match) {
        const precioBase = l.precio_cierre || l.propiedades?.precio || 0;
        const porcentajeCierre = l.comision_cierre ? (l.comision_cierre / 100) : comisionBroker;
        match.count += (precioBase * porcentajeCierre);
      }
    });

    // Sumamos comisiones huerfanas de inventario
    const idsPropiedadesCerradasEnCrm = leadsGanados.map(l => l.propiedades?.id).filter(id => id);
    propiedadesVendidas.forEach(p => {
       if(!idsPropiedadesCerradasEnCrm.includes(p.id)) {
          const d = new Date(p.updated_at);
          const match = meses.find(x => x.m === d.getMonth() && x.y === d.getFullYear());
          if (match) {
             match.count += ((p.precio || 0) * comisionBroker);
          }
       }
    });

    const total6m = meses.reduce((sum, curr) => sum + curr.count, 0);
    const promedio = (total6m / 6);
    
    let mejorMes = meses[0];
    meses.forEach(m => { if(m.count > mejorMes.count) mejorMes = m; });

    const esteMes = meses[5].count;
    const mesPasado = meses[4].count;
    let tendPct = 0;
    if (mesPasado > 0) tendPct = ((esteMes - mesPasado) / mesPasado) * 100;
    else if (esteMes > 0) tendPct = 100;

    const maxCount = Math.max(...meses.map(m => m.count), 1);

    return { datos: meses, total: total6m, promedio, mejorMes, tendencia: tendPct.toFixed(0), maxCount };
  });

  // -------------------------------------------------------------
  // Lógica Donut Chart (Últimos 30 días)
  // -------------------------------------------------------------
  let origenes30Dias = $derived.by(() => {
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    let org = 0, red = 0, dir = 0;
    let total = 0;

    leads.forEach((l) => {
      if (new Date(l.creado_en) >= hace30Dias) {
        total++;
        const f = (l.fuente || l.origen || 'directo').toLowerCase().trim();
        if (['facebook', 'fb', 'instagram', 'ig', 'meta', 'tiktok', 'redes', 'ads', 'pixel'].some(kw => f.includes(kw))) {
          red++;
        } else if (['google', 'seo', 'organico', 'búsqueda', 'busqueda'].some(kw => f.includes(kw))) {
          org++;
        } else {
          dir++;
        }
      }
    });
    
    if (total === 0) return { total: 0, pOrg: 0, pRed: 0, pDir: 0, c1: 0, c2: 0 };
    
    const pOrg = Math.round((org/total)*100);
    const pRed = Math.round((red/total)*100);
    const pDir = Math.round((dir/total)*100);

    return { total, pOrg, pRed, pDir, c1: pOrg, c2: pOrg + pRed };
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
          Métricas, Finanzas y Marketing
        </p>
      </div>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-8">

      <!-- TOP 4 KPIS -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div class="bg-zinc-950 p-8 rounded-3xl shadow-xl shadow-zinc-900/10 text-white relative overflow-hidden border border-zinc-800 flex flex-col justify-between">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Comisiones Potenciales ({broker.comision_default || 5}%)</p>
            <DollarSign class="w-5 h-5 text-indigo-400" />
          </div>
          <div class="relative z-10">
            <h2 class="text-4xl font-black tracking-tighter truncate">{formatearDinero(pipelineValue)}</h2>
            <p class="text-[11px] font-semibold text-zinc-500 mt-2 flex items-center gap-1.5">
              <Activity class="w-3.5 h-3.5" /> En el pipeline activo actual
            </p>
          </div>
        </div>

        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Comisiones Ganadas</p>
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{formatearDinero(revenueWon)}</h2>
            <p class="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
              Calculado de <strong class="text-emerald-600">{totalCierres} transacciones</strong>.
            </p>
          </div>
        </div>

        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tasa de Cierre (CRM)</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <TrendingUp class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{tasaCierre}%</h2>
            <p class="text-[11px] font-semibold text-slate-500 mt-2 flex items-center justify-between">
              <span>De un histórico de <strong class="text-blue-600">{totalLeads} prospectos</strong>.</span>
            </p>
          </div>
        </div>

        <!-- Tarjeta de Leads Históricos -->
        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leads Históricos</p>
            <div class="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200 shadow-sm">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{totalLeads}</h2>
            <p class="text-[11px] font-semibold text-slate-500 mt-2">Registrados en la bóveda</p>
          </div>
        </div>

      </div>

      <!-- SECCIÓN GRÁFICAS (Tendencia Financiera y Donut) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div class="lg:col-span-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="mb-8">
            <h3 class="text-lg font-black text-slate-900">Comisiones generadas por mes</h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Total: {formatearDinero(tendenciaComisionesMeses.total)} MXN en los últimos 6 meses</p>
          </div>

          <div class="flex-1 flex flex-col justify-end min-h-[180px] mb-6 pt-4">
            <div class="flex justify-between items-end h-32 gap-3 sm:gap-6 relative">
              <div class="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                <div class="w-full h-px bg-slate-900"></div>
                <div class="w-full h-px bg-slate-900"></div>
                <div class="w-full h-px bg-slate-900"></div>
              </div>

              {#each tendenciaComisionesMeses.datos as mes, i}
                <div class="flex-1 flex flex-col items-center gap-2 group relative z-10 h-full justify-end">
                  <span class="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-sm">
                    {formatearDinero(mes.count)}
                  </span>
                  
                  <div class="w-full max-w-[40px] {i === 5 ? 'bg-emerald-500 shadow-[0_4px_15px_rgba(16,185,129,0.4)]' : 'bg-slate-100 hover:bg-slate-200'} rounded-t-lg transition-all duration-500 cursor-pointer" style="height: {(mes.count / tendenciaComisionesMeses.maxCount) * 100}%"></div>
                  
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

        <div class="lg:col-span-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="mb-8">
            <h3 class="text-lg font-black text-slate-900">Leads por portal de origen</h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Últimos 30 días</p>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center">
            {#if origenes30Dias.total === 0}
              <div class="opacity-50 text-center">
                <PieChart class="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sin datos recientes</p>
              </div>
            {:else}
              <div class="relative w-44 h-44 rounded-full mb-8 shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)] transition-transform hover:scale-105 duration-300" style="background: conic-gradient(
                #10b981 0% {origenes30Dias.c1}%, 
                #3b82f6 {origenes30Dias.c1}% {origenes30Dias.c2}%, 
                #cbd5e1 {origenes30Dias.c2}% 100%
              );">
                <div class="absolute inset-0 m-auto w-32 h-32 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                  <span class="text-3xl font-black text-slate-900 leading-none mb-1">{origenes30Dias.total}</span>
                  <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Leads/mes</span>
                </div>
              </div>

              <div class="w-full space-y-4 px-2">
                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                  <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-md bg-emerald-500 shadow-sm"></span> Búsqueda Orgánica</div>
                  <span class="text-slate-900 font-black">{origenes30Dias.pOrg}%</span>
                </div>
                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                  <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-md bg-blue-500 shadow-sm"></span> Redes Sociales / Ads</div>
                  <span class="text-slate-900 font-black">{origenes30Dias.pRed}%</span>
                </div>
                <div class="flex items-center justify-between text-xs font-bold text-slate-600">
                  <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-md bg-slate-300 shadow-sm"></span> Tráfico Directo / Otros</div>
                  <span class="text-slate-900 font-black">{origenes30Dias.pDir}%</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

      </div>

      <!-- SECCIÓN ORIGINAL: EMBUDO E INVENTARIO -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div class="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500" /> Embudo de Conversión
              </h3>
              <p class="text-xs font-semibold text-slate-400 mt-1">Salud y flujo de tu proceso de ventas comercial.</p>
            </div>
            
            {#if leadsEstancados > 0}
              <div class="bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 flex items-center gap-2" title="Leads con más de 15 días sin avanzar">
                <Clock class="w-3.5 h-3.5 text-rose-500" />
                <span class="text-[10px] font-black uppercase tracking-widest text-rose-600">{leadsEstancados} Estancados</span>
              </div>
            {/if}
          </div>

          <div class="space-y-6 flex-1">
            <div>
              <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-slate-300"></span> 1. Prospectos Nuevos</span>
                <span>{funnel.nuevo}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                <div class="bg-slate-300 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.nuevo / maxFunnelValue) * 100}%"></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-blue-500"></span> 2. Contactados</span>
                <span>{funnel.contactado}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                <div class="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.contactado / maxFunnelValue) * 100}%"></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-500"></span> 3. Citas / Visitas Físicas</span>
                <span>{funnel.visita}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                <div class="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.visita / maxFunnelValue) * 100}%"></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-purple-500"></span> 4. En Negociación</span>
                <span>{funnel.negociacion}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                <div class="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.negociacion / maxFunnelValue) * 100}%"></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-xs font-black text-slate-900 mb-2">
                <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> 5. Cerrados (Ganados)</span>
                <span class="text-emerald-600">{funnel.cerrado}</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
                <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.4)]" style="width: {(funnel.cerrado / maxFunnelValue) * 100}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="mb-6 pb-4 border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 class="w-5 h-5 text-amber-500" /> Top Inventario
            </h3>
            <p class="text-xs font-semibold text-slate-400 mt-1">Propiedades con mayor tracción comercial.</p>
          </div>

          <div class="flex-1 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
