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

  // 🔥 EL MOTOR DE MATCHMAKING EN TIEMPO REAL
  let clientesInteligentes = $derived(() => {
    let mapa = {};
    
    // 1. Unificar el historial de Leads en Perfiles de Clientes (por correo)
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
        // Evitar duplicados si preguntó por la misma casa dos veces
        if (!mapa[l.correo].interesesHistorial.find(i => i.id === l.propiedades.id)) {
          mapa[l.correo].interesesHistorial.push(l.propiedades);
        }
      }
    });

    return Object.values(mapa).map(cliente => {
      // 2. Inferir Presupuesto Objetivo
      if (cliente.interesesHistorial.length > 0) {
        const total = cliente.interesesHistorial.reduce((sum, p) => sum + (Number(p.precio) || 0), 0);
        cliente.presupuestoInferido = total / cliente.interesesHistorial.length;
      }

      // 3. El Matchmaker Mágico (Cruzar con inventario Activo)
      if (cliente.presupuestoInferido > 0) {
        cliente.matches = propiedades.filter(p => {
          if (p.estatus !== 'Activa') return false; // Solo lo que se puede vender hoy
          if (cliente.interesesHistorial.find(i => i.id === p.id)) return false; // Descartar si ya preguntó por ella
          
          // Rango de tolerancia del 30% del presupuesto
          const minBudget = cliente.presupuestoInferido * 0.7;
          const maxBudget = cliente.presupuestoInferido * 1.3;
          const encajaPresupuesto = p.precio >= minBudget && p.precio <= maxBudget;
          
          // Que coincida la operación (Venta con Venta, Renta con Renta)
          const operacionObjetivo = cliente.interesesHistorial[0]?.operacion;
          const encajaOperacion = p.operacion === operacionObjetivo;

          return encajaPresupuesto && encajaOperacion;
        });

        // Ordenar los matches por cercanía matemática al presupuesto del cliente
        cliente.matches.sort((a, b) => 
          Math.abs(a.precio - cliente.presupuestoInferido) - Math.abs(b.precio - cliente.presupuestoInferido)
        );
      }
      return cliente;
    })
    // 4. Ordenar la vista: Primero los clientes con Oportunidades (Matches), luego buscar.
    .filter(c => c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || c.correo.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.matches.length - a.matches.length);
  });

  // Métricas maestras
  let totalClientes = $derived(clientesInteligentes().length);
  let totalMatches = $derived(clientesInteligentes().reduce((acc, c) => acc + c.matches.length, 0));
  let valorPipelinePotencial = $derived(
    clientesInteligentes().reduce((acc, c) => acc + (c.matches[0]?.precio || 0), 0)
  );

  const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  function enviarWhatsApp(telefono, cliente, propiedadMatch) {
    const msg = `Hola ${cliente.split(' ')[0]}, soy ${broker.nombre_comercial.split(' ')[0]}. Revisando mis archivos noté que estabas buscando propiedades de cierto perfil. Acabo de captar una exclusiva que encaja perfecto con lo que buscabas: ${propiedadMatch.titulo}. ¿Te gustaría que te envíe el Smart Brochure?`;
    window.open(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  }
</script>

<div class="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="bg-zinc-950 text-white pt-10 pb-36 px-6 sm:px-12 shrink-0 relative overflow-hidden shadow-2xl shadow-zinc-900/20">
    <div class="absolute top-0 left-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none -translate-x-1/3 -translate-y-1/3"></div>

    <div class="max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-white drop-shadow-sm">Directorio & Matchmaking</h1>
        <p class="text-xs font-bold text-indigo-400 mt-1.5 flex items-center gap-2 uppercase tracking-widest">
          <Target class="w-3.5 h-3.5" /> Bóveda de Clientes e Inteligencia Comercial
        </p>
      </div>
      
      <div class="relative w-full md:max-w-md">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input type="text" bind:value={searchQuery} placeholder="Buscar en la bóveda de contactos..." class="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 transition-all shadow-inner backdrop-blur-md">
      </div>
    </div>
  </header>

  <main class="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-12 -mt-24 relative z-20 pb-24">
    
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
      
      <div class="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
        <div class="flex items-center justify-between mb-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bóveda Histórica</p>
          <div class="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/50 group-hover:scale-110 transition-transform">
            <Users class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-3xl font-black text-slate-900 tracking-tighter truncate">{totalClientes}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Clientes Únicos</p>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
        <div class="flex items-center justify-between mb-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cruces Exitosos (Matches)</p>
          <div class="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50 group-hover:scale-110 transition-transform relative">
            <span class="absolute -top-1 -right-1 flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>
            <Zap class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-3xl font-black text-slate-900 tracking-tighter">{totalMatches}</p>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Oportunidades de Reactivación</p>
        </div>
      </div>

      <div class="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col justify-between group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
        <div class="flex items-center justify-between mb-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor de Oportunidades</p>
          <div class="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100/50 group-hover:scale-110 transition-transform">
            <BadgeDollarSign class="w-5 h-5" />
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-3xl font-black text-slate-900 tracking-tighter">{formatter.format(valorPipelinePotencial)}</p>
        </div>
      </div>

    </div>

    <div class="space-y-4">
      {#each clientesInteligentes() as cliente}
        <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-200 overflow-hidden flex flex-col lg:flex-row transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          
          <div class="flex-1 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 flex gap-6">
            <div class="w-16 h-16 rounded-full bg-slate-100 shrink-0 shadow-inner border border-slate-200 overflow-hidden hidden sm:block">
              <img src="https://ui-avatars.com/api/?name={cliente.nombre}&background=0f172a&color=fff&bold=true&size=120" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-black text-slate-900 tracking-tight mb-1">{cliente.nombre}</h3>
              <p class="text-xs font-semibold text-slate-500 mb-4 font-mono">{cliente.telefono} • {cliente.correo}</p>
              
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Historial de Intereses ({cliente.interesesHistorial.length})</p>
                <div class="flex flex-wrap gap-2">
                  {#each cliente.interesesHistorial as interes}
                    <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 shadow-sm truncate max-w-xs">
                      <MapPin class="w-3 h-3 text-slate-400 shrink-0" />
                      <span class="truncate">{interes.titulo}</span>
                    </span>
                  {/each}
                </div>
                <div class="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3">
                  <span class="text-xs font-bold text-slate-500">Presupuesto Target Calculado:</span>
                  <span class="text-sm font-black text-slate-900 bg-slate-200/50 px-2 py-0.5 rounded-md">{formatter.format(cliente.presupuestoInferido)}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="w-full lg:w-[420px] bg-slate-50/50 p-6 lg:p-8 shrink-0 flex flex-col justify-center relative">
            {#if cliente.matches.length > 0}
              {@const bestMatch = cliente.matches[0]}
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none -mt-10 -mr-10"></div>
              
              <div class="flex items-center justify-between mb-4 relative z-10">
                <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles class="w-3.5 h-3.5" /> Match Encontrado
                </p>
                <span class="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1 rounded-md shadow-sm border border-amber-200">
                  +{cliente.matches.length} Opciones
                </span>
              </div>

              <div class="bg-white rounded-2xl p-3 border border-amber-200/60 shadow-sm mb-5 relative z-10 flex gap-4 items-center group">
                <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <img src={bestMatch.imagen_url} alt="Match" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">
                </div>
                <div class="flex-1 truncate">
                  <p class="text-xs font-bold text-slate-900 truncate">{bestMatch.titulo}</p>
                  <p class="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{bestMatch.ubicacion}</p>
                  <p class="text-sm font-black text-amber-600 tracking-tight mt-1">{formatter.format(bestMatch.precio)}</p>
                </div>
              </div>

              <button onclick={() => enviarWhatsApp(cliente.telefono, cliente.nombre, bestMatch)} class="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_rgba(37,211,102,0.3)] transition-all flex items-center justify-center gap-2 text-sm active:scale-95 relative z-10">
                <MessageSquareQuote class="w-4 h-4" />
                Ofrecer Reactivación
              </button>
            {:else}
              <div class="flex flex-col items-center justify-center text-center opacity-60 h-full">
                <div class="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
                  <Search class="w-5 h-5" />
                </div>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Sin Coincidencias</p>
                <p class="text-xs text-slate-400 font-medium mt-1">El inventario activo actual no encaja con su presupuesto.</p>
              </div>
            {/if}
          </div>

        </div>
      {/each}

      {#if clientesInteligentes().length === 0}
        <div class="bg-white rounded-3xl border border-slate-200 p-20 text-center flex flex-col items-center justify-center">
          <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-4 shadow-inner">
            <Users class="w-8 h-8" />
          </div>
          <h3 class="text-xl font-black text-slate-900 tracking-tight mb-2">Bóveda Vacía</h3>
          <p class="text-slate-500 font-medium max-w-md">No tienes prospectos registrados o ninguno coincide con tu búsqueda actual.</p>
        </div>
      {/if}
    </div>

  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
