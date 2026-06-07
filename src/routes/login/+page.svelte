<script>
  import { applyAction, enhance } from '$app/forms';
  import { page } from '$app/state'; // API moderna de Svelte 5 para estados de página
  
  const motivo = $derived(page.url.searchParams.get('motivo'));
  let cargando = $state(false);
  let error = $state('');

  function manejarEnvio() {
    cargando = true;
    error = '';
    return async ({ result }) => {
      if (result.type === 'failure') {
        error = result.data?.error || 'Error al iniciar sesión';
        cargando = false;
      } else if (result.type === 'success') {
        // Redirección segura de Svelte 5: el servidor nos confirmó éxito y que grabó las cookies.
        // Forzamos la redirección nativa para asegurar que la sesión esté 100% activa en /admin
        if (result.data?.redirectTo) {
          window.location.href = result.data.redirectTo;
        } else {
          await applyAction(result);
        }
      } else {
        await applyAction(result);
      }
    };
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans text-slate-900 selection:bg-slate-200">
  
  <div class="w-full max-w-[440px] px-6 py-12 md:px-10 md:py-16 bg-white sm:rounded-3xl sm:shadow-[0_16px_70px_rgba(0,0,0,0.04)] sm:border sm:border-slate-100 relative overflow-hidden">
    
    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-100 via-slate-300 to-slate-100"></div>

    <div class="flex flex-col items-center mb-12">
      <img src="/logo.png" alt="Inmublia" class="h-10 w-auto mb-8">
      
      <h1 class="text-3xl font-black text-slate-950 tracking-tighter leading-tight text-center">
        Consola Operativa
      </h1>
      <p class="text-sm text-slate-500 mt-2.5 text-center font-medium max-w-[300px]">
        Gestiona tu inventario y prospectos con la plataforma líder en Real Estate.
      </p>
    </div>

    <div class="space-y-4 mb-10">
      
      {#if motivo === 'inactividad'}
        <div class="flex items-center gap-3.5 px-5 py-4 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100 shadow-inner">
          <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <div class="flex-1">
            <p class="text-xs font-bold text-slate-950">Acceso Seguro</p>
            <p class="text-xs text-slate-600 mt-0.5">Por seguridad, tu sesión ha finalizado. Ingresa de nuevo.</p>
          </div>
        </div>
      {/if}

      {#if error}
        <div class="flex items-center gap-3.5 px-5 py-4 bg-red-50 text-red-700 rounded-2xl border border-red-100">
          <div class="w-10 h-10 rounded-full bg-white border border-red-200 flex items-center justify-center text-red-500 shrink-0 shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div class="flex-1">
            <p class="text-xs font-bold text-red-950">Fallo de Autenticación</p>
            <p class="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      {/if}
    </div>

    <form method="POST" action="?/ingresar" use:enhance={manejarEnvio} class="space-y-6">
      
      <div class="space-y-1.5 relative group">
        <label for="email" class="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Correo electrónico</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"></path></svg>
          </div>
          <input 
            type="email" 
            name="email" 
            id="email" 
            placeholder="juan.perez@agencia.com" 
            required 
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-13 pr-5 py-4 text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      <div class="space-y-1.5 relative group">
        <label for="password" class="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">Contraseña</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <input 
            type="password" 
            name="password" 
            id="password" 
            placeholder="••••••••••••" 
            required 
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-13 pr-5 py-4 text-sm text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      <div class="pt-2">
        <button 
          type="submit" 
          disabled={cargando}
          class="w-full bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white font-bold py-4.5 px-6 rounded-2xl transition-all shadow-lg shadow-slate-950/10 flex items-center justify-center gap-3 text-sm"
        >
          {#if cargando}
            <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Verificando identidad...
          {:else}
            Entrar a mi Consola
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
          {/if}
        </button>
      </div>

    </form>

    <div class="mt-12 pt-8 border-t border-slate-100 text-center">
      <p class="text-sm text-slate-500">
        ¿No tienes cuenta? 
        <a href="/registro" class="font-bold text-slate-950 hover:text-blue-600 transition-colors">
          Contrata Inmublia
        </a>
      </p>
    </div>

  </div>

  <footer class="mt-10 text-center px-6">
    <p class="text-xs text-slate-400 font-medium">&copy; 2024 Inmublia Technologies. Todos los derechos reservados.</p>
  </footer>

</div>
