<script>
  import { page } from '$app/stores';
  import { Building2, ArrowRight, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-svelte';

  // Leemos el plan y ciclo desde la URL (viene de la página /planes)
  let planId = $page.url.searchParams.get('plan') || 'pro';
  let ciclo = $page.url.searchParams.get('ciclo') || 'anual';
  
  let loading = $state(false);
  let errorMsg = $state('');

  // Mapeamos los IDs de Stripe (Asegúrate de que coincidan con los de tu dashboard de Stripe)
  const stripePrices = {
    basico: {
      mensual: 'price_basico_mensual_id', // Sustituye con tu ID real de Stripe
      anual: 'price_basico_anual_id'      // Sustituye con tu ID real de Stripe
    },
    pro: {
      mensual: 'price_1TfAJKJHda98KYP8coylMcTp', // Extraído de tu Webhook
      anual: 'price_pro_anual_id'                // Sustituye con tu ID real de Stripe
    },
    elite: {
      mensual: 'price_1TfAJdJHda98KYP8KzZTwXDf', // Extraído de tu Webhook
      anual: 'price_elite_anual_id'              // Sustituye con tu ID real de Stripe
    }
  };

  const planInfo = {
    basico: { nombre: 'Básico', precio: ciclo === 'anual' ? '$399' : '$499', creditos: 15 },
    pro: { nombre: 'Profesional', precio: ciclo === 'anual' ? '$749' : '$899', creditos: 125 },
    elite: { nombre: 'Élite', precio: ciclo === 'anual' ? '$1,199' : '$1,499', creditos: 500 }
  };

  let planSeleccionado = planInfo[planId] || planInfo.pro;

  // Variables reactivas del formulario
  let valEmail = $state('');
  let valAgencia = $state('');
  let valSubdominio = $derived(valAgencia.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Disparamos el Checkout de Stripe
  async function irAlPago(event) {
    event.preventDefault();
    loading = true;
    errorMsg = '';

    const priceToCharge = stripePrices[planId][ciclo];

    if (!priceToCharge) {
      errorMsg = 'Error de configuración: Plan no disponible.';
      loading = false;
      return;
    }

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId: 'TEMP_GUEST_' + Math.random().toString(36).substring(2, 10), // El webhook creará el usuario si ve TEMP_GUEST
          email: valEmail,
          nombreComercial: valAgencia,
          subdominioDeseado: valSubdominio,
          priceId: priceToCharge
        })
      });

      const result = await response.json();

      if (response.ok && result.url) {
        // Redirigir a Stripe Checkout
        window.location.href = result.url;
      } else {
        errorMsg = result.error || 'No se pudo generar la orden de pago.';
        loading = false;
      }
    } catch (e) {
      errorMsg = 'Fallo de conexión. Revisa tu internet e intenta de nuevo.';
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Configurar Agencia | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-white font-sans flex flex-col md:flex-row">
  <!-- Columna Izquierda (Informativa y Persuasiva) -->
  <div class="hidden md:flex flex-col justify-between w-1/3 bg-slate-900 text-white p-12 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
    <div class="relative z-10">
      <a href="/" class="flex items-center gap-2 mb-16">
        <div class="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
          <Building2 class="w-5 h-5 text-white" />
        </div>
        <span class="font-black text-xl tracking-tight text-white">Inmublia</span>
      </a>
      
      <h2 class="text-3xl font-black mb-4">Estás a un paso de escalar tu agencia.</h2>
      <p class="text-slate-400 font-medium mb-8">Has seleccionado el Plan {planSeleccionado.nombre}.</p>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div class="text-2xl font-black text-white mb-1">{planSeleccionado.precio} <span class="text-sm text-slate-400 font-medium">MXN / {ciclo}</span></div>
        <div class="space-y-3 mt-6">
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> {planSeleccionado.creditos} Créditos de IA
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> CRM Operativo SaaS
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Plantillas High-End
          </div>
        </div>
      </div>
    </div>
    <div class="relative z-10 text-xs font-medium text-slate-500 mt-12 flex items-center gap-2">
      <ShieldCheck class="w-4 h-4" /> Pasarela de pago encriptada por Stripe.
    </div>
  </div>

  <!-- Columna Derecha (Formulario de Checkout B2B) -->
  <div class="flex-1 flex flex-col justify-center px-6 py-12 md:px-24 bg-slate-50">
    <div class="max-w-md w-full mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      <h1 class="text-3xl font-black text-slate-900 mb-2">Configura tu Espacio</h1>
      <p class="text-slate-500 font-medium mb-8 text-sm">Crea la base de tu agencia y procede al pago seguro.</p>

      {#if errorMsg}
        <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 animate-[fadeIn_0.3s_ease-out]">
          {errorMsg}
        </div>
      {/if}

      <form onsubmit={irAlPago} class="space-y-5">
        
        <div>
          <label for="agencia" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre Comercial</label>
          <input type="text" id="agencia" bind:value={valAgencia} required placeholder="Ej. Skyline Inmobiliaria" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subdominio Asignado</label>
          <div class="flex items-center w-full h-12 bg-slate-100 border border-slate-200 rounded-xl px-4 overflow-hidden">
            <span class="text-slate-400 font-medium whitespace-nowrap">https://</span>
            <span class="text-indigo-600 font-bold px-1 overflow-hidden text-ellipsis whitespace-nowrap">{valSubdominio || 'tuagencia'}</span>
            <span class="text-slate-400 font-medium whitespace-nowrap">.inmublia.com</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1.5 font-medium">Esta será la URL de tu catálogo público.</p>
        </div>

        <div class="pt-2">
          <label for="email" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Correo del Administrador</label>
          <input type="email" id="email" bind:value={valEmail} required placeholder="director@agencia.com" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300">
          <p class="text-[10px] text-slate-400 mt-1.5 font-medium">A este correo enviaremos tu clave de acceso provisional tras el pago.</p>
        </div>

        <button type="submit" disabled={loading || !valAgencia || !valEmail} class="w-full h-14 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
          {#if loading}
            <Loader2 class="w-5 h-5 animate-spin" /> Creando Sesión de Pago...
          {:else}
            Continuar al Pago Seguro <ArrowRight class="w-5 h-5" />
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>
