<script>
  import { Check, X, Zap, Crown, Building2, ArrowRight, Globe } from 'lucide-svelte';

  let facturacionAnual = $state(true);

  const planes = [
    {
      id: 'basico',
      nombre: 'Básico',
      descripcion: 'Para asesores independientes que van comenzando.',
      precioMensual: 499,
      precioAnual: 399,
      icono: Building2,
      color: 'slate',
      destacado: false,
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Gestión de Interesados (Leads)', incluido: true },
        { texto: '15 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario hasta 15 propiedades', incluido: true },
        { texto: 'Plantillas Smart Brochure VIP', incluido: false },
        { texto: 'Módulo de Open House', incluido: false }
      ],
      linkId: 'price_basico_test'
    },
    {
      id: 'pro',
      nombre: 'Profesional',
      descripcion: 'El ecosistema completo para cerrar más ventas.',
      precioMensual: 899,
      precioAnual: 749,
      icono: Zap,
      color: 'indigo',
      destacado: true,
      badge: 'Más Popular',
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Avanzado con Semáforo', incluido: true },
        { texto: '125 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario ilimitado', incluido: true },
        { texto: 'Plantillas Smart Brochure VIP', incluido: true },
        { texto: 'Módulo de Open House', incluido: true }
      ],
      linkId: 'price_pro_test'
    },
    {
      id: 'elite',
      nombre: 'Élite',
      descripcion: 'Para Top Producers con alto volumen de inventario.',
      precioMensual: 1499,
      precioAnual: 1199,
      icono: Crown,
      color: 'emerald',
      destacado: false,
      features: [
        { texto: 'Catálogo en subdominio (.inmublia.com)', incluido: true },
        { texto: 'CRM Avanzado con Semáforo', incluido: true },
        { texto: '500 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario ilimitado', incluido: true },
        { texto: 'Todas las plantillas VIP + Futuras', incluido: true },
        { texto: 'Soporte técnico prioritario (WhatsApp)', incluido: true }
      ],
      linkId: 'price_elite_test'
    }
  ];
</script>

<svelte:head>
  <title>Planes y Precios | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white pb-24">
  <header class="w-full h-20 flex items-center justify-between px-6 lg:px-12 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/50">
    <a href="/" class="flex items-center gap-2">
      <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
        <Building2 class="w-5 h-5 text-white" />
      </div>
      <span class="font-black text-xl tracking-tight text-slate-900">Inmublia</span>
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
      Elige el plan que mejor se adapte a tu ritmo de ventas. Tu cuenta es personal e intransferible.
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
        <span class="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Ahorra 20%</span>
      </div>
    </div>
  </main>

  <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start mb-16">
    {#each planes as plan}
      <div class="relative bg-white rounded-3xl p-8 border {plan.destacado ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10 scale-100 md:scale-105 z-10' : 'border-slate-200 shadow-xl shadow-slate-200/50'} flex flex-col h-full transition-transform duration-300">
        
        {#if plan.destacado}
          <div class="absolute -top-4 left-0 right-0 flex justify-center">
            <span class="bg-indigo-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
              {plan.badge}
            </span>
          </div>
        {/if}

        <div class="flex items-center gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center {plan.destacado ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'}">
            <plan.icono class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-xl font-black text-slate-900">{plan.nombre}</h3>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-baseline gap-1">
            <span class="text-3xl font-black text-slate-900">$</span>
            <span class="text-5xl font-black text-slate-900 tracking-tight">
              {facturacionAnual ? plan.precioAnual : plan.precioMensual}
            </span>
            <span class="text-sm font-bold text-slate-400">MXN / mes</span>
          </div>
          {#if facturacionAnual}
            <p class="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
              <Check class="w-3 h-3" /> Facturado anualmente (${plan.precioAnual * 12})
            </p>
          {:else}
            <p class="text-xs font-bold text-slate-400 mt-2">Facturado mensualmente</p>
          {/if}
        </div>

        <p class="text-sm font-medium text-slate-600 mb-8">{plan.descripcion}</p>

        <ul class="space-y-4 mb-8 flex-1">
          {#each plan.features as feature}
            <li class="flex items-start gap-3">
              {#if feature.incluido}
                <div class="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Check class="w-3 h-3 stroke-[3]" />
                </div>
                <span class="text-sm font-bold text-slate-700">{feature.texto}</span>
              {:else}
                <div class="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <X class="w-3 h-3 stroke-[3]" />
                </div>
                <span class="text-sm font-medium text-slate-400">{feature.texto}</span>
              {/if}
            </li>
          {/each}
        </ul>

        {#if plan.id === 'elite'}
          <a href="/contacto" class="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 bg-slate-900 hover:bg-slate-800 text-white shadow-md">
            Contactar Ventas
          </a>
        {:else}
          <a 
            href="/registro?plan={plan.id}&ciclo={facturacionAnual ? 'anual' : 'mensual'}"
            class="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 {plan.destacado ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_25px_rgba(79,70,229,0.4)]' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'}"
          >
            Seleccionar Plan
            <ArrowRight class="w-4 h-4" />
          </a>
        {/if}
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
