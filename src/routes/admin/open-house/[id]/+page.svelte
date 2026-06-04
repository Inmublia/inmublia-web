<script lang="ts">
  // Aquí irían tus variables de data que vienen de +page.server.ts
  // let { data } = $props();

  // Mock data basado en tu captura para previsualizar el diseño Inmublia
  const openHouse = {
    titulo: 'Casa en Col. Americana',
    fecha: 'Lunes, 8 de junio de 2026',
    horario: '11:00 AM - 2:00 PM',
    direccion: 'Calle Libertad #420, Col. Americana',
    estado: 'Próximo',
    stats: {
      confirmados: 4,
      cupo: 15,
      asistentes: 0,
      leadsCalientes: 2,
      listaEspera: 0
    },
    analytics: {
      conversionLanding: '6.1%',
      visitasLanding: 247,
      rsvps: 15,
      intencionCompra: '73%',
      fuentePrincipal: 'WhatsApp (68%)',
      escaneosQR: 31,
      leadsTotales: 3,
      noShow: '27% (con recordatorio)'
    }
  };

  let tabActiva = $state('analytics');
</script>

<svelte:head>
  <title>Open House | {openHouse.titulo} - Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-20">
  
  <div class="bg-white border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
    <div class="max-w-[1600px] mx-auto px-6 py-6 lg:px-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div>
          <div class="flex items-center gap-3 mb-2">
            <span class="text-[10px] font-black tracking-widest uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">Open House</span>
            <h1 class="text-2xl font-black text-slate-900 tracking-tight">{openHouse.titulo}</h1>
          </div>
          <div class="flex items-center gap-4 text-sm text-slate-500 font-medium">
            <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>{openHouse.fecha} • {openHouse.horario}</span>
            <span class="flex items-center gap-1.5"><svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{openHouse.direccion}</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            {openHouse.estado}
          </div>
        </div>

      </div>
    </div>
  </div>

  <main class="max-w-[1600px] mx-auto px-6 lg:px-8 mt-10">
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Confirmados</h3>
          <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-black text-slate-800 tracking-tighter">{openHouse.stats.confirmados}</span>
        </div>
        <p class="text-xs font-semibold text-slate-400 mt-2">de {openHouse.stats.cupo} cupo disponible</p>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistentes Reales</h3>
          <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg></div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-black text-slate-800 tracking-tighter">{openHouse.stats.asistentes}</span>
        </div>
        <p class="text-xs font-semibold text-slate-400 mt-2">Check-in escaneado</p>
      </div>

      <div class="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-3xl p-6 border border-orange-200/60 shadow-[0_8px_30px_rgb(251,146,60,0.15)] flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
        <div class="absolute -right-6 -top-6 text-orange-200/40"><svg class="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path></svg></div>
        <div class="relative z-10 flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-orange-600 uppercase tracking-widest">Leads Calientes</h3>
          <div class="p-2 bg-orange-500 text-white rounded-lg shadow-sm shadow-orange-500/30"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"></path></svg></div>
        </div>
        <div class="relative z-10 flex items-baseline gap-2">
          <span class="text-5xl font-black text-orange-600 tracking-tighter">{openHouse.stats.leadsCalientes}</span>
        </div>
        <p class="relative z-10 text-xs font-semibold text-orange-500/80 mt-2">Alta intención de comprar/invertir</p>
      </div>

      <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Lista de Espera</h3>
          <div class="p-2 bg-slate-50 text-slate-500 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-black text-slate-800 tracking-tighter">{openHouse.stats.listaEspera}</span>
        </div>
        <p class="text-xs font-semibold text-slate-400 mt-2">Sin lugar asignado</p>
      </div>
    </div>

    <div class="flex items-center justify-center md:justify-start mb-8">
      <div class="bg-slate-200/50 p-1.5 rounded-full inline-flex gap-1 shadow-inner border border-slate-200/60">
        <button 
          onclick={() => tabActiva = 'resumen'}
          class="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 {tabActiva === 'resumen' ? 'bg-white text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.08)]' : 'text-slate-500 hover:text-slate-700'}"
        >
          Resumen
        </button>
        <button 
          onclick={() => tabActiva = 'asistentes'}
          class="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 flex items-center gap-2 {tabActiva === 'asistentes' ? 'bg-white text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.08)]' : 'text-slate-500 hover:text-slate-700'}"
        >
          Asistentes <span class="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">4</span>
        </button>
        <button 
          onclick={() => tabActiva = 'analytics'}
          class="px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 {tabActiva === 'analytics' ? 'bg-white text-slate-900 shadow-[0_2px_10px_rgb(0,0,0,0.08)]' : 'text-slate-500 hover:text-slate-700'}"
        >
          Analytics VIP
        </button>
      </div>
    </div>

    {#if tabActiva === 'analytics'}
      <div class="animate-fadeIn">
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Conversión de la Landing Page</h4>
            <span class="text-6xl font-black text-slate-900 tracking-tighter mb-2">{openHouse.analytics.conversionLanding}</span>
            <p class="text-sm font-semibold text-slate-500">{openHouse.analytics.visitasLanding} visitas → {openHouse.analytics.rsvps} RSVPs</p>
          </div>

          <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-50/30 pointer-events-none"></div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 relative z-10">Intención de Compra Detectada</h4>
            <span class="text-6xl font-black text-emerald-600 tracking-tighter mb-2 relative z-10">{openHouse.analytics.intencionCompra}</span>
            <p class="text-sm font-semibold text-slate-500 relative z-10">De los registrados, perfilan a Comprar o Invertir</p>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div class="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-800">Desglose Técnico de Tráfico</h3>
          </div>
          
          <div class="divide-y divide-slate-100">
            <div class="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors">
              <span class="text-sm font-semibold text-slate-500">Fuente principal de tráfico</span>
              <span class="text-sm font-black text-slate-900">{openHouse.analytics.fuentePrincipal}</span>
            </div>
            
            <div class="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors">
              <span class="text-sm font-semibold text-slate-500">Visitantes únicos a la landing</span>
              <span class="text-sm font-black text-slate-900">{openHouse.analytics.visitasLanding}</span>
            </div>
            
            <div class="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors">
              <span class="text-sm font-semibold text-slate-500">Escaneos del QR físico (Letrero exterior)</span>
              <span class="text-sm font-black text-slate-900">{openHouse.analytics.escaneosQR}</span>
            </div>
            
            <div class="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors">
              <span class="text-sm font-semibold text-slate-500">Leads recurrentes (Entraron +3 veces)</span>
              <span class="text-sm font-black text-slate-900">{openHouse.analytics.leadsTotales}</span>
            </div>
            
            <div class="flex items-center justify-between p-6 hover:bg-slate-50/80 transition-colors">
              <span class="text-sm font-semibold text-slate-500">Tasa No-Show Proyectada</span>
              <span class="text-sm font-black text-orange-600">{openHouse.analytics.noShow}</span>
            </div>
          </div>
        </div>

      </div>
    {/if}

  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
</style>
