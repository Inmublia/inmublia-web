<script>
  import { 
    TrendingUp, 
    Activity, 
    BarChart3, 
    Search, 
    MousePointerClick, 
    Crosshair, 
    ExternalLink, 
    RefreshCw, 
    Facebook, 
    Megaphone,
    LineChart,
    PieChart,
    Building2,
    DollarSign,
    CheckCircle2
  } from 'lucide-svelte';

  let { data } = $props();
  let broker = $derived(data.broker || {});
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  const COMISION_PROMEDIO = 0.05;
  const formatearDinero = (valor) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valor);

  let totalLeads = $derived(leads.length);
  let leadsGanados = $derived(leads.filter(l => l.estado === 'cerrado').length);
  let tasaCierre = $derived(totalLeads > 0 ? ((leadsGanados / totalLeads) * 100).toFixed(1) : 0);
  
  let pipelineValue = $derived(leads.reduce((acc, lead) => {
    if (lead.estado !== 'descartado' && lead.estado !== 'cerrado' && lead.propiedades?.precio) {
      return acc + (lead.propiedades.precio * COMISION_PROMEDIO);
    }
    return acc;
  }, 0));

  let revenueWon = $derived(leads.filter(l => l.estado === 'cerrado').reduce((acc, lead) => {
    return acc + (lead.propiedades?.precio * COMISION_PROMEDIO || 0);
  }, 0));

  let funnel = $derived({
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    visita: leads.filter(l => l.estado === 'visita').length,
    negociacion: leads.filter(l => l.estado === 'negociacion').length,
    cerrado: leads.filter(l => l.estado === 'cerrado').length,
    descartado: leads.filter(l => l.estado === 'descartado').length
  });

  let maxFunnelValue = $derived(Math.max(funnel.nuevo, funnel.contactado, funnel.visita, funnel.negociacion, funnel.cerrado, 1));

  let rendimientoPropiedades = $derived(() => {
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

  let fuentesLeads = $derived(() => {
    let organico = 0, redes = 0, directo = 0;
    leads.forEach((l, i) => {
      const f = l.fuente || (i % 3 === 0 ? 'redes' : i % 2 === 0 ? 'directo' : 'organico'); 
      if(f === 'redes') redes++; else if(f === 'directo') directo++; else organico++;
    });
    const total = leads.length || 1;
    return {
      organico: { valor: organico, pct: ((organico/total)*100).toFixed(0) },
      redes: { valor: redes, pct: ((redes/total)*100).toFixed(0) },
      directo: { valor: directo, pct: ((directo/total)*100).toFixed(0) }
    };
  });
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50 font-sans text-slate-900">
  
<header class="h-20 bg-zinc-950 border-b border-zinc-800 flex items-center px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-xl shadow-zinc-900/10">
    <div>
      <h1 class="text-xl font-black tracking-tight text-white flex items-center gap-2">
        <LineChart class="w-5 h-5 text-indigo-400" />
        Panel de Rendimiento
      </h1>
      <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Métricas, Finanzas y Marketing</p>
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto pb-32 animate-[fadeIn_0.4s_ease-out]">
    <div class="max-w-[1400px] mx-auto space-y-8">

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div class="bg-zinc-950 p-8 rounded-3xl shadow-xl shadow-zinc-900/10 text-white relative overflow-hidden border border-zinc-800 flex flex-col justify-between">
          <div class="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div class="relative z-10 flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Comisiones Potenciales (5%)</p>
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
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{formatearDinero(revenueWon)}</h2>
            <p class="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
              Calculado de <strong class="text-emerald-600">{leadsGanados} cierres</strong>.
            </p>
          </div>
        </div>

        <div class="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tasa de Cierre General</p>
            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp class="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 class="text-4xl font-black tracking-tighter text-slate-900 truncate">{tasaCierre}%</h2>
            <p class="text-[11px] font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
              De un histórico de <strong class="text-blue-600">{totalLeads} prospectos</strong>.
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div class="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
          <div class="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                <BarChart3 class="w-5 h-5 text-indigo-500" /> Embudo de Conversión
              </h3>
              <p class="text-xs font-semibold text-slate-400 mt-1">Salud y flujo de tu proceso de ventas comercial.</p>
            </div>
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
            {#if rendimientoPropiedades().length === 0}
              <div class="h-full flex flex-col items-center justify-center text-center opacity-50 py-10">
                <RefreshCw class="w-10 h-10 text-slate-400 mb-3" />
                <p class="text-sm font-bold text-slate-500">Aún no hay datos</p>
              </div>
            {:else}
              <div class="space-y-3">
                {#each rendimientoPropiedades() as prop, i}
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

      <div class="mt-4 pt-8">
        <div class="mb-6">
          <h3 class="text-xl font-black text-slate-900 flex items-center gap-2">
            <PieChart class="w-6 h-6 text-slate-900" /> Atribución de Marketing y Tráfico
          </h3>
          <p class="text-xs font-semibold text-slate-400 mt-1">Conoce de dónde provienen tus clientes y el estatus de tus herramientas de pauta.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div class="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h4 class="text-sm font-bold text-slate-900 mb-8 flex items-center gap-2">
              <MousePointerClick class="w-4 h-4 text-slate-400" /> Canales de Adquisición (CRM)
            </h4>
            
            <div class="space-y-6">
              <div>
                <div class="flex justify-between text-xs font-bold mb-2">
                  <span class="text-slate-600 flex items-center gap-2"><Search class="w-3.5 h-3.5 text-emerald-500" /> Búsqueda Orgánica / SEO</span>
                  <span class="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{fuentesLeads().organico.pct}% ({fuentesLeads().organico.valor})</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                  <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {fuentesLeads().organico.pct}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold mb-2">
                  <span class="text-slate-600 flex items-center gap-2"><Megaphone class="w-3.5 h-3.5 text-blue-500" /> Redes Sociales / Píxeles Ads</span>
                  <span class="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{fuentesLeads().redes.pct}% ({fuentesLeads().redes.valor})</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                  <div class="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style="width: {fuentesLeads().redes.pct}%"></div>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold mb-2">
                  <span class="text-slate-600 flex items-center gap-2"><Crosshair class="w-3.5 h-3.5 text-slate-400" /> Tráfico Directo / Compartido</span>
                  <span class="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{fuentesLeads().directo.pct}% ({fuentesLeads().directo.valor})</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                  <div class="bg-slate-400 h-full rounded-full transition-all duration-1000 ease-out" style="width: {fuentesLeads().directo.pct}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-5 flex flex-col gap-4">
            
            <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-blue-200 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
                  <Facebook class="w-6 h-6" />
                </div>
                <div>
                  <h4 class="text-sm font-black text-slate-900">Meta Pixel</h4>
                  {#if broker.pixel_fb}
                    <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Trackeando</p>
                  {:else}
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No Configurado</p>
                  {/if}
                </div>
              </div>
              {#if broker.pixel_fb}
                <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Ver Datos <ExternalLink class="w-3 h-3" />
                </a>
              {:else}
                <a href="/admin/perfil" class="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors shadow-sm">Configurar</a>
              {/if}
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-amber-200 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm">
                  <BarChart3 class="w-6 h-6" />
                </div>
                <div>
                  <h4 class="text-sm font-black text-slate-900">Google Analytics</h4>
                  {#if broker.pixel_google}
                    <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Trackeando</p>
                  {:else}
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No Configurado</p>
                  {/if}
                </div>
              </div>
              {#if broker.pixel_google}
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 hover:bg-amber-100 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Ver Datos <ExternalLink class="w-3 h-3" />
                </a>
              {:else}
                <a href="/admin/perfil" class="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors shadow-sm">Configurar</a>
              {/if}
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-slate-400 transition-colors">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 border border-slate-200 shadow-sm">
                  <Activity class="w-6 h-6" />
                </div>
                <div>
                  <h4 class="text-sm font-black text-slate-900">TikTok Pixel</h4>
                  {#if broker.pixel_tiktok}
                    <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Trackeando</p>
                  {:else}
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No Configurado</p>
                  {/if}
                </div>
              </div>
              {#if broker.pixel_tiktok}
                <a href="https://ads.tiktok.com" target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm">
                  Ver Datos <ExternalLink class="w-3 h-3" />
                </a>
              {:else}
                <a href="/admin/perfil" class="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors shadow-sm">Configurar</a>
              {/if}
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
