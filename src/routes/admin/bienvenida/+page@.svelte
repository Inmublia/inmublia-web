<script>
  import { enhance } from '$app/forms';
  import { invalidateAll, goto } from '$app/navigation';
  import { createBrowserClient } from '@supabase/ssr';
  import { env } from '$env/dynamic/public';
  import { ShieldCheck, Sparkles, Building2, Globe2, Lock, CheckCircle } from 'lucide-svelte';

  let { data, form } = $props();

  let loading = $state(false);
  let localError = $state('');

  // Polling Svelte 5 con $effect
  $effect(() => {
    if (data.status === 'waiting') {
      const interval = setInterval(async () => {
        await invalidateAll();
      }, 1500);
      return () => clearInterval(interval);
    }
  });

  function manejarOnboarding() {
    return async ({ result }) => {
      loading = true;
      localError = '';

      if (result.type === 'success' && result.data?.success) {
        try {
          const supabase = createBrowserClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
          
          // Generamos el JWT oficial y lo inyectamos en las cookies del navegador
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: result.data.email,
            password: result.data.password
          });

          if (loginError) throw loginError;
          
          // Redirección definitiva al Dashboard
          await goto('/admin', { replaceState: true });
        } catch (err) {
          localError = 'Perfil guardado, pero falló el inicio de sesión. Por favor, ve al Login.';
          loading = false;
        }
      } else {
        localError = result.data?.error || 'No se pudieron guardar los datos.';
        loading = false;
      }
    };
  }
</script>

<div class="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-indigo-500/30 selection:text-white relative overflow-hidden">
  <div class="absolute w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[120px] top-[-10%] left-[-10%]"></div>
  <div class="absolute w-[500px] h-[500px] rounded-full bg-emerald-600/5 blur-[150px] bottom-[-20%] right-[-10%]"></div>

  <div class="w-full max-w-xl relative z-10 my-8">
    {#if data.status === 'waiting'}
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center justify-center min-h-[360px]">
        <svg class="animate-spin h-10 w-10 text-emerald-500 mb-6" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h3 class="text-xl font-black text-white tracking-tight">Verificando transacción</h3>
        <p class="text-slate-400 text-sm mt-3 leading-relaxed max-w-sm">Aprovisionando tu espacio de trabajo. No cierres esta ventana...</p>
      </div>
    {:else}
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest mb-4">
          <ShieldCheck class="w-3.5 h-3.5" /> Pago Seguro Confirmado
        </div>
        <h2 class="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          ¡Bienvenido a Inmublia! <Sparkles class="w-6 h-6 text-indigo-400 shrink-0" />
        </h2>
        <p class="text-slate-400 mt-2 font-medium">Define los accesos maestros para tu inmobiliaria.</p>
      </div>

      <div class="bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl backdrop-blur-md">
        {#if form?.error || localError}
          <div class="mb-6 bg-rose-500/10 text-rose-400 font-bold p-4 rounded-xl text-sm text-center border border-rose-500/20">
            {form?.error || localError}
          </div>
        {/if}

        <form method="POST" use:enhance={manejarOnboarding} class="space-y-6">
          <input type="hidden" name="authUserId" value={data.authUserId} />
          <input type="hidden" name="email" value={data.email} />

          <div>
            <label for="nombreComercial" class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Building2 class="w-3.5 h-3.5" /> Nombre de tu Marca Comercial
            </label>
            <input type="text" id="nombreComercial" name="nombreComercial" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" placeholder="Ej. Vargas Bienes Raíces">
          </div>

          <div>
            <label for="subdominio" class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Globe2 class="w-3.5 h-3.5" /> Dirección Web de tu Catálogo
            </label>
            <div class="relative flex items-center">
              <input type="text" id="subdominio" name="subdominio" required class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-[135px] py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold lowercase" placeholder="miagencia" autocomplete="off">
              <span class="absolute right-4 text-xs font-black text-slate-500 uppercase tracking-wider select-none border-l border-slate-800 pl-3">.inmublia.com</span>
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Lock class="w-3.5 h-3.5" /> Contraseña Maestra
            </label>
            <input type="password" id="password" name="password" required class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" placeholder="Mínimo 6 caracteres">
          </div>

          <button type="submit" disabled={loading} class="w-full bg-white hover:bg-slate-200 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 mt-2">
            {#if loading}
              <svg class="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Acondicionando Consola...
            {:else}
              <CheckCircle class="w-4 h-4" /> Activar Plataforma e Ingresar
            {/if}
          </button>
        </form>
      </div>
    {/if}
  </div>
</div>
