<!-- src/routes/login/+page.svelte -->
<div class="min-h-screen bg-[#050505] flex items-center justify-center p-4">
  <!-- Fondo de cristal -->
  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-900/10 rounded-full blur-[120px]"></div>
  </div>

  <div class="w-full max-w-md relative z-10">
    <div class="text-center mb-10">
      <a href="/" class="inline-block">
        <img src="/logo.png" alt="Inmublia" class="h-10 w-auto mx-auto brightness-0 invert opacity-90">
      </a>
      <h2 class="mt-6 text-2xl font-bold text-white">Ingresa a tu Consola</h2>
      <p class="text-slate-500 mt-2 text-sm">Gestiona tu agencia y tu inventario</p>
    </div>

    <div class="bg-[#0a0a0a] rounded-3xl p-8 border border-white/5 shadow-2xl">
      <form class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2">Correo Electrónico</label>
          <input type="email" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="broker@agencia.com">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
            Contraseña
            <a href="#" class="text-blue-400 hover:text-blue-300 text-xs">¿Olvidaste tu contraseña?</a>
          </label>
          <input type="password" class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="••••••••">
        </div>

        <button type="button" class="w-full bg-white hover:bg-slate-200 text-[#050505] font-bold py-3.5 rounded-xl transition-colors mt-2">
          Entrar a Inmublia
        </button>
      </form>
    </div>
  </div>
</div>
