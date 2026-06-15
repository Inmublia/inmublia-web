<script lang="ts">
  import { ShieldCheck, Loader2, ArrowRight, KeyRound } from 'lucide-svelte';
  
  let { form } = $props();
  let cargando = $state(false);
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans text-white selection:bg-emerald-500/30 relative overflow-hidden">
  
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="w-full max-w-[440px] px-6 py-12 md:px-10 md:py-16 bg-zinc-900/40 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-emerald-500/20 relative z-10">
    
    <div class="flex flex-col items-center mb-8">
      <div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner text-emerald-400">
        <ShieldCheck class="w-8 h-8" />
      </div>
      <h1 class="text-3xl font-black tracking-tighter leading-tight text-center text-white drop-shadow-sm">
        ¡Pago Exitoso!
      </h1>
      <p class="text-sm text-zinc-400 mt-3 text-center font-medium max-w-[300px] tracking-wide">
        Tu infraestructura en Inmublia está lista. Crea tu llave criptográfica para acceder.
      </p>
    </div>

    {#if form?.error}
      <div class="mb-6 flex items-center gap-3.5 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]">
        <div class="flex-1">
          <p class="text-[10px] font-black uppercase tracking-widest text-red-400">Error</p>
          <p class="text-xs mt-0.5 font-medium">{form.error}</p>
        </div>
      </div>
    {/if}

    <form method="POST" action="?/configurarPassword" class="space-y-5" onsubmit={() => cargando = true}>
      
      <div class="space-y-1.5 group">
        <label for="email" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-emerald-400">Confirma tu correo de compra</label>
        <input type="email" name="email" id="email" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" />
      </div>

      <div class="space-y-1.5 group">
        <label for="password" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-emerald-400">Nueva Llave Criptográfica</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-emerald-400">
            <KeyRound class="w-4 h-4" />
          </div>
          <input type="password" name="password" id="password" minlength="6" placeholder="••••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all" />
        </div>
      </div>

      <div class="pt-4">
        <button type="submit" disabled={cargando} class="w-full bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 group">
          {#if cargando}
            <Loader2 class="w-4 h-4 animate-spin text-black" />
            Configurando...
          {:else}
            Activar Consola
            <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-all" />
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
