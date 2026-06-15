<script lang="ts">
  import { Mail, KeyRound, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-svelte';
  
  let { form } = $props();
  
  let cargando = $state(false);
  let password = $state('');
  let confirmPassword = $state('');
  let errorLocal = $state('');

  function validarFormulario(evento: Event) {
    errorLocal = '';
    if (password !== confirmPassword) {
      evento.preventDefault(); 
      errorLocal = 'Las contraseñas no coinciden. Verifícalas.';
      return;
    }
    cargando = true;
  }
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans text-white selection:bg-indigo-500/30 relative overflow-hidden">
  
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="w-full max-w-[440px] px-6 py-12 md:px-10 md:py-16 bg-zinc-900/40 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-white/10 relative z-10">
    
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

    <div class="flex flex-col items-center mb-10">
      <div class="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-8 shadow-inner ring-1 ring-white/5">
        <img src="/logo.png" alt="Inmublia" class="h-8 w-auto filter invert opacity-90">
      </div>
      <h1 class="text-3xl font-black tracking-tighter leading-tight text-center text-white drop-shadow-sm">
        Infraestructura Lista
      </h1>
      <p class="text-xs text-zinc-400 mt-3 text-center font-medium max-w-[280px] tracking-wide">
        Confirma tu acceso de compra y establece tu contraseña de administrador.
      </p>
    </div>

    <div class="space-y-4 mb-8">
      {#if form?.error || errorLocal}
        <div class="flex items-center gap-3.5 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm animate-[fadeIn_0.3s_ease-out]">
          <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-red-400">Error de Validación</p>
            <p class="text-xs mt-0.5 font-medium">{errorLocal || form?.error}</p>
          </div>
        </div>
      {/if}
    </div>

    <form method="POST" action="?/configurarPassword" class="space-y-5" onsubmit={validarFormulario}>
      
      <div class="space-y-1.5 group">
        <label for="email" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Correo de Compra</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
            <Mail class="w-4 h-4" />
          </div>
          <input type="email" name="email" id="email" placeholder="correo@agencia.com" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
        </div>
      </div>

      <div class="space-y-1.5 group">
        <label for="password" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Crear Contraseña</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
            <KeyRound class="w-4 h-4" />
          </div>
          <input type="password" name="password" id="password" bind:value={password} minlength="6" placeholder="••••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
        </div>
      </div>

      <div class="space-y-1.5 group">
        <label for="confirmPassword" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Verificar Contraseña</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
            <ShieldCheck class="w-4 h-4" />
          </div>
          <input type="password" id="confirmPassword" bind:value={confirmPassword} minlength="6" placeholder="••••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
        </div>
      </div>

      <div class="pt-4">
        <button type="submit" disabled={cargando} class="w-full bg-white hover:bg-zinc-200 text-black disabled:opacity-50 disabled:hover:bg-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group">
          {#if cargando}
            <Loader2 class="w-4 h-4 animate-spin text-black" />
            Sincronizando...
          {:else}
            <ShieldCheck class="w-4 h-4" />
            Activar Consola
            <ArrowRight class="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
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
