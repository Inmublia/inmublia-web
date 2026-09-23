<script>
  import { enhance } from '$app/forms';
  import { Instagram, Facebook, CheckCircle2, AlertTriangle, Link2, Loader2 } from 'lucide-svelte';

  let { data } = $props();
  let conexiones = $derived(data.conexiones || []);

  let conectandoIg = $state(false);

  function getConexion(plataforma) {
    return conexiones.find(c => c.platform === plataforma);
  }

  let igConexion = $derived(getConexion('instagram'));
</script>

<main class="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950 font-sans text-slate-200 p-8">
  <div class="max-w-4xl mx-auto w-full">
    
    <header class="mb-10">
      <h1 class="text-3xl font-black text-white tracking-tight">Conexiones Sociales</h1>
      <p class="text-sm font-medium text-slate-400 mt-2">Vincula tus cuentas para publicar inventario directamente desde el CRM.</p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      <!-- TARJETA INSTAGRAM (Nuevo Flujo sin FB Page) -->
      <div class="bg-slate-900 border {igConexion?.status === 'active' ? 'border-emerald-500/30' : 'border-slate-800'} rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col">
        <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 blur-2xl rounded-full"></div>
        
        <div class="flex items-start justify-between relative z-10 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Instagram class="w-6 h-6 text-white" />
          </div>
          {#if igConexion?.status === 'active'}
            <span class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 class="w-3.5 h-3.5" /> Conectado
            </span>
          {:else if igConexion?.status === 'expired'}
            <span class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg flex items-center gap-1.5">
              <AlertTriangle class="w-3.5 h-3.5" /> Expirado
            </span>
          {/if}
        </div>

        <div class="relative z-10 flex-1">
          <h2 class="text-xl font-bold text-white mb-1">Instagram Profesional</h2>
          <p class="text-xs text-slate-400 font-medium leading-relaxed mb-6">Permite a Inmublia publicar fotos y galerías directamente en tu feed. No requiere página de Facebook.</p>
          
          {#if igConexion}
            <div class="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-6">
              <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cuenta Vinculada</p>
              <p class="text-sm font-bold text-slate-200">@{igConexion.username}</p>
            </div>
          {/if}
        </div>

        <div class="relative z-10 shrink-0">
          <form method="POST" action="?/conectarInstagram" use:enhance={() => {
            conectandoIg = true;
            return async ({ update }) => { conectandoIg = false; await update(); };
          }}>
            <button type="submit" disabled={conectandoIg || igConexion?.status === 'active'} class="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 {igConexion?.status === 'active' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-white text-slate-900 hover:bg-slate-100 active:scale-95'}">
              {#if conectandoIg}
                <Loader2 class="w-4 h-4 animate-spin" /> Redirigiendo a Meta...
              {:else if igConexion?.status === 'active'}
                Operativo
              {:else}
                <Link2 class="w-4 h-4" /> {igConexion?.status === 'expired' ? 'Reconectar Cuenta' : 'Vincular Cuenta'}
              {/if}
            </button>
          </form>
        </div>
      </div>

      <!-- TARJETA TIKTOK (Placeholder para Phase 2) -->
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col opacity-60 grayscale">
        <div class="flex items-start justify-between relative z-10 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-lg border border-slate-700">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-1.15 4.39-2.92 5.74-1.74 1.32-4.01 1.68-6.12 1.18-2.22-.52-4.12-2.15-4.88-4.27-.79-2.21-.51-4.75.76-6.69 1.25-1.92 3.4-3.1 5.67-3.32.04 1.4.01 2.8.03 4.21-1.34.18-2.61.94-3.23 2.12-.66 1.24-.56 2.83.25 3.98.81 1.16 2.31 1.71 3.69 1.34 1.39-.36 2.37-1.6 2.45-3.04.09-3.79.05-7.58.07-11.37.01-2.22.02-4.44.02-6.66z"/></svg>
          </div>
          <span class="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">Próximamente</span>
        </div>

        <div class="relative z-10 flex-1">
          <h2 class="text-xl font-bold text-white mb-1">TikTok Direct Post</h2>
          <p class="text-xs text-slate-400 font-medium leading-relaxed mb-6">Publica Photo Modes y Carruseles generados por IA directamente a TikTok.</p>
        </div>

        <div class="relative z-10 shrink-0">
          <button disabled class="w-full py-3 rounded-xl bg-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest border border-slate-700 cursor-not-allowed">
            Fase 2 (Auditoría Pendiente)
          </button>
        </div>
      </div>

    </div>
  </div>
</main>
