<!-- src/routes/open-house/[id]/checkin/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Home } from 'lucide-svelte';

  let { data, form } = $props();
  let isSubmitting = $state(false);
  let eventTitle = $derived(data?.eventTitle);
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
  
  <!-- Efectos de iluminación de fondo -->
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>

  <div class="relative z-10 w-full max-w-sm">
    
    <!-- Header Branding -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
        <Home class="w-8 h-8 text-indigo-400" />
      </div>
      <h1 class="text-2xl font-black text-white tracking-tight leading-tight">{eventTitle}</h1>
      <p class="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-3">Recepción Digital</p>
    </div>

    <!-- Contenedor Principal -->
    <div class="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
      
      {#if form?.success}
        <!-- ESTADO: ÉXITO -->
        <div class="text-center animate-[fadeIn_0.5s_ease-out]">
          <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-6 relative">
            <div class="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-20"></div>
            <CheckCircle2 class="w-10 h-10 text-emerald-500" />
          </div>
          <h2 class="text-2xl font-black text-white mb-2">Acceso Liberado</h2>
          <p class="text-sm text-zinc-400 font-medium leading-relaxed">Tu asistencia ha sido confirmada. Disfruta el recorrido por la propiedad.</p>
        </div>
      
      {:else}
        <!-- ESTADO: FORMULARIO DE ACCESO -->
        <div class="animate-[fadeIn_0.3s_ease-out]">
          <div class="mb-8 text-center">
            <h3 class="text-lg font-bold text-white mb-2">Verifica tu Identidad</h3>
            <p class="text-sm text-zinc-400 font-medium">Ingresa el número de WhatsApp con el que apartaste tu lugar en la lista.</p>
          </div>

          {#if form?.error}
            <div class="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]">
              <ShieldAlert class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p class="text-sm text-red-200 font-medium">{form.error}</p>
            </div>
          {/if}

          <form method="POST" use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              isSubmitting = false;
              update({ reset: false });
            };
          }} class="space-y-6">
            
            <div class="relative">
              <input 
                type="tel" 
                name="phone" 
                placeholder="Ej. 33 1234 5678" 
                required 
                class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-4 text-center text-lg font-black text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-inner tracking-widest"
              >
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              class="w-full bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 text-sm uppercase tracking-widest"
            >
              {#if isSubmitting}
                <Loader2 class="w-5 h-5 animate-spin" /> Procesando...
              {:else}
                <KeyRound class="w-5 h-5" /> Liberar Pase Físico
              {/if}
            </button>
          </form>
        </div>
      {/if}
    </div>

    <!-- Footer Security Badge -->
    <div class="text-center mt-8 opacity-50">
      <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Inmublia Access Control</span>
    </div>

  </div>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
