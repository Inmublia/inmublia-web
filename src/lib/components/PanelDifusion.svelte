<!-- src/lib/components/PanelDifusion.svelte -->
<script>
  import { invalidateAll } from '$app/navigation';
  import { Send, CheckCircle2, Clock, AlertCircle } from 'lucide-svelte';

  let { 
    propiedadId, 
    publicaciones = [],
    credenciales = []
  } = $props();

  let isProcessing = $state({}); 
  let toastError = $state(''); // Parche I3: Manejador de errores integrado UI

  const portalesSoportados = [
    { id: 'mercadolibre', nombre: 'MercadoLibre' },
    { id: 'easybroker', nombre: 'EasyBroker' }
  ];

  const getEstatusPublicacion = (portalId) => publicaciones.find(p => p.portal === portalId)?.estatus || 'inactivo';
  const isConectado = (portalId) => credenciales.some(c => c.portal === portalId && c.estatus === 'activo');

  async function toggleDifusion(portalId, estadoActual) {
    if (!isConectado(portalId)) return;
    
    isProcessing[portalId] = true;
    toastError = '';
    const activar = (estadoActual === 'inactivo' || estadoActual === 'error');

    try {
      const res = await fetch('/api/propiedades/toggle-difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedad_id: propiedadId, portal: portalId, activar })
      });

      if (res.ok) {
        await invalidateAll();
      } else {
        const error = await res.json();
        toastError = error.error || 'Error interno al procesar la solicitud.';
        setTimeout(() => toastError = '', 4000);
      }
    } catch (err) {
      toastError = 'Error de red al comunicar con el servidor.';
      setTimeout(() => toastError = '', 4000);
    } finally {
      isProcessing[portalId] = false;
    }
  }
</script>

<div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
  <div class="flex items-center gap-2 mb-4">
    <Send class="w-5 h-5 text-indigo-500" />
    <h3 class="text-base font-bold text-slate-900 dark:text-white">Difusión Multiportal</h3>
  </div>

  {#if toastError}
    <div class="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex gap-2 items-center animate-[fadeIn_0.3s_ease-out]">
      <AlertCircle class="w-4 h-4 shrink-0" /> {toastError}
    </div>
  {/if}

  <div class="space-y-3">
    {#each portalesSoportados as portal}
      {@const estado = getEstatusPublicacion(portal.id)}
      {@const conectado = isConectado(portal.id)}
      
      <div class="flex items-center justify-between p-3 rounded-xl border {estado === 'publicado' ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-zinc-800'} transition-colors">
        
        <div class="flex flex-col">
          <span class="text-sm font-bold text-slate-900 dark:text-white">{portal.nombre}</span>
          
          {#if !conectado}
            <span class="text-[10px] font-medium text-rose-500">Cuenta no conectada</span>
          {:else if estado === 'publicado'}
            <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 class="w-3 h-3"/> Activo</span>
          {:else if estado === 'pendiente' || estado === 'procesando'}
            <span class="text-[10px] font-bold text-amber-500 flex items-center gap-1"><Clock class="w-3 h-3"/> En cola...</span>
          {:else if estado === 'error'}
            <span class="text-[10px] font-bold text-rose-600 flex items-center gap-1"><AlertCircle class="w-3 h-3"/> Falló sincronización</span>
          {:else}
            <span class="text-[10px] font-medium text-slate-500">Inactivo</span>
          {/if}
        </div>

        <button 
          disabled={!conectado || isProcessing[portal.id] || estado === 'procesando'}
          onclick={() => toggleDifusion(portal.id, estado)}
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
            {(estado === 'publicado' || estado === 'pendiente') ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-700'}"
          role="switch"
          aria-checked={estado === 'publicado'}
        >
          <span 
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
            {(estado === 'publicado' || estado === 'pendiente') ? 'translate-x-5' : 'translate-x-0'}"
          ></span>
        </button>
      </div>
    {/each}
  </div>
  
  <p class="text-[10px] text-slate-400 mt-4 leading-tight">
    Los cambios pueden tardar hasta 1 minuto en reflejarse en los portales debido al procesamiento asíncrono.
  </p>
</div>
