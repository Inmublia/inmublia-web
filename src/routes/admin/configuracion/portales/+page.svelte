<!-- src/routes/admin/configuracion/portales/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { ShieldCheck, Unplug, Plus, CheckCircle2, AlertCircle } from 'lucide-svelte';
  import { page } from '$app/stores';

  let { data, form } = $props();
  let credenciales = $derived(data.credenciales);
  
  let isLoadingEB = $state(false);
  let toastMsg = $state(form?.message || ($page.url.searchParams.get('success') === 'ml_connected' ? 'MercadoLibre conectado exitosamente.' : ''));
  let errorMsg = $state(form?.error || ($page.url.searchParams.get('error') === 'csrf_violation' ? 'Error de seguridad detectado. Intenta de nuevo.' : ''));

  const isConnected = (portalId) => credenciales.some(c => c.portal === portalId && c.estatus === 'activo');
</script>

<div class="max-w-3xl mx-auto p-6 space-y-8">
  {#if toastMsg}
    <div class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex gap-2 items-center animate-[fadeIn_0.3s_ease-out]">
      <CheckCircle2 class="w-4 h-4" /> {toastMsg}
    </div>
  {/if}
  
  {#if errorMsg}
    <div class="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-bold flex gap-2 items-center animate-[fadeIn_0.3s_ease-out]">
      <AlertCircle class="w-4 h-4" /> {errorMsg}
    </div>
  {/if}

  <div>
    <h1 class="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
      <ShieldCheck class="w-6 h-6 text-indigo-500" /> Integración de Portales
    </h1>
    <p class="text-sm text-slate-500 mt-1">Conecta tus cuentas externas. Almacenamos todo con cifrado militar AES-256-GCM.</p>
  </div>

  <div class="space-y-4">
    <!-- MERCADO LIBRE -->
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 {isConnected('mercadolibre') ? 'ring-1 ring-emerald-500/50' : ''}">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">MercadoLibre Inmuebles</h2>
          {#if isConnected('mercadolibre')}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Conectado</span>
          {/if}
        </div>
        <p class="text-xs text-slate-500">Publicación directa a la red de MercadoLibre México mediante OAuth Seguro.</p>
      </div>

      <div class="shrink-0">
        {#if isConnected('mercadolibre')}
          <form method="POST" action="?/desconectar" use:enhance>
            <input type="hidden" name="portal" value="mercadolibre">
            <button class="text-xs font-bold text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Unplug class="w-4 h-4" /> Desconectar
            </button>
          </form>
        {:else}
          <a href="/api/auth/mercadolibre" class="bg-yellow-400 hover:bg-yellow-500 text-slate-900 text-xs font-black px-6 py-2.5 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-2">
            <Plus class="w-4 h-4" /> Conectar Cuenta
          </a>
        {/if}
      </div>
    </div>

    <!-- EASYBROKER -->
    <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-6 {isConnected('easybroker') ? 'ring-1 ring-emerald-500/50' : ''}">
      <div class="space-y-1 flex-1">
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white">Bolsa EasyBroker</h2>
          {#if isConnected('easybroker')}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Conectado</span>
          {/if}
        </div>
        <p class="text-xs text-slate-500 mb-4">Ingresa tu API Key generada desde el panel de integraciones de EasyBroker.</p>

        {#if !isConnected('easybroker')}
          <form method="POST" action="?/guardarEasyBroker" use:enhance={() => { isLoadingEB = true; return async ({ update }) => { await update(); isLoadingEB = false; } }} class="flex gap-2 max-w-sm mt-4">
            <input type="password" name="api_key" placeholder="Pegar API Key aquí..." required class="flex-1 bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <button disabled={isLoadingEB} class="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
              {isLoadingEB ? 'Verificando...' : 'Conectar'}
            </button>
          </form>
        {/if}
      </div>

      {#if isConnected('easybroker')}
        <div class="shrink-0 mt-1 md:mt-0">
          <form method="POST" action="?/desconectar" use:enhance>
            <input type="hidden" name="portal" value="easybroker">
            <button class="text-xs font-bold text-rose-500 hover:bg-rose-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
              <Unplug class="w-4 h-4" /> Desconectar
            </button>
          </form>
        </div>
      {/if}
    </div>

    <!-- PROPPIT -->
    <div class="bg-slate-50 dark:bg-zinc-900/50 border border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl p-6 opacity-70 flex justify-between items-center">
      <div>
         <h2 class="text-lg font-bold text-slate-700 dark:text-zinc-300">Red Proppit (LIFULL)</h2>
         <p class="text-xs text-slate-500 mt-1">iCasas, Lamudi, Trovit, Mitula. Próximamente integrado vía Token Maestro.</p>
      </div>
      <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1 rounded-full">En desarrollo</span>
    </div>
  </div>
</div>
