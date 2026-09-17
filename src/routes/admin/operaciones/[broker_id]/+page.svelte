<!-- src/routes/admin/operaciones/[broker_id]/+page.svelte -->
<script>
  import { 
    ArrowLeft, Search, Building2, Activity, Sparkles, 
    AlertOctagon, CheckCircle2, Clock, ShieldAlert, KeyRound, Terminal
  } from 'lucide-svelte';

  // Datos simulados (mock) mientras conectamos el +page.server.js
  let broker = {
    id: 'brk_12345',
    nombre: 'Alejandra Ayala',
    agencia: 'Ayala Inmuebles',
    email: 'alejandra@ayalainmuebles.com',
    plan: 'Elite',
    estado: 'Activa',
    registro: '2025-11-20',
    creditos_ia: 45,
    propiedades_activas: 12
  };

  let timeline = [
    { tiempo: '10:02 AM', evento: 'IA.Generacion.Fallida', color: 'red', descripcion: 'Timeout en Cloudflare AI (Qwen). Reembolso automático aplicado.' },
    { tiempo: '09:45 AM', evento: 'Propiedad.Creada', color: 'emerald', descripcion: 'Casa en Punto Sur 1 (Venta).' },
    { tiempo: '08:30 AM', evento: 'Auth.Login', color: 'slate', descripcion: 'Inicio de sesión desde 192.168.1.100 (Mac OS).' }
  ];

  let searchQuery = '';
  let activeTab = 'timeline'; // 'timeline', 'ia'
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <!-- ================= HEADER (Estilo Inmublia Premium) ================= -->
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col gap-6">
      
      <!-- Barra Superior -->
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-4">
          <a href="/admin/operaciones" class="text-zinc-400 hover:text-white transition-colors bg-white/5 p-2 rounded-xl hover:bg-white/10 shrink-0" title="Volver">
            <ArrowLeft class="w-6 h-6" />
          </a>
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-zinc-50">Consola 360</h1>
            <p class="text-sm font-medium text-zinc-400 mt-1">Perfil Operativo del Cliente</p>
          </div>
        </div>

        <!-- Búsqueda Global Omnipresente (CMD+K visual) -->
        <div class="relative hidden sm:block w-[400px]">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            bind:value={searchQuery}
            placeholder="Buscar broker, email, propiedad o ID... (Cmd+K)" 
            class="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-inner"
          />
        </div>
      </div>

    </div>
  </header>

  <!-- ================= CONTENIDO PRINCIPAL ================= -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 h-full flex flex-col lg:flex-row gap-6">
      
      <!-- COLUMNA IZQUIERDA: Customer 360 (Identidad y Acciones) -->
      <aside class="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
        
        <!-- Bloque 1: Identidad -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div class="h-20 bg-slate-50 border-b border-slate-100"></div>
          <div class="px-8 pb-8 flex flex-col items-center text-center -mt-10">
            <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-900 font-black text-2xl mb-4 border-4 border-white shadow-sm ring-1 ring-slate-100">
              {broker.nombre.charAt(0)}{broker.nombre.split(' ')[1]?.charAt(0) || ''}
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">{broker.nombre}</h2>
            <p class="text-sm font-medium text-slate-500">{broker.email}</p>
            
            <div class="flex items-center gap-2 mt-4">
              <span class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                Plan {broker.plan}
              </span>
              <span class="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5" /> {broker.estado}
              </span>
            </div>
  
            <div class="w-full border-t border-slate-100 mt-6 pt-5 grid grid-cols-2 gap-4 text-left">
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agencia</p>
                <p class="text-sm font-bold text-slate-700 truncate" title={broker.agencia}>{broker.agencia}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Registro</p>
                <p class="text-sm font-bold text-slate-700">{broker.registro}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Bloque 2: Economía y Límites -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <Activity class="w-4 h-4 text-slate-400" />
            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Recursos del Sistema</h3>
          </div>
          
          <div class="p-6 space-y-4">
            <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div class="flex items-center gap-3">
                <div class="bg-amber-100 text-amber-600 p-2.5 rounded-xl"><Sparkles class="w-4 h-4" /></div>
                <div>
                  <p class="text-xs font-bold text-slate-500">Créditos IA</p>
                  <p class="text-xl font-black text-slate-900 leading-none mt-1">{broker.creditos_ia}</p>
                </div>
              </div>
              <button class="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 px-3 py-2 rounded-xl transition-colors border border-indigo-100 hover:border-indigo-600">
                Top-Up
              </button>
            </div>
  
            <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div class="flex items-center gap-3">
                <div class="bg-blue-100 text-blue-600 p-2.5 rounded-xl"><Building2 class="w-4 h-4" /></div>
                <div>
                  <p class="text-xs font-bold text-slate-500">Propiedades Activas</p>
                  <p class="text-xl font-black text-slate-900 leading-none mt-1">{broker.propiedades_activas}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bloque 3: Acciones Críticas (Soporte / God Mode) -->
        <div class="bg-slate-800 rounded-3xl shadow-lg border border-slate-700 p-8 relative overflow-hidden">
          <div class="absolute -top-16 -right-16 w-32 h-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none"></div>
          
          <h3 class="text-xs font-bold text-slate-300 uppercase tracking-wider mb-5 flex items-center gap-2 relative z-10">
            <ShieldAlert class="w-4 h-4 text-rose-400" /> Herramientas de Soporte
          </h3>
          
          <div class="flex flex-col gap-3 relative z-10">
            <button class="w-full flex items-center justify-between px-5 py-4 bg-slate-900 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-xl text-sm font-bold text-white transition-colors shadow-inner group">
              <span class="flex items-center gap-2"><KeyRound class="w-4 h-4 text-indigo-400 group-hover:text-white transition-colors" /> Impersonar Usuario</span>
              <ArrowLeft class="w-4 h-4 rotate-180 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
            <button class="w-full flex items-center justify-start px-5 py-4 bg-slate-900 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 rounded-xl text-sm font-bold text-rose-200 hover:text-rose-400 transition-colors shadow-inner">
              <AlertOctagon class="w-4 h-4 mr-2" /> Suspender Cuenta
            </button>
          </div>
        </div>

      </aside>

      <!-- COLUMNA DERECHA: El Timeline / Inspector -->
      <div class="flex-1 flex flex-col gap-6">
        
        <!-- Pestañas de Navegación -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex gap-2">
          <button 
            onclick={() => activeTab = 'timeline'}
            class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all {activeTab === 'timeline' ? 'bg-zinc-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}"
          >
            Línea de Tiempo
          </button>
          <button 
            onclick={() => activeTab = 'ia'}
            class="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all {activeTab === 'ia' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}"
          >
            Inspector IA
          </button>
        </div>

        <!-- Contenedor del Timeline -->
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <Clock class="w-5 h-5 text-slate-400" /> 
              {activeTab === 'timeline' ? 'Registro de Actividad (Audit Log)' : 'Telemetría de Modelos'}
            </h2>
            <p class="text-xs font-medium text-slate-500 mt-1">
              {activeTab === 'timeline' ? 'Rastro inmutable cronológico de las acciones del usuario.' : 'Detalle técnico de consumos de Cloudflare Workers AI.'}
            </p>
          </div>

          <div class="p-8 flex-1 overflow-y-auto">
            {#if activeTab === 'timeline'}
              <div class="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                {#each timeline as item}
                  <div class="relative pl-8 animate-[fadeIn_0.4s_ease-out]">
                    <!-- Nodo visual del timeline -->
                    <div class="absolute -left-[11px] top-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm
                      {item.color === 'emerald' ? 'bg-emerald-500' : item.color === 'red' ? 'bg-rose-500' : 'bg-slate-400'}">
                    </div>
                    
                    <div class="flex items-start justify-between gap-4 mb-1.5">
                      <h4 class="text-sm font-black text-slate-900">{item.evento}</h4>
                      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">{item.tiempo}</span>
                    </div>
                    <p class="text-sm text-slate-600 font-medium bg-slate-50/50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                      {item.descripcion}
                    </p>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="flex flex-col items-center justify-center h-full text-slate-400 gap-4 py-16">
                <div class="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-inner">
                  <Terminal class="w-8 h-8 text-slate-300" />
                </div>
                <p class="text-sm font-bold text-slate-500">Selecciona un evento de IA en el timeline para inspeccionarlo aquí.</p>
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
