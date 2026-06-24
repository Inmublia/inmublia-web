<script>
  // SVELTE 5: Estado reactivo para el toggle de facturación
  import { Check, X, Zap, Crown, Building2, ArrowRight } from 'lucide-svelte';

  let facturacionAnual = $state(true);

  // Mapeo directo a tu base de datos: plan_suscripcion ('basico', 'pro', 'elite')
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
        { texto: 'Subdominio personalizado (.inmublia.com)', incluido: true },
        { texto: 'CRM Gestión de Interesados (Leads)', incluido: true },
        { texto: '5 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario hasta 10 propiedades', incluido: true },
        { texto: 'Bóveda Matchmaking', incluido: false },
        { texto: 'Dominio propio personalizado', incluido: false }
      ],
      linkId: 'price_basico_test' // Aquí irá tu ID de Stripe
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
        { texto: 'Subdominio personalizado (.inmublia.com)', incluido: true },
        { texto: 'CRM Avanzado con Semáforo de Abandono', incluido: true },
        { texto: '50 Créditos de IA mensuales', incluido: true },
        { texto: 'Inventario de propiedades ilimitado', incluido: true },
        { texto: 'Bóveda & Matchmaking Inteligente', incluido: true },
        { texto: 'Dominio propio personalizado', incluido: false }
      ],
      linkId: 'price_pro_test' // Aquí irá tu ID de Stripe
    },
    {
      id: 'elite',
      nombre: 'Élite',
      descripcion: 'Para agencias e inmobiliarias de alto volumen.',
      precioMensual: 1499,
      precioAnual: 1199,
      icono: Crown,
      color: 'emerald',
      destacado: false,
      features: [
        { texto: 'Subdominio personalizado (.inmublia.com)', incluido: true },
        { texto: 'CRM Multiusuario (Hasta 5 asesores)', incluido: true },
        { texto: 'Créditos de IA Ilimitados', incluido: true },
        { texto: 'Inventario de propiedades ilimitado', incluido: true },
        { texto: 'Bóveda & Matchmaking Inteligente', incluido: true },
        { texto: 'Dominio propio personalizado', incluido: true }
      ],
      linkId: 'price_elite_test' // Aquí irá tu ID de Stripe
    }
  ];
</script>

<svelte:head>
  <title>Planes y Precios | Inmublia</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white pb-24">
  
  <div class="pt-20 pb-16 px-6 text-center">
    <h1 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
      Invierte en tu <span class="text-indigo-600">Productividad</span>
    </h1>
    <p class="text-lg text-slate-600 max-w-2xl mx-auto font-medium mb-10">
      Elige el plan que mejor se adapte al volumen de tus operaciones. Cancela en cualquier momento.
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
  </div>

  <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
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

        <a 
          href="/registro?plan={plan.id}&ciclo={facturacionAnual ? 'anual' : 'mensual'}"
          class="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 {plan.destacado ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_25px_rgba(79,70,229,0.4)]' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md'}"
        >
          Comenzar Prueba
          <ArrowRight class="w-4 h-4" />
        </a>
      </div>
    {/each}
  </div>

  <div class="max-w-3xl mx-auto mt-20 text-center px-6">
    <p class="text-sm font-bold text-slate-500 flex items-center justify-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      Incluye 14 días de prueba sin compromiso en todos los planes.
    </p>
  </div>
</main>
