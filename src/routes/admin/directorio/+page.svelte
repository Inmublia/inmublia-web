<script>
  import { 
    Target, Sparkles, Search, BadgeDollarSign, ArrowRight, Zap,
    Download, Clock, Building, Mail, EyeOff, Eye, AlertCircle, TrendingUp
  } from 'lucide-svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let directorio = $derived(data.directorio || []);
  
  let searchQuery = $state('');
  let mostrarDescartados = $state(false); 
  let filtroEtapa = $state('');
  let mostrarBandeja = $state(false);
  
  let toastMsg = $state('');
  let toastVisible = $state(false);
  
  function showToast(msg) {
    toastMsg = msg;
    toastVisible = true;
    setTimeout(() => toastVisible = false, 3000);
  }

  const ESTADO_STYLES = {
    nuevo:       { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', dot: 'bg-blue-500' },
    contactado:  { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/20', dot: 'bg-purple-500' },
    visita:      { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
    negociacion: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-500/20', dot: 'bg-indigo-500' },
    cerrado:     { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
    descartado:  { bg: 'bg-slate-100 dark:bg-zinc-800/50', text: 'text-slate-500 dark:text-zinc-500', border: 'border-slate-200 dark:border-zinc-700', dot: 'bg-slate-400 dark:bg-zinc-600' }
  };

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  let clientesInteligentes = $derived.by(() => {
    let filtrados = directorio.filter(c => mostrarDescartados || c.estado !== 'descartado');
    if (filtroEtapa) filtrados = filtrados.filter(c => c.estado === filtroEtapa);
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtrados = filtrados.filter(c => 
        c.nombre?.toLowerCase().includes(q) || c.correo?.toLowerCase().includes(q) || c.telefono?.includes(q)
      );
    }
    return filtrados;
  });

  let leadsSinSeguimiento = $derived(
    directorio.filter(c => !['cerrado', 'descartado'].includes(c.estado) && Math.floor((new Date() - new Date(c.fecha_contacto)) / 86400000) >= 3)
  );

  let valorPipelineVivos = $derived(
    directorio.filter(c => !['cerrado', 'descartado'].includes(c.estado)).reduce((acc, c) => acc + (c.presupuestoInferido || 0), 0)
  );

  let totalMatches = $derived(directorio.reduce((acc, c) => acc + (c.matches?.length || 0), 0));
  let comisionPotencial = $derived(valorPipelineVivos * ((broker?.comision_default || 5) / 100));

  function formatearFechaRelativa(fechaIso) {
    if (!fechaIso) return 'Sin fecha';
    const fecha = new Date(fechaIso);
    const diffDias = Math.floor((new Date() - fecha) / 86400000);
    
    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function enviarWhatsApp(telefono, nombreCliente, propiedadMatch) {
    if (!telefono) return showToast('Este prospecto no tiene WhatsApp registrado');
    const nombreLead = (nombreCliente || '').replace(/[^\p{L}\s]/gu, '').split(' ')[0].trim() || 'hola';
    const nombreBroker = (broker?.nombre_comercial || '').replace(/[^\p{L}\s]/gu, '').split(' ')[0].trim() || 'tu asesor';

    const msg = propiedadMatch 
      ? `¡Hola ${nombreLead}! Soy ${nombreBroker}. Recordando lo que buscabas, acaba de entrar a nuestro inventario una opción que creo que te va a encantar: ${propiedadMatch.titulo}. ¿Te comparto la ficha con las fotos?`
      : `¡Hola ${nombreLead}! Te saluda ${nombreBroker}. Quería darle seguimiento a tu búsqueda, ¿sigue en pie?`;
      
    window.open(`https://wa.me/${telefono.toString().replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function descargarCSV() {
    if (clientesInteligentes.length === 0) return showToast("No hay prospectos para exportar.");
    const cabeceras = ['Nombre del Prospecto', 'Teléfono', 'Correo', 'Estado', 'Score', 'Días Inactivo', 'Alta Intención', 'Fuente', 'Propiedad Original', 'Objetivo (MXN)', 'Opciones de Match'];
    
    const filas = clientesInteligentes.map(l => {
      const propOriginal = l.interesesHistorial?.length > 0 ? l.interesesHistorial[0].titulo : 'Ninguna';
      const diasInactivo = Math.floor((new Date() - new Date(l.fecha_contacto)) / 86400000);
      return [
        `"${(l.nombre || '').replace(/"/g, '""')}"`,
        `"${l.telefono || ''}"`,
        `"${l.correo || ''}"`,
        `"${l.estado || ''}"`,
        l.score || 0,
        isNaN(diasInactivo) ? 0 : diasInactivo,
        l.altaIntencion ? 'SÍ' : 'NO',
        `"${l.fuente || ''}"`,
        `"${propOriginal.replace(/"/g, '""')}"`,
        l.presupuestoInferido || 0,
        l.matches?.length || 0
      ];
    });

    const blob = new Blob(["\uFEFF" + [cabeceras.join(','), ...filas.map(f => f.join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = `Directorio_Boveda_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }
</script>

<div class="fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<div class="w-full flex-1 flex flex-col font-sans text-slate-900 dark:text-zinc-100 pb-12 animate-[fadeIn_0.3s_ease-out] relative">
  {#if toastVisible}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
      <AlertCircle class="w-4 h-4 text-rose-500" />
      <span class="text-xs font-bold">{toastMsg}</span>
    </div>
  {/if}
  
  <PageHeader title="Directorio & Matchmaking" icon={Target}>
    {#snippet subtitle()} Bóveda de Clientes e Inteligencia {/snippet}
    {#snippet actions()}
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative flex-1 md:w-64">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" bind:value={searchQuery} placeholder="Buscar lead..." class="w-full bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
        </div>
        <button onclick={() => mostrarDescartados = !mostrarDescartados} class="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold shrink-0 {mostrarDescartados ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800'}">
          {#if mostrarDescartados} <Eye class="w-4 h-4" /> Descartados {:else} <EyeOff class="w-4 h-4" /> Descartados {/if}
        </button>
        <button onclick={descargarCSV} class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 shrink-0">
          <Download class="w-4 h-4" /> Exportar
        </button>
      </div>
    {/snippet}
  </PageHeader>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-12">
      
      <!-- Bandeja de Acciones -->
      {#if leadsSinSeguimiento.length > 0}
        <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-2xl p-4 mb-6 animate-[fadeIn_0.3s_ease-out]">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Zap class="w-5 h-5 text-amber-500 fill-current" />
              <h3 class="text-sm font-black text-amber-800 dark:text-amber-300">
                {leadsSinSeguimiento.length} {leadsSinSeguimiento.length === 1 ? 'prospecto necesita' : 'prospectos necesitan'} atención hoy
              </h3>
            </div>
            <button onclick={() => mostrarBandeja = !mostrarBandeja} class="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline">
              {mostrarBandeja ? 'Ocultar' : 'Ver todos'}
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            {#each (mostrarBandeja ? leadsSinSeguimiento : leadsSinSeguimiento.slice(0, 3)) as lead}
              {@const dias = Math.floor((new Date() - new Date(lead.fecha_contacto)) / 86400000)}
              <div class="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl px-3 py-2.5 border border-amber-100 dark:border-amber-800/30 shadow-sm">
                <div class="flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-black text-amber-700 dark:text-amber-400">{isNaN(dias) ? 0 : dias}d</div>
                  <div>
                    <p class="text-[12px] font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{lead.nombre}</p>
                    <p class="text-[9px] text-slate-400 dark:text-zinc-500 capitalize">{lead.estado}</p>
                  </div>
                </div>
                <button onclick={() => enviarWhatsApp(lead.telefono, lead.nombre, null)} class="bg-[#25D366] text-white text-[9px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#20bd5a] active:scale-95 transition-all">
                  Contactar
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- KPIs Pipeline -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {#each ['nuevo','contactado','visita','negociacion','cerrado'] as etapa}
          {@const leadsEtapa = directorio.filter(c => c.estado === etapa)}
          {@const valorEtapa = leadsEtapa.reduce((s, c) => s + (c.presupuestoInferido || 0), 0)}
          {@const comisionEtapa = valorEtapa * ((broker?.comision_default || 5) / 100)}
          {@const estilo = ESTADO_STYLES[etapa]}
          <button onclick={() => filtroEtapa = filtroEtapa === etapa ? '' : etapa} class="text-left bg-white dark:bg-zinc-900 border {filtroEtapa === etapa ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700'} rounded-xl p-3 flex flex-col gap-1 transition-all">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2 h-2 rounded-full {estilo.dot}"></span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500 capitalize">{etapa}</span>
            </div>
            <p class="text-xl font-black text-slate-900 dark:text-white">{leadsEtapa.length}</p>
            {#if comisionEtapa > 0}
              <p class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><TrendingUp class="w-3 h-3"/> {formatter.format(comisionEtapa)}</p>
            {:else}
              <p class="text-[9px] text-slate-400 dark:text-zinc-600">--</p>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Listado Principal -->
      <div class="space-y-3">
        {#each clientesInteligentes as cliente}
          {@const estiloEstado = ESTADO_STYLES[cliente.estado] ?? ESTADO_STYLES.descartado}
          <div class="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border {cliente.estado === 'descartado' ? 'border-slate-100 opacity-60' : 'border-slate-200 dark:border-zinc-800'} overflow-hidden flex flex-col lg:flex-row hover:shadow-md hover:border-slate-300 transition-all">
            
            <div class="flex-1 p-3.5 lg:px-5 lg:py-4 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-zinc-800 flex items-start gap-3.5">
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-baseline gap-2.5 truncate">
                    <h3 class="text-[15px] font-black text-slate-900 dark:text-white tracking-tight truncate">{cliente.nombre}</h3>
                    {#if cliente.score > 0}
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-black text-white {cliente.score >= 75 ? 'bg-emerald-500' : cliente.score >= 50 ? 'bg-amber-500' : 'bg-slate-400'}">
                        {cliente.score}
                      </span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    {#if cliente.correo}
                      <a href="mailto:{cliente.correo}" class="text-slate-400 hover:text-indigo-600 p-2 rounded-full transition-colors"><Mail class="w-4 h-4" /></a>
                    {/if}
                    <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, null)} class="text-[#25D366] hover:bg-[#25D366]/10 p-2 rounded-full transition-colors">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    </button>
                  </div>
                </div>
                <p class="text-[10px] font-medium text-slate-400 font-mono mb-2">{cliente.telefono || 'Sin teléfono'} • {cliente.correo || 'Sin correo'}</p>
                
                <div class="flex flex-wrap items-center gap-2 mb-2.5">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 {estiloEstado.bg} {estiloEstado.text} {estiloEstado.border}">
                    <span class="w-1.5 h-1.5 rounded-full {estiloEstado.dot}"></span> <span class="capitalize">{cliente.estado}</span>
                  </span>
                  
                  {#if cliente.altaIntencion}
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/30">
                      🔥 {cliente.interesesHistorial?.length} prop. vistas
                    </span>
                  {/if}

                  <span class="text-[10px] font-medium text-slate-500 flex items-center gap-1 ml-auto shrink-0">
                    <Clock class="w-3 h-3"/> {formatearFechaRelativa(cliente.fecha_contacto)}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="w-full lg:w-[260px] bg-slate-50/50 dark:bg-zinc-800/30 p-3 lg:p-4 shrink-0 flex flex-col justify-center border-t lg:border-t-0 border-slate-100 dark:border-zinc-800">
              {#if cliente.matches?.length > 0}
                {@const bestMatch = cliente.matches[0]}
                <div class="flex items-center justify-between mb-2">
                  <p class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5"><Sparkles class="w-3.5 h-3.5" /> Match Inteligente</p>
                  {#if cliente.matches.length > 1}
                    <span class="bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded cursor-help">+{cliente.matches.length - 1} más</span>
                  {/if}
                </div>
                
                <a href="/admin/editar/{bestMatch.id}" target="_blank" class="bg-white dark:bg-zinc-900 rounded-xl p-2 border border-indigo-100 shadow-sm mb-2.5 flex gap-2.5 items-center relative overflow-hidden hover:border-indigo-300 transition-colors">
                  <div class="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl z-10">{bestMatch.matchScore}%</div>
                  {#if bestMatch.imagen_url}
                    <img src={bestMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover border border-slate-100" onerror={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }}>
                    <div class="w-9 h-9 rounded bg-slate-100 hidden items-center justify-center text-slate-400" style="display:none"><Building class="w-4 h-4" /></div>
                  {:else}
                    <div class="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-400"><Building class="w-4 h-4" /></div>
                  {/if}
                  <div class="flex-1 truncate">
                    <p class="text-[11px] font-bold text-slate-900 dark:text-white truncate pr-5">{bestMatch.titulo}</p>
                    <p class="text-[10px] font-black text-slate-500 mt-0.5">{formatter.format(bestMatch.precio)}</p>
                  </div>
                </a>
                
                <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, bestMatch)} class="w-full bg-[#25D366] text-white font-bold py-2 rounded-lg text-[11px] flex items-center justify-center gap-2 hover:bg-[#20bd5a] active:scale-95 transition-all">
                  Proponer Inmueble <ArrowRight class="w-3.5 h-3.5" />
                </button>
              {:else}
                <div class="flex flex-col items-center justify-center text-center opacity-50 py-2">
                  <Search class="w-4 h-4 text-slate-400 mb-1.5" />
                  <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sin Coincidencias</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if clientesInteligentes.length === 0}
          <div class="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-12 text-center flex flex-col items-center justify-center w-full transition-colors shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-3 shadow-inner"><Search class="w-5 h-5" /></div>
            <h3 class="text-base font-black text-slate-900 dark:text-white tracking-tight mb-1.5">Bóveda Vacía</h3>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium max-w-sm">No tienes prospectos registrados o ninguno coincide con tu búsqueda.</p>
          </div>
        {/if}
      </div>
    </div>
  </main>
</div>

<style>
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
</style>
