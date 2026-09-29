<!-- src/routes/admin/configuracion/redes/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { Instagram, CheckCircle2, AlertTriangle, Link2, Loader2, Share2, Facebook } from 'lucide-svelte';

  // 🚀 Importamos el componente universal
  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let conexiones = $derived(data.conexiones || []);

  let conectandoIg = $state(false);
  let conectandoFb = $state(false);

  function getConexion(plataforma) {
    return conexiones.find(c => c.platform === plataforma);
  }

  let igConexion = $derived(getConexion('instagram'));
  let fbConexion = $derived(getConexion('facebook'));
  
  let redesActivas = $derived(conexiones.filter(c => c.status === 'active').length);
</script>

<div class="fixed inset-0 bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<div class="w-full flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out] relative">
  
  <PageHeader title="Conexiones Sociales" icon={Share2}>
    {#snippet subtitle()}
      Vincula tus cuentas para publicar inventario directamente desde el CRM.
    {/snippet}

    {#snippet actions()}
      <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-5 py-3 rounded-2xl flex items-center gap-4 transition-colors shadow-sm">
        <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
          <CheckCircle2 class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Estado del Ecosistema</p>
          <p class="text-lg font-black text-slate-900 dark:text-white">{redesActivas} <span class="text-xs font-medium text-slate-400 dark:text-zinc-500 ml-1">redes activas</span></p>
        </div>
      </div>
    {/snippet}
  </PageHeader>

  <!-- CONTENIDO PRINCIPAL -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <!-- TARJETA INSTAGRAM (Activa) -->
        <div class="bg-white dark:bg-zinc-900 border {igConexion?.status === 'active' ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-slate-200 dark:border-zinc-800'} rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col group transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 blur-2xl rounded-full"></div>
          
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <Instagram class="w-7 h-7 text-white" />
            </div>
            {#if igConexion?.status === 'active'}
              <span class="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <CheckCircle2 class="w-3.5 h-3.5" /> Conectado
              </span>
            {:else if igConexion?.status === 'expired'}
              <span class="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <AlertTriangle class="w-3.5 h-3.5" /> Expirado
              </span>
            {/if}
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">Instagram Profesional</h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">Permite a Inmublia publicar fotos y galerías generadas por IA directamente en tu feed. No requiere vincular una página de Facebook.</p>
            
            {#if igConexion}
              <div class="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-700/50 mb-6 flex items-center gap-3 transition-colors">
                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
                  <Instagram class="w-4 h-4" />
                </div>
                <div>
                  <p class="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Cuenta Vinculada</p>
                  <p class="text-sm font-bold text-slate-900 dark:text-white">@{igConexion.username}</p>
                </div>
              </div>
            {/if}
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <form method="POST" action="?/conectarInstagram" use:enhance={() => {
              conectandoIg = true;
              return async ({ update }) => { conectandoIg = false; await update(); };
            }}>
              <button type="submit" disabled={conectandoIg || igConexion?.status === 'active'} class="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 {igConexion?.status === 'active' ? 'bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-zinc-700 shadow-none' : 'bg-slate-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm active:scale-95 border border-transparent'}">
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

        <!-- TARJETA FACEBOOK PAGES (Activa) -->
        <div class="bg-white dark:bg-zinc-900 border {fbConexion?.status === 'active' ? 'border-blue-500/50 shadow-blue-500/10' : 'border-slate-200 dark:border-zinc-800'} rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col group transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full"></div>
          
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <Facebook class="w-7 h-7 text-white fill-current" />
            </div>
            {#if fbConexion?.status === 'active'}
              <span class="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <CheckCircle2 class="w-3.5 h-3.5" /> Conectado
              </span>
            {:else if fbConexion?.status === 'expired'}
              <span class="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                <AlertTriangle class="w-3.5 h-3.5" /> Expirado
              </span>
            {/if}
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">Facebook Pages</h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">Publicación cruzada en tu página de negocio inmobiliario. Extiende el alcance de tu inventario al público de Facebook.</p>
            
            {#if fbConexion}
              <div class="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-slate-100 dark:border-zinc-700/50 mb-6 flex items-center gap-3 transition-colors">
                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 transition-colors">
                  <Facebook class="w-4 h-4 fill-current" />
                </div>
                <div>
                  <p class="text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Página Vinculada</p>
                  <p class="text-sm font-bold text-slate-900 dark:text-white">{fbConexion.username}</p>
                </div>
              </div>
            {/if}
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <form method="POST" action="?/conectarFacebook" use:enhance={() => {
              conectandoFb = true;
              return async ({ update }) => { conectandoFb = false; await update(); };
            }}>
              <button type="submit" disabled={conectandoFb || fbConexion?.status === 'active'} class="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 {fbConexion?.status === 'active' ? 'bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 cursor-not-allowed border border-slate-200 dark:border-zinc-700 shadow-none' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-95 border border-transparent'}">
                {#if conectandoFb}
                  <Loader2 class="w-4 h-4 animate-spin" /> Redirigiendo a Meta...
                {:else if fbConexion?.status === 'active'}
                  Operativo
                {:else}
                  <Link2 class="w-4 h-4" /> {fbConexion?.status === 'expired' ? 'Reconectar Página' : 'Vincular Página'}
                {/if}
              </button>
            </form>
          </div>
        </div>

        <!-- TARJETA TIKTOK (Fase 2) -->
        <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col opacity-60 grayscale transition-colors">
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-black dark:bg-zinc-800 flex items-center justify-center shadow-md">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-1.15 4.39-2.92 5.74-1.74 1.32-4.01 1.68-6.12 1.18-2.22-.52-4.12-2.15-4.88-4.27-.79-2.21-.51-4.75.76-6.69 1.25-1.92 3.4-3.1 5.67-3.32.04 1.4.01 2.8.03 4.21-1.34.18-2.61.94-3.23 2.12-.66 1.24-.56 2.83.25 3.98.81 1.16 2.31 1.71 3.69 1.34 1.39-.36 2.37-1.6 2.45-3.04.09-3.79.05-7.58.07-11.37.01-2.22.02-4.44.02-6.66z"/></svg>
            </div>
            <span class="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors">Próximamente</span>
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2">TikTok Direct Post</h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed mb-6">Publica Photo Modes y Carruseles generados por IA directamente a TikTok.</p>
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <button disabled class="w-full py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 text-xs font-black uppercase tracking-widest border border-slate-200 dark:border-zinc-700 cursor-not-allowed transition-colors">
              Fase 2 (Auditoría Meta)
            </button>
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
