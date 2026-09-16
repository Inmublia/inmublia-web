<!-- src/routes/admin/alertas/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { fly, fade } from 'svelte/transition';
  import { onDestroy } from 'svelte';
  import { 
    Bell, 
    CalendarClock, 
    CheckCircle2, 
    AlertTriangle, 
    Info, 
    CheckCheck,
    BellRing
  } from 'lucide-svelte';

  let { data } = $props();

  // 🚀 FIX CRÍTICO: Reactividad Unificada usando un Set para ocultar optimísticamente
  let idsOcultos = $state(new Set());
  
  // El derivado siempre será la fuente de la verdad (Datos del Servidor - Ocultos Locales)
  let alertasActivas = $derived(
    (data.alertas || []).filter(a => !a.estado && !idsOcultos.has(`${a._origen}-${a._id}`))
  );

  // 🚀 FIX: Timer Reactivo. Actualiza 'ahora' cada minuto para evitar calcular en cada render y reflejar urgencia en tiempo real
  let ahora = $state(new Date());
  const intervalo = setInterval(() => { ahora = new Date(); }, 60_000);
  onDestroy(() => clearInterval(intervalo));

  // 🚀 FIX: Fallo silencioso en fechas corruptas
  function formatFecha(fechaISO) {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return 'Fecha no disponible';
    
    return new Intl.DateTimeFormat('es-MX', { 
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(fecha);
  }

  // 🚀 FIX: Lógica memoizada con `ahora` en lugar de llamar a new Date() cien veces
  function esVencida(fechaISO) {
    if (!fechaISO) return false;
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return false;
    return fecha < ahora;
  }

  // Actualización optimista basada en Set
  function manejadorLeida({ formData }) {
    const id = formData.get('id');
    const origen = formData.get('origen');
    const keyCompuesta = `${origen}-${id}`;
    
    // Ocultar Inmediatamente
    idsOcultos = new Set([...idsOcultos, keyCompuesta]);
    
    return async ({ result, update }) => {
      if (result.type !== 'success') {
        // Revertir en caso de fallo de red
        idsOcultos = new Set([...idsOcultos].filter(k => k !== keyCompuesta));
        await update(); 
        alert('Fallo de red: No se pudo marcar como leída.');
      } else {
        // En éxito, opcionalmente limpiamos el set porque el servidor ya actualizó data
        idsOcultos = new Set([...idsOcultos].filter(k => k !== keyCompuesta));
        await update();
      }
    };
  }

  // 🚀 FIX: Restauración correcta del "Limpiar Todo"
  function manejadorLimpiezaTotal() {
    const todasLasKeys = (data.alertas || [])
      .filter(a => !a.estado)
      .map(a => `${a._origen}-${a._id}`);
    
    // Almacenamos el snapshot por si falla
    const snapshotIds = new Set(idsOcultos);
    
    // Ocultar todo optimísticamente
    idsOcultos = new Set([...idsOcultos, ...todasLasKeys]);

    return async ({ result, update }) => {
      if (result.type !== 'success') {
        // Restaurar estado visual
        idsOcultos = snapshotIds;
        await update();
        alert('Fallo de red: No se pudieron limpiar las alertas.');
      } else {
        idsOcultos = new Set();
        await update();
      }
    };
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-y-auto relative bg-slate-50 font-sans text-slate-900">
  
  <header class="h-28 bg-zinc-950 px-6 sm:px-10 shrink-0 flex flex-col justify-center relative overflow-hidden">
    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
    
    <div class="flex items-center justify-between relative z-10">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-white flex items-center gap-3">
          <BellRing class="w-6 h-6 text-indigo-400" />
          Centro de Alertas
        </h1>
        <p class="text-xs font-medium text-zinc-400 mt-1">Gestión de sistema y recordatorios operativos</p>
      </div>

      {#if alertasActivas.length > 0}
        <form method="POST" action="?/marcarTodas" use:enhance={manejadorLimpiezaTotal}>
          <button type="submit" class="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95">
            <CheckCheck class="w-4 h-4" />
            Limpiar todo
          </button>
        </form>
      {/if}
    </div>
  </header>

  <div class="p-6 sm:p-10 max-w-4xl mx-auto w-full relative">
    
    {#if alertasActivas.length === 0}
      <!-- 🚀 Animación fade para cuando se vacía todo -->
      <div in:fade={{ duration: 400, delay: 200 }} class="flex flex-col items-center justify-center py-20 opacity-60 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
        <CheckCircle2 class="w-16 h-16 text-emerald-400 mb-4" />
        <h2 class="text-lg font-black text-slate-700">Todo al día</h2>
        <p class="text-sm font-medium text-slate-500 mt-1">No tienes notificaciones ni recordatorios pendientes.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-4">
        <!-- 🚀 FIX: Key Compuesta robusta y transiciones Svelte Fly -->
        {#each alertasActivas as alerta (`${alerta._origen}-${alerta._id}`)}
          <div 
            in:fly={{ y: 20, duration: 300 }} 
            out:fly={{ x: 100, opacity: 0, duration: 250 }}
            class="bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-start gap-4 
            {alerta._origen === 'recordatorio' && esVencida(alerta.fecha) ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'}"
          >
            
            <div class="shrink-0 mt-1">
              {#if alerta._origen === 'recordatorio'}
                <div class="p-2.5 rounded-full {esVencida(alerta.fecha) ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}">
                  <CalendarClock class="w-5 h-5" />
                </div>
              {:else if alerta.tipo_icono === 'alerta_inactividad'}
                <div class="p-2.5 rounded-full bg-orange-100 text-orange-600">
                  <AlertTriangle class="w-5 h-5" />
                </div>
              {:else}
                <div class="p-2.5 rounded-full bg-indigo-100 text-indigo-600">
                  <Info class="w-5 h-5" />
                </div>
              {/if}
            </div>

            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-sm font-black text-slate-900">{alerta.titulo}</h3>
                {#if alerta._origen === 'recordatorio' && esVencida(alerta.fecha)}
                  <span class="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-200 rounded-md">Vencido</span>
                {/if}
              </div>
              <p class="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed mb-3">{alerta.mensaje}</p>
              
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {formatFecha(alerta.fecha)}
              </div>
            </div>

            <div class="shrink-0 sm:self-center mt-4 sm:mt-0">
              <form method="POST" action="?/marcarLeida" use:enhance={manejadorLeida}>
                <!-- 🚀 Envío de datos corregido -->
                <input type="hidden" name="id" value={alerta._id}>
                <input type="hidden" name="origen" value={alerta._origen}>
                
                <button type="submit" class="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-600 hover:text-emerald-600 rounded-xl text-xs font-bold transition-colors active:scale-95">
                  <CheckCircle2 class="w-4 h-4" />
                  {alerta._origen === 'recordatorio' ? 'Marcar Completado' : 'Marcar Leído'}
                </button>
              </form>
            </div>

          </div>
        {/each}
      </div>
      
      {#if data.total_alertas > alertasActivas.length}
        <div class="mt-8 text-center" in:fade>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Mostrando {alertasActivas.length} de {data.total_alertas} alertas pendientes.
          </p>
          <p class="text-xs text-slate-500 font-medium">Por favor resuelve algunas alertas para ver las más antiguas.</p>
        </div>
      {/if}

    {/if}
  </div>
</main>
