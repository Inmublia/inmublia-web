<script>
  import { onMount } from 'svelte';
  import { CheckCircle2, Mail, ArrowRight, Building2, Sparkles } from 'lucide-svelte';
  
  let animar = $state(false);

  onMount(() => {
    // Pequeño delay para el efecto "Wow" al volver de Stripe
    setTimeout(() => animar = true, 100);
  });
</script>

<svelte:head>
  <title>¡Agencia Creada! | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 relative overflow-hidden">
  
  <!-- Efecto de iluminación de fondo -->
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

  <div class="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 text-center relative z-10 transform transition-all duration-700 {animar ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95'}">
    
    <div class="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-100 relative">
      <CheckCircle2 class="w-10 h-10 text-emerald-500 relative z-10" />
      <Sparkles class="w-5 h-5 text-amber-400 absolute -top-1 -right-2 animate-pulse" />
    </div>

    <h1 class="text-3xl font-black text-slate-900 mb-3 tracking-tight">¡Pago Procesado!</h1>
    <p class="text-slate-500 font-medium mb-8 leading-relaxed">
      Tu infraestructura inmobiliaria está siendo aprovisionada en nuestros servidores.
    </p>

    <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 text-left">
      <h3 class="text-xs font-bold text-indigo-800 uppercase tracking-widest mb-3 flex items-center gap-2">
        <Mail class="w-4 h-4" /> Siguiente Paso Crucial
      </h3>
      <p class="text-sm text-indigo-900/80 font-medium">
        Hemos enviado un <strong>enlace de acceso seguro</strong> al correo que registraste. Revisa tu bandeja de entrada (y la carpeta de SPAM) para establecer tu contraseña definitiva e ingresar a tu consola.
      </p>
    </div>

    <a href="/login" class="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl w-full transition-all shadow-md active:scale-95">
      Ir a mi Consola <ArrowRight class="w-4 h-4" />
    </a>
  </div>

  <div class="mt-12 flex items-center gap-2 text-slate-400 opacity-60">
    <Building2 class="w-4 h-4" />
    <span class="text-xs font-bold uppercase tracking-widest">Inmublia Technologies</span>
  </div>
</div>
