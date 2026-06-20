<script>
  import { enhance } from '$app/forms';
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
  // Filtramos para mostrar solo lo que no esté leído/completado en la vista principal
  let alertasActivas = $state(data.alertas?.filter(a => !a.estado) || []);

  function formatFecha(fechaISO) {
    if (!fechaISO) return '';
    const options = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Intl.DateTimeFormat('es-MX', options).format(new Date(fechaISO));
  }

  function esVencida(fechaISO) {
    if (!fechaISO) return false;
    return new Date(fechaISO) < new Date();
  }

  // Actualización optimista para que la alerta desaparezca de inmediato al darle clic
  function manejadorLeida({ formData }) {
    const id = formData.get('id');
    alertasActivas = alertasActivas.filter(a => a._id !== id);
    
    return async ({ result, update }) => {
      if (result.type !== 'success') {
        // Si falla el servidor, recargamos los datos para devolver la alerta a la pantalla
        await update(); 
        alertasActivas = data.alertas?.filter(a => !a.estado) || [];
      }
    };
  }

  function manejadorLimpiezaTotal() {
    alertasActivas = [];
    return async ({ result, update }) => {
      if (result.type !== 'success') await update();
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

  <div class="p-6 sm:p-10 max-w-4xl mx-auto w-full">
    
    {#if alertasActivas.length === 0}
      <div class="flex flex-col items-center justify-center py-20 opacity-60 bg-white rounded-3xl border border-slate-200 border-dashed shadow-sm">
        <CheckCircle2 class="w-16 h-16 text-emerald-400 mb-4" />
        <h2 class="text-lg font-black text-slate-700">Todo al día</h2>
        <p class="text-sm font-medium text-slate-500 mt-1">No tienes notificaciones ni recordatorios pendientes.</p>
      </div>
    {:else}
      <div class="flex flex-col gap-4 animate-[fadeIn_0.3s_ease-out]">
        {#each alertasActivas as alerta (alerta._id)}
          <div class="bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-start gap-4 
            {alerta._origen === 'recordatorio' && esVencida(alerta.fecha) ? 'border-rose-200' : 'border-slate-200'}">
            
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
    {/if}
  </div>
</main>
