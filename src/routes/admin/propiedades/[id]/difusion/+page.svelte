<!-- src/routes/admin/propiedades/[id]/difusion/+page.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { Sparkles, ExternalLink, RefreshCw, AlertCircle, CheckCircle2, Send } from 'lucide-svelte';

  let { data } = $props();
  let propiedad = $derived(data.propiedad);
  let publicaciones = $state(data.publicaciones || []);
  let cargandoPortal = $state(null);
  let toastMsg = $state('');

  const PORTALES = [
    { id: 'proppit', nombre: 'Red Proppit (LIFULL)', subportales: ['iCasas', 'Lamudi', 'Trovit'] },
    { id: 'mercadolibre', nombre: 'MercadoLibre Inmuebles', subportales: ['Nacional'] },
    { id: 'easybroker', nombre: 'EasyBroker Bolsa', subportales: ['Red EB'] }
  ];

  let realtimeChannel;

  onMount(() => {
    realtimeChannel = data.supabase
      .channel(`portal-sync-${propiedad.id}`)
      .on('postgres_changes', { 
        event: '*', schema: 'public', table: 'portal_publicaciones', filter: `propiedad_id=eq.${propiedad.id}` 
      }, (payload) => {
        const index = publicaciones.findIndex(p => p.portal === payload.new.portal);
        if (index >= 0) publicaciones[index] = payload.new;
        else publicaciones.push(payload.new);
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Error:', err);
          toastMsg = 'Conexión interrumpida. Recarga la página.';
        }
      });
  });

  onDestroy(() => { if (realtimeChannel) data.supabase.removeChannel(realtimeChannel); });

  async function ejecutarAccion(portalId, accion) {
    cargandoPortal = portalId;
    try {
      const res = await fetch('/api/portales/despachar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedad_id: propiedad.id, portal: portalId, accion })
      });
      if (!res.ok) throw new Error('Fallo en la comunicación');
    } catch (err) {
      toastMsg = err.message;
      setTimeout(() => toastMsg = '', 4000);
    } finally {
      cargandoPortal = null;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6 space-y-6">
  {#if toastMsg}
    <div class="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold animate-pulse">
      {toastMsg}
    </div>
  {/if}

  <div>
    <h1 class="text-xl font-black text-slate-900 flex items-center gap-2">
      <Sparkles class="w-5 h-5 text-indigo-500" /> Difusión Multicanal
    </h1>
    <p class="text-xs text-slate-500 mt-1">Distribución para: <strong>{propiedad.titulo}</strong></p>
  </div>

  <div class="grid grid-cols-1 gap-4">
    {#each PORTALES as portal (portal.id)}
      {@const pub = publicaciones.find(p => p.portal === portal.id)}
      {@const estatus = pub?.estatus ?? 'inactivo'}
      {@const isLoading = cargandoPortal === portal.id || estatus === 'pendiente' || estatus === 'procesando'}

      <div class="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold">{portal.nombre}</span>
            {#if estatus === 'publicado'}
              <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex gap-1 items-center"><CheckCircle2 class="w-3 h-3"/> Activo</span>
            {:else if estatus === 'pendiente' || estatus === 'sincronizando'}
              <span class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex gap-1 items-center"><RefreshCw class="w-3 h-3 animate-spin"/> Procesando</span>
            {:else if estatus === 'error'}
              <span class="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex gap-1 items-center" title={pub?.ultimo_error}><AlertCircle class="w-3 h-3"/> Error</span>
            {/if}
          </div>
          <p class="text-[11px] text-slate-400">Canales: {portal.subportales.join(' • ')}</p>
        </div>

        <div class="flex items-center gap-3">
           {#if estatus === 'publicado'}
             {#if pub?.portal_url}
               <a href={pub.portal_url} target="_blank" class="p-2 text-slate-400 hover:text-indigo-600"><ExternalLink class="w-4 h-4" /></a>
             {/if}
             <button disabled={isLoading} onclick={() => ejecutarAccion(portal.id, 'despublicar')} class="text-xs text-rose-500 hover:underline disabled:opacity-50">Pausar</button>
           {:else}
             <button disabled={isLoading} onclick={() => ejecutarAccion(portal.id, 'publicar')} class="bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 disabled:opacity-50 flex items-center gap-1.5">
               {#if isLoading} <RefreshCw class="w-3.5 h-3.5 animate-spin" /> Procesando {:else} <Send class="w-3.5 h-3.5" /> Difundir {/if}
             </button>
           {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
