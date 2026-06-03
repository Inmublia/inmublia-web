<script>
  import { enhance } from '$app/forms';
  
  // Recibe los errores que mandamos desde el servidor
  let { form } = $props();
  let loading = $state(false);
  
  // Estado para intercambiar entre Login y Recuperar Contraseña
  let isResetting = $state(false);
</script>

<div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
  <div class="w-full max-w-md relative z-10">
    <div class="text-center mb-10">
      <a href="/" class="inline-block">
        <img src="/logo.png" alt="Inmublia" class="h-14 w-auto mx-auto drop-shadow-sm">
      </a>
      <h2 class="mt-6 text-2xl font-black text-slate-900 tracking-tight">
        {isResetting ? 'Recupera tu acceso' : 'Ingresa a tu Consola'}
      </h2>
      <p class="text-slate-500 mt-2 font-medium">
        {isResetting ? 'Te enviaremos un enlace para crear una nueva contraseña' : 'Gestiona tu agencia y tu inventario'}
      </p>
    </div>

    <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 transition-all duration-300">
      
      {#if form?.error}
        <div class="mb-6 bg-red-50 text-red-600 font-bold p-3 rounded-lg text-sm text-center border border-red-100">
          {form.error}
        </div>
      {:else if form?.success}
        <div class="mb-6 bg-emerald-50 text-emerald-600 font-bold p-3 rounded-lg text-sm text-center border border-emerald-100">
          {form.message}
        </div>
      {/if}

      {#if !isResetting}
        <form method="POST" action="?/ingresar" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required
              value={form?.email || ''}
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
              placeholder="broker@tuagencia.com"
            >
          </div>
          
          <div>
            <label for="password" class="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
              Contraseña
              <button type="button" onclick={() => { isResetting = true; form = null; }} class="text-blue-600 hover:text-blue-800 text-xs bg-transparent border-none cursor-pointer p-0 m-0">
                ¿Olvidaste tu contraseña?
              </button>
            </label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
              placeholder="••••••••"
            >
          </div>

          <button 
            type="submit" 
            disabled={loading}
            class="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl transition-colors mt-2 shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {#if loading}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Validando...
            {:else}
              Entrar a mi Consola
            {/if}
          </button>
        </form>

      {:else}
        <form method="POST" action="?/recuperar" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-6">
          <div>
            <label for="reset-email" class="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              id="reset-email" 
              name="email" 
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
              placeholder="broker@tuagencia.com"
            >
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors mt-2 shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {#if loading}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Enviando enlace...
            {:else}
              Enviar Enlace Mágico
            {/if}
          </button>

          <div class="text-center mt-4">
            <button type="button" onclick={() => { isResetting = false; form = null; }} class="text-sm font-bold text-slate-500 hover:text-slate-900 bg-transparent border-none cursor-pointer">
              ← Volver al Login
            </button>
          </div>
        </form>
      {/if}

    </div>
  </div>
</div>
