<!-- src/routes/planes/+page.svelte -->
<script>
  import { Check, X, Zap, Crown, Building2, ArrowRight, Globe, Sparkles } from 'lucide-svelte';

  let facturacionAnual = $state(true);

  const planes = [
    {
      id: 'trial',
      nombre: 'Trial Élite',
      descripcion: 'Prueba todo el ecosistema Élite gratis. Cero riesgo.',
      precioMensual: 0,
      precioAnual: 0,
      icono: Sparkles,
      destacado: true,
      badge: '14 Días Gratis',
      features: [
        { texto: 'CRM Avanzado con Semáforo', incluido: true },
        { texto: 'Inventario de 5 propiedades', incluido: true },
        { texto: '15 Créditos de IA', incluido: true },
        { texto: '1 Evento Open House', incluido: true },
        { texto: 'Sin tarjeta de crédito', incluido: true }
      ]
    },
    {
      id: 'basico',
      nombre: 'Básico',
      descripcion: 'Para asesores independientes que van comenzando.',
      precioMensual: 499,
      precioAnual: 399,
      icono: Building2,
      destacado: false,
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Gestión de Interesados (Leads)', incluido: true },
        { texto: '15 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario ilimitado', incluido: true },
        { texto: 'Plantillas Smart Brochure VIP', incluido: false },
        { texto: 'Módulo de Open House', incluido: false }
      ]
    },
    {
      id: 'pro',
      nombre: 'Profesional',
      descripcion: 'El ecosistema completo para cerrar más ventas.',
      precioMensual: 899,
      precioAnual: 749,
      icono: Zap,
      destacado: true,
      badge: 'Más Popular',
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Avanzado con Semáforo', incluido: true },
        { texto: '125 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario ilimitado', incluido: true },
        { texto: 'Plantillas Smart Brochure VIP', incluido: true },
        { texto: 'Módulo de Open House', incluido: true }
      ]
    },
    {
      id: 'elite',
      nombre: 'Élite',
      descripcion: 'Para Top Producers con alto volumen de inventario.',
      precioMensual: 1499,
      precioAnual: 1199,
      icono: Crown,
      destacado: false,
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Avanzado con Semáforo', incluido: true },
        { texto: '500 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario ilimitado', incluido: true },
        { texto: 'Todas las plantillas VIP + Futuras', incluido: true },
        { texto: 'Soporte técnico prioritario (WhatsApp)', incluido: true }
      ]
    }
  ];
</script>

<svelte:head>
  <title>Planes y Precios | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white pb-24">
  <header class="w-full h-20 flex items-center justify-between px-6 lg:px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/50">
    <a href="/" class="flex items-center">
      <img src="/logo.png" alt="Inmublia" class="h-10 md:h-12 w-auto object-contain drop-shadow-sm" />
    </a>
    <a href="/login" class="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
      Ya tengo cuenta &rarr;
    </a>
  </header>

  <main class="pt-16 pb-16 px-6 text-center">
    <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
      Invierte en tu <span class="text-indigo-600">Productividad</span>
    </h1>
    <p class="text-lg text-slate-600 max-w-2xl mx-auto font-medium mb-10">
      Prueba sin compromiso o elige el plan que mejor se adapte a tu ritmo de ventas. Tu cuenta es personal e intransferible.
    </p>

    <div class="flex items-center justify-center gap-4">
      <span class="text-sm font-bold {facturacionAnual ? 'text-slate-400' : 'text-slate-900'} transition-colors">Mensual</span>
      
      <button 
        type="button"
        onclick={() => facturacionAnual = !facturacionAnual}
        class="relative inline-flex h-7 w-14 items-center rounded-full bg-slate-900 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-900/20"
        aria-pressed={facturacionAnual}
      >
        <span class="sr-only">Cambiar facturación anual</span>
        <span class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm {facturacionAnual ? 'translate-x-8' : 'translate-x-1'}"></span>
      </button>
      
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold {facturacionAnual ? 'text-slate-900' : 'text-slate-400'} transition-colors">Anual</span>
        <span class="bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Ahorra 20%</span>
      </div>
    </div>
  </main>

  <div class="max-w-[90rem] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start mb-16 pt-4">
    {#each planes as plan}
      <div class="relative bg-white rounded-3xl p-6 border flex flex-col h-full transition-all duration-300 
        {plan.id === 'trial' ? 'border-indigo-800 shadow-2xl shadow-indigo-800/20 scale-100 lg:scale-105 z-20' 
        : plan.id === 'pro' ? 'border-indigo-950 shadow-2xl shadow-indigo-950/20 scale-100 lg:scale-105 z-20' 
        : 'border-slate-200 shadow-xl shadow-slate-200/50 scale-100 z-10'}">
        
        {#if plan.badge}
          <div class="absolute -top-3 left-0 right-0 flex justify-center">
            <span class="{plan.id === 'trial' ? 'bg-indigo-800' : 'bg-indigo-950'} text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
              {plan.badge}
            </span>
          </div>
        {/if}

        <div class="flex items-center gap-3 mb-6 mt-2">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center 
            {plan.id === 'trial' ? 'bg-indigo-50 text-indigo-800' 
            : plan.id === 'pro' ? 'bg-indigo-100 text-indigo-950' 
            : 'bg-slate-50 text-slate-600'}">
            <plan.icono class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-black text-slate-900">{plan.nombre}</h3>
        </div>

        <div class="mb-4 h-16">
          {#if plan.id === 'trial'}
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-black text-slate-900">Gratis</span>
            </div>
            <p class="text-[10px] font-bold text-indigo-800 mt-2">Prueba Élite x 14 días</p>
          {:else}
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-slate-900">$</span>
              <span class="text-4xl font-black text-slate-900 tracking-tight">
                {facturacionAnual ? plan.precioAnual : plan.precioMensual}
              </span>
              <span class="text-xs font-bold text-slate-400">/ mes</span>
            </div>
            {#if facturacionAnual}
              <p class="text-[10px] font-bold text-indigo-950 mt-2 flex items-center gap-1">
                <Check class="w-3 h-3" /> Facturado anualmente (${plan.precioAnual * 12})
              </p>
            {:else}
              <p class="text-[10px] font-bold text-slate-400 mt-2">Facturado mensualmente</p>
            {/if}
          {/if}
        </div>

        <p class="text-xs font-medium text-slate-600 mb-6 h-10">{plan.descripcion}</p>

        <ul class="space-y-3 mb-8 flex-1">
          {#each plan.features as feature}
            <li class="flex items-start gap-2">
              {#if feature.incluido}
                <div class="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                  {plan.id === 'trial' ? 'bg-indigo-50 text-indigo-800' 
                  : plan.id === 'pro' ? 'bg-indigo-100 text-indigo-950' 
                  : 'bg-slate-100 text-slate-500'}">
                  <Check class="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span class="text-xs font-bold text-slate-700">{feature.texto}</span>
              {:else}
                <div class="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <X class="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span class="text-xs font-medium text-slate-400">{feature.texto}</span>
              {/if}
            </li>
          {/each}
        </ul>

        <a 
          href="/registro?plan={plan.id}&ciclo={facturacionAnual ? 'anual' : 'mensual'}"
          class="w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 
          {plan.id === 'trial' ? 'bg-indigo-800 hover:bg-indigo-700 text-white shadow-[0_4px_20px_rgba(55,48,163,0.3)] hover:shadow-[0_4px_25px_rgba(55,48,163,0.4)]' 
          : plan.id === 'pro' ? 'bg-indigo-950 hover:bg-indigo-900 text-white shadow-[0_4px_20px_rgba(30,27,75,0.3)] hover:shadow-[0_4px_25px_rgba(30,27,75,0.4)]' 
          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'}"
        >
          {plan.id === 'trial' ? 'Comenzar Trial' : 'Seleccionar Plan'}
          <ArrowRight class="w-3.5 h-3.5" />
        </a>
      </div>
    {/each}
  </div>

  <!-- BANNER DE ADD-ON: Dominio Personalizado -->
  <div class="max-w-4xl mx-auto px-6">
    <div class="bg-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-slate-800">
      <div class="flex items-center gap-5">
        <div class="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shrink-0">
          <Globe class="w-7 h-7 text-indigo-400" />
        </div>
        <div>
          <h4 class="text-lg font-black text-white flex items-center gap-2">
            Módulo Premium: Tu propio dominio .com
          </h4>
          <p class="text-sm text-slate-400 mt-1 font-medium">
            Sustituye el subdominio de Inmublia por tu propia marca (ej. www.tuagencia.com). Compatible con cualquier plan.
          </p>
        </div>
      </div>
      <div class="shrink-0 flex flex-col items-center sm:items-end">
        <span class="text-2xl font-black text-white">+$299 <span class="text-sm font-medium text-slate-400">MXN / mes</span></span>
        <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-1">Disponible en tu consola</span>
      </div>
    </div>
  </div>

</div>
