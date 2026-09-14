<!-- src/routes/admin/planes/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { CheckCircle2, Zap, ShieldCheck, AlertOctagon, Loader2 } from 'lucide-svelte';

  let { data, form } = $props();
  let alerta = $derived(data.alerta);
  let estatus = $derived(data.broker?.status_suscripcion || 'active');
  let esCancelado = $derived(['cancelada', 'canceled'].includes(estatus));

  let isAnnual = $state(true);
  let isProcessing = $state(false);

  // Mapeo exacto de los IDs de Stripe que me proporcionaste
  const plans = {
    basico: {
      mensual: 'price_1UFgBoJHda98KYP8zVxz1V2h',
      anual: 'price_1UFgCSJHda98KYP8WAfuaRCU',
      name: 'Básico',
      priceM: '349',
      priceA: '290'
    },
    pro: {
      mensual: 'price_1UFgDVJHda98KYP8Hvvb7jIU',
      anual: 'price_1UF3y9JHda98KYP83uVDd0rF',
      name: 'Pro',
      priceM: '749',
      priceA: '599'
    },
    elite: {
      mensual: 'price_1UF3vVJHda98KYP8sEBcENHN',
      anual: 'price_1UF3wrJHda98KYP82p3McSSj',
      name: 'Elite',
      priceM: '1,499',
      priceA: '1,199'
    }
  };

  function checkoutHandler() {
    isProcessing = true;
    return async ({ update }) => {
      isProcessing = false;
      await update();
    };
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col font-sans">
  <!-- Banner Reactivo para Usuarios Cancelados -->
  {#if esCancelado || alerta === 'cuenta_cancelada'}
    <div class="bg-red-500 text-white px-6 py-4 flex items-center justify-center gap-3 shadow-md z-50">
      <AlertOctagon class="w-5 h-5 shrink-0" />
      <p class="text-sm font-bold tracking-wide">
        Tu suscripción anterior ha sido cancelada. Selecciona un plan para reactivar tu cuenta y recuperar tu inventario.
      </p>
    </div>
  {/if}

  <div class="flex-1 max-w-6xl mx-auto w-full px-6 py-16">
    <div class="text-center max-w-2xl mx-auto mb-12">
      <h1 class="text-4xl font-black text-slate-900 tracking-tight mb-4">
        La infraestructura de las agencias top
      </h1>
      <p class="text-slate-500 text-lg">
        Activa tu cuenta hoy. Cancela cuando quieras.
      </p>

      <!-- Toggle Mensual / Anual -->
      <div class="flex items-center justify-center gap-4 mt-8">
        <span class="text-sm font-bold {isAnnual ? 'text-slate-400' : 'text-slate-900'}">Mensual</span>
        <button 
          type="button"
          class="relative w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none {isAnnual ? 'bg-indigo-600' : 'bg-slate-300'}"
          onclick={() => isAnnual = !isAnnual}
        >
          <div class="absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform duration-300 {isAnnual ? 'translate-x-8' : ''}"></div>
        </button>
        <span class="text-sm font-bold {isAnnual ? 'text-slate-900' : 'text-slate-400'}">
          Anual <span class="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-1 uppercase tracking-wider">Ahorra 20%</span>
        </span>
      </div>

      {#if form?.error}
        <div class="mt-6 p-4 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 text-sm">
          {form.error}
        </div>
      {/if}
    </div>

    <!-- Pricing Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
      
      <!-- BÁSICO -->
      <form method="POST" action="?/checkout" use:enhance={checkoutHandler} class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
        <input type="hidden" name="price_id" value={isAnnual ? plans.basico.anual : plans.basico.mensual}>
        <div class="mb-6">
          <h3 class="text-xl font-black text-slate-900 mb-2">{plans.basico.name}</h3>
          <p class="text-sm text-slate-500 font-medium">Esencial para agentes independientes.</p>
        </div>
        <div class="mb-8">
          <span class="text-4xl font-black text-slate-900">${isAnnual ? plans.basico.priceA : plans.basico.priceM}</span>
          <span class="text-sm text-slate-500 font-bold">/mes</span>
          {#if isAnnual}<p class="text-xs text-slate-400 mt-1">Facturado anualmente</p>{/if}
        </div>
        <ul class="space-y-4 mb-8 flex-1">
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" /> Inventario ilimitado</li>
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" /> 15 Créditos IA mensuales</li>
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-emerald-500 shrink-0" /> 2 Plantillas Web</li>
        </ul>
        <button type="submit" disabled={isProcessing} class="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center">
          {isProcessing ? 'Conectando...' : 'Elegir Básico'}
        </button>
      </form>

      <!-- PRO (Highlighted) -->
      <form method="POST" action="?/checkout" use:enhance={checkoutHandler} class="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-2xl relative flex flex-col h-full transform md:-translate-y-4">
        <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm flex items-center gap-1">
          <Zap class="w-3 h-3" /> Más Popular
        </div>
        <input type="hidden" name="price_id" value={isAnnual ? plans.pro.anual : plans.pro.mensual}>
        
        <div class="mb-6 mt-2">
          <h3 class="text-xl font-black text-white mb-2">{plans.pro.name}</h3>
          <p class="text-sm text-slate-400 font-medium">Para agencias en crecimiento.</p>
        </div>
        <div class="mb-8">
          <span class="text-4xl font-black text-white">${isAnnual ? plans.pro.priceA : plans.pro.priceM}</span>
          <span class="text-sm text-slate-400 font-bold">/mes</span>
          {#if isAnnual}<p class="text-xs text-slate-500 mt-1">Facturado anualmente</p>{/if}
        </div>
        <ul class="space-y-4 mb-8 flex-1">
          <li class="flex items-start gap-3 text-sm text-slate-200 font-medium"><CheckCircle2 class="w-5 h-5 text-amber-400 shrink-0" /> Todo lo del plan Básico</li>
          <li class="flex items-start gap-3 text-sm text-slate-200 font-medium"><CheckCircle2 class="w-5 h-5 text-amber-400 shrink-0" /> 125 Créditos IA mensuales</li>
          <li class="flex items-start gap-3 text-sm text-slate-200 font-medium"><CheckCircle2 class="w-5 h-5 text-amber-400 shrink-0" /> Tracking (Meta Pixel & GA4)</li>
          <li class="flex items-start gap-3 text-sm text-slate-200 font-medium"><CheckCircle2 class="w-5 h-5 text-amber-400 shrink-0" /> Webhook API Access</li>
        </ul>
        <button type="submit" disabled={isProcessing} class="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center shadow-lg shadow-amber-500/20">
          {isProcessing ? 'Conectando...' : 'Elegir Pro'}
        </button>
      </form>

      <!-- ELITE -->
      <form method="POST" action="?/checkout" use:enhance={checkoutHandler} class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full">
        <input type="hidden" name="price_id" value={isAnnual ? plans.elite.anual : plans.elite.mensual}>
        <div class="mb-6">
          <h3 class="text-xl font-black text-slate-900 mb-2">{plans.elite.name}</h3>
          <p class="text-sm text-slate-500 font-medium">Dominio total del mercado.</p>
        </div>
        <div class="mb-8">
          <span class="text-4xl font-black text-slate-900">${isAnnual ? plans.elite.priceA : plans.elite.priceM}</span>
          <span class="text-sm text-slate-500 font-bold">/mes</span>
          {#if isAnnual}<p class="text-xs text-slate-400 mt-1">Facturado anualmente</p>{/if}
        </div>
        <ul class="space-y-4 mb-8 flex-1">
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><ShieldCheck class="w-5 h-5 text-indigo-500 shrink-0" /> Todo lo del plan Pro</li>
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-indigo-500 shrink-0" /> 500 Créditos IA mensuales</li>
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-indigo-500 shrink-0" /> TikTok Pixel ID</li>
          <li class="flex items-start gap-3 text-sm text-slate-700 font-medium"><CheckCircle2 class="w-5 h-5 text-indigo-500 shrink-0" /> Todas las plantillas Elite</li>
        </ul>
        <button type="submit" disabled={isProcessing} class="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-4 rounded-xl transition-colors disabled:opacity-50 flex justify-center">
          {isProcessing ? 'Conectando...' : 'Elegir Elite'}
        </button>
      </form>

    </div>
  </div>
</div>
