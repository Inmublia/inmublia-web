<script>
  import { enhance } from '$app/forms';
  import { Webhook, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte';

  let { data, form } = $props();
  let loading = $state(false);
  let currentWebhook = $derived(data.webhook);
</script>

<div class="max-w-3xl mx-auto p-6 md:p-10 text-white font-sans">
  <div class="mb-8 border-b border-zinc-800 pb-6">
    <div class="flex items-center gap-4 mb-2">
      <div class="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
        <Webhook class="w-6 h-6" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight">Integraciones API</h1>
    </div>
    <p class="text-zinc-400 text-sm mt-2">Conecta tu inventario Inmublia con tu CRM externo para recibir leads en tiempo real.</p>
  </div>

  <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
    <form method="POST" action="?/guardar" use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        await update({ reset: false });
        loading = false;
      };
    }} class="space-y-6">
      
      {#if form?.error}
        <div class="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle class="w-5 h-5 shrink-0" />
          <p>{form.error}</p>
        </div>
      {/if}

      {#if form?.success}
        <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 class="w-5 h-5 shrink-0" />
          <p>Configuración guardada exitosamente.</p>
        </div>
      {/if}

      <div class="space-y-2">
        <label for="endpoint_url" class="text-xs font-bold uppercase tracking-widest text-zinc-500">URL Destino (POST)</label>
        <input 
          type="url" 
          id="endpoint_url" 
          name="endpoint_url" 
          required 
          value={currentWebhook?.endpoint_url ?? ''}
          placeholder="https://hooks.zapier.com/..." 
          class="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      <div class="flex items-center gap-3 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
        <input 
          type="checkbox" 
          id="is_active" 
          name="is_active" 
          checked={currentWebhook ? currentWebhook.is_active : true}
          class="w-5 h-5 rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 bg-zinc-900"
        />
        <label for="is_active" class="text-sm text-zinc-300 font-medium cursor-pointer">Webhook Activo</label>
      </div>

      {#if currentWebhook?.secret_token}
        <div class="pt-4 border-t border-zinc-800">
          <p class="text-xs text-zinc-500 mb-2 font-mono">Secret Token (Firma HMAC SHA-256):</p>
          <code class="px-3 py-1.5 bg-zinc-950 rounded border border-zinc-800 text-indigo-300 text-xs select-all">
            {currentWebhook.secret_token}
          </code>
        </div>
      {/if}

      <div class="pt-4 flex justify-end">
        <button type="submit" disabled={loading} class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
          {#if loading}<Loader2 class="w-4 h-4 animate-spin" />{:else}<Save class="w-4 h-4" />{/if}
          Guardar Webhook
        </button>
      </div>
    </form>
  </div>
</div>
