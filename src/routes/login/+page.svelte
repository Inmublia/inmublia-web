<!-- src/routes/login/+page.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { ShieldCheck, Mail, KeyRound, Loader2, AlertCircle, Info, ArrowRight, CheckCircle2 } from 'lucide-svelte';
  
  let { form: formProp } = $props();
  let formOverride = $state<any>(null);
  let formActual = $derived(formOverride ?? formProp);

  let motivo = $derived(page.url.searchParams.get('motivo'));
  let cargando = $state(false);
  
  let vistaRecuperacion = $state(false);
  let errorHash = $state('');

  let correoEnviado = $state(false);
  let segundosRestantes = $state(0);

  onMount(() => {
    if (window.location.hash.includes('error=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorCode = params.get('error_code');
      
      if (errorCode === 'otp_expired' || params.get('error') === 'access_denied') {
        errorHash = 'El enlace de recuperación ha expirado o ya fue utilizado. Por seguridad, solicita uno nuevo.';
        vistaRecuperacion = true;
      }

      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  });
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans text-white selection:bg-indigo-500/30 relative overflow-hidden">
  
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

  <div class="w-full max-w-[440px] px-6 py-12 md:px-10 md:py-16 bg-zinc-900/40 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-white/10 relative z-10">
    
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

    <div class="flex flex-col items-center mb-10">
      <!-- 🚀 FIX: Logo sin fondo, masivo, alineado con la marca. -->
      <div class="mb-8 w-40 h-20 flex items-center justify-center">
        <img src="/logo.png" alt="Inmublia" class="w-full h-full object-contain">
      </div>
      <h1 class="text-3xl font-black tracking-tighter leading-tight text-center text-white drop-shadow-sm">
        {vistaRecuperacion ? 'Recuperar Acceso' : 'Consola Operativa'}
      </h1>
      <p class="text-xs text-zinc-400 mt-3 text-center font-medium max-w-[280px] tracking-wide">
        {vistaRecuperacion ? 'Ingresa tu correo para recibir un enlace seguro de restablecimiento.' : 'Identifícate para acceder a tu entorno de trabajo seguro.'}
      </p>
    </div>

    <div class="space-y-4 mb-8">
      {#if formActual?.error || errorHash}
        <div in:fade={{ duration: 200 }} class="flex items-center gap-3.5 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm">
          <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-red-400">Atención</p>
            <p class="text-xs mt-0.5 font-medium">{errorHash || formActual?.error}</p>
          </div>
        </div>

      {:else if formActual?.success}
        <div in:fade={{ duration: 200 }} class="flex items-center gap-3.5 px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-sm">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verifica tu Bandeja</p>
            <p class="text-xs mt-0.5 font-medium">{formActual.message}</p>
          </div>
        </div>

      {:else if motivo === 'inactividad' && !vistaRecuperacion}
        <div in:fade={{ duration: 200 }} class="flex items-center gap-3.5 px-4 py-3 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 shadow-sm">
          <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <Info class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-amber-400">Acceso Seguro</p>
            <p class="text-xs mt-0.5 font-medium">Por seguridad, tu sesión ha finalizado.</p>
          </div>
        </div>

      {:else if motivo === 'clave_actualizada' && !vistaRecuperacion}
        <div in:fade={{ duration: 200 }} class="flex items-center gap-3.5 px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 shadow-sm">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400">Éxito</p>
            <p class="text-xs mt-0.5 font-medium">Contraseña actualizada. Ingresa con tus nuevas credenciales.</p>
          </div>
        </div>
      {/if}
    </div>

    {#if !vistaRecuperacion}
      <form method="POST" action="?/ingresar" 
        transition:fade={{ duration: 150 }}
        use:enhance={() => {
          if (cargando) return;
          cargando = true;
          return async ({ update }) => {
            cargando = false;
            await update();
          };
        }} 
        class="space-y-5"
      >
        <div class="space-y-1.5 group">
          <label for="email" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Credencial de Acceso</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail class="w-4 h-4" />
            </div>
            <input type="email" name="email" id="email" autocomplete="email" placeholder="correo@agencia.com" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
          </div>
        </div>

        <div class="space-y-1.5 group">
          <div class="flex items-center justify-between px-1">
             <label for="password" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors group-focus-within:text-indigo-400">Llave Criptográfica</label>
             <button type="button" onclick={() => { vistaRecuperacion = true; formOverride = null; errorHash = ''; }} class="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors">¿Olvidó su llave?</button>
          </div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
              <KeyRound class="w-4 h-4" />
            </div>
            <input type="password" name="password" id="password" autocomplete="current-password" placeholder="••••••••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
          </div>
        </div>

        <div class="pt-4">
          <button type="submit" disabled={cargando} class="w-full bg-white hover:bg-zinc-200 text-black disabled:opacity-50 disabled:hover:bg-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group">
            {#if cargando}
              <Loader2 class="w-4 h-4 animate-spin text-black" />
              Desencriptando...
            {:else}
              <ShieldCheck class="w-4 h-4" />
              Acceder al Sistema
              <ArrowRight class="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            {/if}
          </button>
        </div>
      </form>

    {:else}
      <form method="POST" action="?/recuperar" 
        transition:fade={{ duration: 150 }}
        use:enhance={() => { 
          if (cargando || correoEnviado) return;
          cargando = true; 
          return async ({ result, update }) => { 
            cargando = false; 
            if (result.type === 'success' || result.data?.success) {
              correoEnviado = true;
              segundosRestantes = 60;
              const timer = setInterval(() => {
                segundosRestantes--;
                if (segundosRestantes <= 0) {
                  clearInterval(timer);
                  correoEnviado = false;
                }
              }, 1000);
            }
            await update(); 
          }; 
        }} 
        class="space-y-5"
      >
        <div class="space-y-1.5 group">
          <label for="recovery_email" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Correo Asociado</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail class="w-4 h-4" />
            </div>
            <input type="email" name="email" id="recovery_email" autocomplete="email" placeholder="correo@agencia.com" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
          </div>
        </div>

        <div class="pt-4 flex flex-col gap-3">
          <button type="submit" disabled={cargando || correoEnviado} class="w-full bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(79,70,229,0.3)] active:scale-95 group">
            {#if cargando}
              <Loader2 class="w-4 h-4 animate-spin text-white" /> Procesando...
            {:else if correoEnviado}
              <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Enviado · Reenviar en {segundosRestantes}s
            {:else}
              <Mail class="w-4 h-4" /> Enviar Enlace Seguro
            {/if}
          </button>
          
          <button type="button" onclick={() => { vistaRecuperacion = false; formOverride = null; errorHash = ''; }} class="w-full bg-transparent hover:bg-zinc-800 text-zinc-400 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center text-sm">
            Cancelar y regresar
          </button>
        </div>
      </form>
    {/if}

    <div class="mt-10 pt-8 border-t border-white/5 text-center">
      <p class="text-xs text-zinc-500 font-medium">
        ¿Aún no tienes infraestructura propia? <br>
        <a href="https://inmublia.com/planes" class="inline-flex items-center gap-1 font-bold text-white hover:text-indigo-400 transition-colors mt-2">
          Ver nuestros planes <ArrowRight class="w-3 h-3" />
        </a>
      </p>
    </div>
  </div>

  <footer class="mt-8 text-center px-6 relative z-10">
    <p class="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">&copy; 2026 Inmublia Technologies. Secured Platform.</p>
  </footer>
</div>
