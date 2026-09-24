<script>
  import { enhance } from '$app/forms';
  import { Instagram, CheckCircle2, AlertTriangle, Link2, Loader2, Share2, Facebook } from 'lucide-svelte';

  let { data } = $props();
  let conexiones = $derived(data.conexiones || []);

  let conectandoIg = $state(false);

  function getConexion(plataforma) {
    return conexiones.find(c => c.platform === plataforma);
  }

  let igConexion = $derived(getConexion('instagram'));
  let fbConexion = $derived(getConexion('facebook'));
  
  let redesActivas = $derived(conexiones.filter(c => c.status === 'active').length);
</script>

<!-- Fondo general claro (Homologado con Reportes) -->
<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <!-- ENCABEZADO PANORÁMICO -->
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
          <Share2 class="w-7 h-7 text-pink-400" />
          Conexiones Sociales
        </h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          Vincula tus cuentas para publicar inventario directamente desde el CRM.
        </p>
      </div>
      
      <!-- WIDGET SUPERIOR DERECHO -->
      <div class="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
          <CheckCircle2 class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Estado del Ecosistema</p>
          <p class="text-lg font-black text-white">{redesActivas} <span class="text-xs font-medium text-zinc-500 ml-1">redes activas</span></p>
        </div>
      </div>
    </div>
  </header>

  <!-- CONTENIDO PRINCIPAL -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        <!-- TARJETA INSTAGRAM (Activa) -->
        <div class="bg-white border {igConexion?.status === 'active' ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-slate-200'} rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col group transition-all hover:shadow-md">
          <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 blur-2xl rounded-full"></div>
          
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shadow-md">
              <Instagram class="w-7 h-7 text-white" />
            </div>
            {#if igConexion?.status === 'active'}
              <span class="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5" /> Conectado
              </span>
            {:else if igConexion?.status === 'expired'}
              <span class="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle class="w-3.5 h-3.5" /> Expirado
              </span>
            {/if}
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 mb-2">Instagram Profesional</h2>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mb-6">Permite a Inmublia publicar fotos y galerías generadas por IA directamente en tu feed. No requiere vincular una página de Facebook.</p>
            
            {#if igConexion}
              <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <Instagram class="w-4 h-4" />
                </div>
                <div>
                  <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cuenta Vinculada</p>
                  <p class="text-sm font-bold text-slate-900">@{igConexion.username}</p>
                </div>
              </div>
            {/if}
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <form method="POST" action="?/conectarInstagram" use:enhance={() => {
              conectandoIg = true;
              return async ({ update }) => { conectandoIg = false; await update(); };
            }}>
              <button type="submit" disabled={conectandoIg || igConexion?.status === 'active'} class="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 {igConexion?.status === 'active' ? 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md active:scale-95'}">
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

        <!-- TARJETA FACEBOOK PAGE (Roadmap) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
              <Facebook class="w-7 h-7 text-white fill-current" />
            </div>
            <span class="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">Fase Siguiente</span>
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 mb-2">Facebook Pages</h2>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mb-6">Publicación cruzada en tu página de negocio inmobiliario. Extiende el alcance de tu inventario al público de Facebook.</p>
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <button disabled class="w-full py-3.5 rounded-xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed">
              En Desarrollo
            </button>
          </div>
        </div>

        <!-- TARJETA TIKTOK (Fase 2) -->
        <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden flex flex-col opacity-60 grayscale">
          <div class="flex items-start justify-between relative z-10 mb-8">
            <div class="w-14 h-14 rounded-2xl bg-black flex items-center justify-center shadow-md">
              <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.23-1.15 4.39-2.92 5.74-1.74 1.32-4.01 1.68-6.12 1.18-2.22-.52-4.12-2.15-4.88-4.27-.79-2.21-.51-4.75.76-6.69 1.25-1.92 3.4-3.1 5.67-3.32.04 1.4.01 2.8.03 4.21-1.34.18-2.61.94-3.23 2.12-.66 1.24-.56 2.83.25 3.98.81 1.16 2.31 1.71 3.69 1.34 1.39-.36 2.37-1.6 2.45-3.04.09-3.79.05-7.58.07-11.37.01-2.22.02-4.44.02-6.66z"/></svg>
            </div>
            <span class="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg">Próximamente</span>
          </div>

          <div class="relative z-10 flex-1">
            <h2 class="text-xl font-black text-slate-900 mb-2">TikTok Direct Post</h2>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mb-6">Publica Photo Modes y Carruseles generados por IA directamente a TikTok.</p>
          </div>

          <div class="relative z-10 shrink-0 mt-auto">
            <button disabled class="w-full py-3.5 rounded-xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest border border-slate-200 cursor-not-allowed">
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
