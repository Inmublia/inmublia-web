<script>
  import { enhance } from '$app/forms';
  import { KeyRound, ShieldCheck, Loader2, AlertCircle } from 'lucide-svelte';

  let { form } = $props();
  let loading = $state(false);
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans text-white selection:bg-indigo-500/30 relative overflow-hidden">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="w-full max-w-[440px] px-6 py-12 md:px-10 md:py-16 bg-zinc-900/40 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-white/10 relative z-10">
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

    <div class="flex flex-col items-center mb-10">
      <div class="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-8 shadow-inner ring-1 ring-white/5">
        <KeyRound class="w-6 h-6 text-white" />
      </div>
      <h1 class="text-3xl font-black tracking-tighter leading-tight text-center text-white drop-shadow-sm">Nueva Contraseña</h1>
      <p class="text-xs text-zinc-400 mt-3 text-center font-medium tracking-wide">Establece tu nueva llave criptográfica de acceso.</p>
    </div>

    {#if form?.error}
      <div class="flex items-center gap-3.5 px-4 py-3 mb-8 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]">
        <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"><AlertCircle class="w-4 h-4" /></div>
        <div class="flex-1">
          <p class="text-[10px] font-black uppercase tracking-widest text-red-400">Error</p>
          <p class="text-xs mt-0.5 font-medium">{form.error}</p>
        </div>
      </div>
    {/if}

    <form method="POST" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-5">
      <div class="space-y-1.5 group">
        <label for="password" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Nueva Contraseña</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors"><ShieldCheck class="w-4 h-4" /></div>
          <input type="password" name="password" id="password" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="••••••••••••" />
        </div>
      </div>

      <div class="space-y-1.5 group">
        <label for="confirm" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Confirmar Contraseña</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors"><KeyRound class="w-4 h-4" /></div>
          <input type="password" name="confirm" id="confirm" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" placeholder="••••••••••••" />
        </div>
      </div>

      <div class="pt-4">
        <button type="submit" disabled={loading} class="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95 group">
          {#if loading}<Loader2 class="w-4 h-4 animate-spin text-white" /> Guardando...
          {:else}<ShieldCheck class="w-4 h-4" /> Actualizar Acceso{/if}
        </button>
      </div>
    </form>
  </div>
</div>
