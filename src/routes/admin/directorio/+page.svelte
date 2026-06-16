<script>
  import { 
    Users, Target, Sparkles, MessageSquareQuote, 
    Search, MapPin, BadgeDollarSign, ArrowRight, Zap 
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker);
  let leads = $derived(data.leads || []);
  let propiedades = $derived(data.propiedades || []);

  let searchQuery = $state('');

  // OPTIMIZACIÓN SVELTE 5: Usamos $derived.by para procesar el bloque una sola vez y guardarlo en memoria
  let clientesInteligentes = $derived.by(() => {
    let mapa = {};
    
    leads.forEach(l => {
      if (!mapa[l.correo]) {
        mapa[l.correo] = {
          nombre: l.nombre,
          correo: l.correo,
          telefono: l.telefono,
          interesesHistorial: [],
          presupuestoInferido: 0,
          matches: []
        };
      }
      if (l.propiedades) {
        if (!mapa[l.correo].interesesHistorial.find(i => i.id === l.propiedades.id)) {
          mapa[l.correo].interesesHistorial.push(l.propiedades);
        }
      }
    });

    return Object.values(mapa).map(cliente => {
      if (cliente.interesesHistorial.length > 0) {
        const total = cliente.interesesHistorial.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
        cliente.presupuestoInferido = total / cliente.interesesHistorial.length;
      }

      if (cliente.presupuestoInferido > 0) {
        cliente.matches = propiedades.filter(p => {
          // Ya no necesitamos checar if(p.estatus !== 'Activa') porque el backend ya lo filtró
          if (cliente.interesesHistorial.find(i => i.id === p.id)) return false; 
          
          const minBudget = cliente.presupuestoInferido * 0.7;
          const maxBudget = cliente.presupuestoInferido * 1.3;
          const encajaPresupuesto = p.precio >= minBudget && p.precio <= maxBudget;
          
          const operacionObjetivo = cliente.interesesHistorial[0]?.operacion;
          const encajaOperacion = p.operacion === operacionObjetivo;

          return encajaPresupuesto && encajaOperacion;
        });

        cliente.matches.sort((a, b) => 
          Math.abs(a.precio - cliente.presupuestoInferido) - Math.abs(b.precio - cliente.presupuestoInferido)
        );
      }
      return cliente;
    })
    .filter(c => c.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) || c.correo?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.matches.length - a.matches.length);
  });

  // Al usar $derived.by, llamamos a la variable como arreglo directo, no como función
  let totalClientes = $derived(clientesInteligentes.length);
  let totalMatches = $derived(clientesInteligentes.reduce((acc, c) => acc + c.matches.length, 0));
  let valorPipelinePotencial = $derived(
    clientesInteligentes.reduce((acc, c) => acc + (c.matches[0]?.precio || 0), 0)
  );

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  function enviarWhatsApp(telefono, cliente, propiedadMatch) {
    if (!telefono) {
      alert("Este prospecto no tiene un número de WhatsApp registrado.");
      return;
    }

    // PREVENCIÓN DE CRASH: Manejo seguro de cadenas nulas o vacías
    const nombreLead = cliente?.split(' ')[0] || 'inversor';
    const nombreBroker = broker?.nombre_comercial?.split(' ')[0] || 'tu asesor';

    const msg = propiedadMatch 
      ? `Hola ${nombreLead}, soy ${nombreBroker}. Revisando mis archivos noté que estabas buscando propiedades de cierto perfil. Acabo de captar una exclusiva que encaja perfecto con lo que buscabas: ${propiedadMatch.titulo}. ¿Te gustaría que te envíe el Smart Brochure?`
      : `Hola ${nombreLead}, te saluda ${nombreBroker}. ¿Cómo va tu búsqueda de propiedad?`;
      
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
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
      
      <div class="relative w-full md:max-w-md">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" bind:value={searchQuery} placeholder="Buscar en la bóveda..." class="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
      </div>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-12">
      
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bóveda Histórica</p>
            <div class="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/50">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-black text-slate-900 tracking-tighter truncate">{totalClientes}</p>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clientes</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cruces Exitosos</p>
            <div class="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 relative">
              <span class="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span></span>
              <Zap class="w-4 h-4" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-black text-slate-900 tracking-tighter">{totalMatches}</p>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Matches</p>
          </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:border-slate-300 transition-all">
          <div class="flex items-center justify-between mb-3">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Potencial</p>
            <div class="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50">
              <BadgeDollarSign class="w-4 h-4" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-black text-slate-900 tracking-tighter">{formatter.format(valorPipelinePotencial)}</p>
          </div>
        </div>

      </div>

      <div class="space-y-4">
        {#each clientesInteligentes as cliente}
          <div class="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-slate-200 overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)] hover:border-slate-300">
            
            <div class="flex-1 p-4 lg:p-5 border-b lg:border-b-0 lg:border-r border-slate-100 flex items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-slate-100 shrink-0 shadow-inner border border-slate-200 overflow-hidden hidden sm:block">
                <img src="https://ui-avatars.com/api/?name={cliente.nombre || 'Lead'}&background=0f172a&color=fff&bold=true&size=100" alt="Avatar" class="w-full h-full object-cover">
              </div>
              <div class="flex-1 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-base font-black text-slate-900 tracking-tight line-clamp-1">{cliente.nombre}</h3>
                  <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, null)} class="text-[#25D366] hover:bg-[#25D366]/10 p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0 ml-2" title="Chatear libremente">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  </button>
                </div>
                
                <div class="flex items-center justify-between mt-1 border-t border-slate-100 pt-2">
                  <p class="text-[10px] font-medium text-slate-500 font-mono truncate">{cliente.telefono} • {cliente.correo}</p>
                  <div class="flex items-center gap-1.5 shrink-0 ml-2">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Target</span>
                    <span class="text-[11px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{formatter.format(cliente.presupuestoInferido)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="w-full lg:w-[300px] bg-slate-50/50 p-4 shrink-0 flex flex-col justify-center relative">
              {#if cliente.matches.length > 0}
                {@const bestMatch = cliente.matches[0]}
                <div class="flex items-center justify-between mb-2.5">
                  <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1">
                    <Sparkles class="w-3 h-3" /> Match 
                  </p>
                  <span class="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm border border-amber-200">
                    +{cliente.matches.length} opciones
                  </span>
                </div>

                <a href="/admin/editar/{bestMatch.id}" target="_blank" rel="noopener noreferrer" class="bg-white rounded-lg p-1.5 border border-amber-200/60 shadow-sm mb-2.5 flex gap-2.5 items-center cursor-pointer hover:bg-amber-50/50 transition-colors">
                  <img src={bestMatch.imagen_url} alt="Match" class="w-9 h-9 rounded object-cover">
                  <div class="flex-1 truncate">
                    <p class="text-[10px] font-bold text-slate-900 truncate">{bestMatch.titulo}</p>
                    <p class="text-[10px] font-black text-amber-600 tracking-tight">{formatter.format(bestMatch.precio)}</p>
                  </div>
                </a>

                <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, bestMatch)} class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 text-[10px] active:scale-95">
                  Enviar Propiedad <ArrowRight class="w-3 h-3" />
                </button>
              {:else}
                <div class="flex flex-col items-center justify-center text-center opacity-50 h-full py-2">
                  <Search class="w-4 h-4 text-slate-400 mb-1" />
                  <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sin Coincidencias</p>
                </div>
              {/if}
            </div>

          </div>
        {/each}

        {#if clientesInteligentes.length === 0}
          <div class="bg-white rounded-3xl border border-slate-200 p-16 text-center flex flex-col items-center justify-center w-full max-w-[1400px] mx-auto">
            <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
              <Users class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-black text-slate-900 tracking-tight mb-2">Bóveda Vacía</h3>
            <p class="text-sm text-slate-500 font-medium max-w-md">No tienes prospectos registrados o ninguno coincide con tu búsqueda actual.</p>
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
