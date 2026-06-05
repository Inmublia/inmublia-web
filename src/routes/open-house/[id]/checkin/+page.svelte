<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let event = $derived(data.event);
  let submitting = $state(false);
</script>

<div class="min-h-screen bg-zinc-50 flex items-center justify-center p-6 font-sans selection:bg-indigo-100">
  <div class="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
    
    <div class="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
      <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5 blur-2xl pointer-events-none"></div>
      <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 border border-white/20">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      </div>
      <h1 class="text-2xl font-black mb-1 tracking-tight relative z-10">Check-in Automático</h1>
      <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest relative z-10">{event?.propiedades?.titulo}</p>
    </div>

    <div class="p-8">
      {#if form?.success}
        <div class="text-center animate-[fadeIn_0.5s_ease-out]">
          <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 class="text-2xl font-black text-slate-900 mb-3 tracking-tight">¡Acceso Concedido!</h2>
          <p class="text-sm text-slate-500 font-medium mb-6 leading-relaxed">Tu identidad ha sido validada. <strong class="text-slate-900">Puedes ingresar a la propiedad.</strong></p>
          <div class="inline-flex px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            {form.attendee?.name}
          </div>
        </div>
      {:else}
        <form method="POST" use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            submitting = false;
            update();
          };
        }} class="space-y-6">
          <p class="text-sm text-slate-600 font-medium text-center leading-relaxed">
            Ingresa el número de WhatsApp con el que te registraste para liberar tu acceso físico.
          </p>
          
          <div>
            <input type="tel" name="phone" required placeholder="Número de WhatsApp" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all text-center text-lg font-black tracking-widest placeholder:text-sm placeholder:font-bold placeholder:tracking-normal placeholder:text-slate-400" />
          </div>

          {#if form?.error}
            <div class="bg-red-50 text-red-600 border border-red-100 text-xs font-bold p-4 rounded-xl text-center shadow-sm">
              {form.error}
            </div>
          {/if}

          <button type="submit" disabled={submitting} class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg mt-2 flex justify-center items-center gap-2">
            {#if submitting}
              Verificando base de datos...
            {:else}
              Validar mi Pase
            {/if}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
