<script>
  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  // COMISIÓN PROMEDIO (Asumimos 5% para proyecciones estándar del mercado)
  const COMISION_PROMEDIO = 0.05;

  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  // --------------------------------------------------------
  // 🧠 MOTOR SVELTE 5: CÁLCULOS REACTIVOS CON $derived
  // --------------------------------------------------------

  // 1. KPI's Principales
  let totalLeads = $derived(leads.length);
  let leadsGanados = $derived(leads.filter(l => l.estado === 'cerrado').length);
  let tasaCierre = $derived(totalLeads > 0 ? ((leadsGanados / totalLeads) * 100).toFixed(1) : 0);
  
  // 2. Proyecciones Financieras (GCI)
  // Dinero en el pipeline (leads que están vivos, no descartados ni cerrados)
  let pipelineValue = $derived(leads.reduce((acc, lead) => {
    if (lead.estado !== 'descartado' && lead.estado !== 'cerrado' && lead.propiedades?.precio) {
      return acc + (lead.propiedades.precio * COMISION_PROMEDIO);
    }
    return acc;
  }, 0));

  // Dinero cerrado/ganado
  let revenueWon = $derived(leads.filter(l => l.estado === 'cerrado').reduce((acc, lead) => {
    return acc + (lead.propiedades?.precio * COMISION_PROMEDIO || 0);
  }, 0));

  // 3. Cálculos para el Gráfico del Funnel de Ventas
  let funnel = $derived({
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    visita: leads.filter(l => l.estado === 'visita').length,
    negociacion: leads.filter(l => l.estado === 'negociacion').length,
    cerrado: leads.filter(l => l.estado === 'cerrado').length,
    descartado: leads.filter(l => l.estado === 'descartado').length
  });

  // Calculamos el ancho de la barra CSS basándonos en el paso más grande para hacer la gráfica proporcional
  let maxFunnelValue = $derived(Math.max(funnel.nuevo, funnel.contactado, funnel.visita, funnel.negociacion, funnel.cerrado, 1));

  // 4. Rendimiento de Inventario (Tabla Top Propiedades)
  let rendimientoPropiedades = $derived(() => {
    const conteo = {};
    leads.forEach(lead => {
      if (lead.propiedades) {
        const pId = lead.propiedades.id;
        if (!conteo[pId]) {
          conteo[pId] = {
            titulo: lead.propiedades.titulo,
            precio: lead.propiedades.precio,
            estatus: lead.propiedades.estatus,
            totalLeads: 0,
            leadsActivos: 0
          };
        }
        conteo[pId].totalLeads++;
        if (lead.estado !== 'descartado') conteo[pId].leadsActivos++;
      }
    });
    // Convertimos el objeto en array y lo ordenamos por total de leads (descendente)
    return Object.values(conteo).sort((a, b) => b.totalLeads - a.totalLeads).slice(0, 5);
  });
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-blue-100 overflow-hidden">
  
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>
      <a href="/admin/reportes" class="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        Inteligencia & Finanzas
      </a>
      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración
      </a>
    </nav>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-24 bg-white border-b border-slate-200 flex items-center px-10 shrink-0">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Panel de Rendimiento</h1>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Métricas y Proyecciones Financieras</p>
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto pb-32">
      <div class="max-w-7xl mx-auto space-y-8">

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-2">Comisiones Potenciales (5%)</p>
            <h2 class="text-4xl font-black tracking-tighter truncate">{formatearDinero(pipelineValue)}</h2>
            <p class="text-xs font-medium text-indigo-200 mt-4">En el pipeline activo actual.</p>
          </div>

          <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comisiones Ganadas</p>
            </div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{formatearDinero(revenueWon)}</h2>
            <p class="text-xs font-medium text-slate-400 mt-4">Calculado de {leadsGanados} cierres.</p>
          </div>

          <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tasa de Cierre General</p>
            </div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{tasaCierre}%</h2>
            <p class="text-xs font-medium text-slate-400 mt-4">De un total histórico de {totalLeads} leads.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div class="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <div class="flex justify-between items-center mb-8">
              <div>
                <h3 class="text-lg font-black text-slate-900">Embudo de Conversión</h3>
                <p class="text-xs text-slate-500 mt-1">Salud de tu proceso de ventas comercial.</p>
              </div>
            </div>

            <div class="space-y-6">
              <div>
                <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>1. Prospectos Nuevos</span>
                  <span>{funnel.nuevo}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div class="bg-slate-400 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.nuevo / maxFunnelValue) * 100}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>2. Contactados</span>
                  <span>{funnel.contactado}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div class="bg-blue-400 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.contactado / maxFunnelValue) * 100}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>3. Citas / Visitas Físicas</span>
                  <span>{funnel.visita}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div class="bg-amber-400 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.visita / maxFunnelValue) * 100}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>4. En Negociación</span>
                  <span>{funnel.negociacion}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div class="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(168,85,247,0.4)]" style="width: {(funnel.negociacion / maxFunnelValue) * 100}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-slate-600 mb-2">
                  <span>5. Cerrados (Ganados)</span>
                  <span class="text-emerald-600">{funnel.cerrado}</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-4 overflow-hidden flex">
                  <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {(funnel.cerrado / maxFunnelValue) * 100}%"></div>
                </div>
              </div>
            </div>
            
            <div class="mt-8 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
              <span class="text-xs font-bold text-rose-800">Prospectos Perdidos / Descartados</span>
              <span class="text-sm font-black text-rose-600">{funnel.descartado} leads</span>
            </div>
          </div>

          <div class="lg:col-span-5 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
            <div class="mb-6">
              <h3 class="text-lg font-black text-slate-900">Rendimiento de Inventario</h3>
              <p class="text-xs text-slate-500 mt-1">Propiedades con mayor tracción (Top 5).</p>
            </div>

            <div class="flex-1 overflow-auto">
              {#if rendimientoPropiedades().length === 0}
                <div class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                  <svg class="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <p class="text-sm font-bold text-slate-500">Aún no hay datos</p>
                </div>
              {:else}
                <div class="space-y-4">
                  {#each rendimientoPropiedades() as prop, i}
                    <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div class="flex items-center gap-4 truncate pr-4">
                        <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div class="truncate">
                          <h4 class="text-sm font-bold text-slate-900 truncate" title={prop.titulo}>{prop.titulo}</h4>
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{prop.estatus}</p>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <p class="text-sm font-black text-blue-600">{prop.totalLeads}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leads</p>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

        </div>
      </div>
    </div>
  </main>
</div>
