<script>
  // En Svelte 5, ya no necesitamos export let para props simples sin estado
</script>

<div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center border border-slate-100">
    <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    
    <h1 class="text-2xl font-bold text-slate-900 mb-2">¡Bienvenido a Inmublia!</h1>
    <p class="text-slate-600 mb-8">
      Tu pago se procesó correctamente y tu cuenta ya está creada en nuestros servidores. 
      Para entrar a tu panel de control, te enviaremos un enlace de acceso seguro.
    </p>

    <a href="/login" class="block w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors">
      Ir al Portal de Acceso
    </a>
  </div>
</div>
