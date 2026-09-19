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

<!-- 🚀 TEMA OSCURO APLICADO: bg-zinc-950 en lugar de slate-50 -->
<div class="min-h-screen bg-zinc-950 font-sans selection:bg-indigo-500 selection:text-white pb-16">
  
  <header class="w-full h-16 flex items-center justify-between px-6 lg:px-12 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-800/50">
    <a href="/" class="flex items-center shrink-0 w-24">
      <!-- Filtro invert para que el logo oscuro se vea blanco en el fondo negro (opcional) -->
      <img src="/logo.png" alt="Logo" class="h-8 w-auto object-contain drop-shadow-sm brightness-0 invert opacity-90" />
    </a>
    
    <!-- 🚀 MARCA CENTRAL EN NEGRITAS -->
    <div class="absolute left-1/2 -translate-x-1/2 hidden sm:block">
      <span class="text-2xl font-black text-white tracking-[0.2em] uppercase drop-shadow-md">Inmublia</span>
    </div>

    <a href="/login" class="text-sm font-bold text-zinc-400 hover:text-white transition-colors shrink-0 w-24 text-right">
      Log In &rarr;
    </a>
  </header>

  <!-- 🚀 COMPACTACIÓN: pt-10 pb-8 en lugar de pt-16 pb-16 -->
  <main class="pt-10 pb-8 px-6 text-center">
    <h1 class="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
      Invierte en tu <span class="text-indigo-500">Productividad</span>
    </h1>
    <p class="text-base text-zinc-400 max-w-2xl mx-auto font-medium mb-8">
      Prueba sin compromiso o elige el plan que mejor se adapte a tu ritmo de ventas. Tu cuenta es personal e intransferible.
    </p>

    <div class="flex items-center justify-center gap-4">
      <span class="text-sm font-bold {facturacionAnual ? 'text-zinc-600' : 'text-white'} transition-colors">Mensual</span>
      
      <!-- 🚀 TOGGLE COLOR DINÁMICO Y TAMAÑO AJUSTADO -->
      <button 
        type="button"
        onclick={() => facturacionAnual = !facturacionAnual}
        class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 {facturacionAnual ? 'bg-indigo-600' : 'bg-zinc-700'}"
        aria-pressed={facturacionAnual}
      >
        <span class="sr-only">Cambiar facturación anual</span>
        <span class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-md {facturacionAnual ? 'translate-x-6' : 'translate-x-1'}"></span>
      </button>
      
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold {facturacionAnual ? 'text-white' : 'text-zinc-600'} transition-colors">Anual</span>
        <span class="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">Ahorra 20%</span>
      </div>
    </div>
  </main>

  <!-- 🚀 COMPACTACIÓN: gap-5, p-5 -->
  <div class="max-w-[90rem] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start mb-12 pt-2">
    {#each planes as plan}
      <!-- 🚀 TARJETAS DARK MODE -->
      <div class="relative rounded-3xl p-5 border flex flex-col h-full transition-all duration-300 
        {plan.id === 'trial' ? 'bg-zinc-900 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)] lg:scale-[1.02] z-20' 
        : plan.id === 'pro' ? 'bg-zinc-800 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)] lg:scale-[1.02] z-20' 
        : 'bg-zinc-900 border-zinc-800 shadow-xl z-10'}">
        
        {#if plan.badge}
          <div class="absolute -top-3 left-0 right-0 flex justify-center">
            <span class="{plan.id === 'pro' ? 'bg-indigo-500' : 'bg-indigo-600'} text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
              {plan.badge}
            </span>
          </div>
        {/if}

        <div class="flex items-center gap-3 mb-5 mt-2">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center 
            {plan.id === 'trial' || plan.id === 'pro' ? 'bg-indigo-500/20 text-indigo-400' 
            : 'bg-zinc-800 text-zinc-300'}">
            <plan.icono class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-black text-white">{plan.nombre}</h3>
        </div>

        <div class="mb-4 h-14">
          {#if plan.id === 'trial'}
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black text-white">Gratis</span>
            </div>
            <p class="text-[10px] font-bold text-indigo-400 mt-1">Prueba Élite x 14 días</p>
          {:else}
            <div class="flex items-baseline gap-1">
              <span class="text-xl font-black text-zinc-300">$</span>
              <span class="text-3xl font-black text-white tracking-tight">
                {facturacionAnual ? plan.precioAnual : plan.precioMensual}
              </span>
              <span class="text-xs font-bold text-zinc-500">/ mes</span>
            </div>
            {#if facturacionAnual}
              <p class="text-[10px] font-bold text-zinc-400 mt-1 flex items-center gap-1">
                <Check class="w-3 h-3 text-indigo-400" /> Facturado anualmente (${plan.precioAnual * 12})
              </p>
            {:else}
              <p class="text-[10px] font-bold text-zinc-600 mt-1">Facturado mensualmente</p>
            {/if}
          {/if}
        </div>

        <p class="text-xs font-medium text-zinc-400 mb-5 h-8 leading-tight">{plan.descripcion}</p>

        <ul class="space-y-3 mb-6 flex-1">
          {#each plan.features as feature}
            <li class="flex items-start gap-2.5">
              {#if feature.incluido}
                <div class="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center
                  {plan.id === 'trial' || plan.id === 'pro' ? 'bg-indigo-500/20 text-indigo-400' 
                  : 'bg-zinc-800 text-zinc-300'}">
                  <Check class="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span class="text-xs font-medium text-zinc-300 leading-tight">{feature.texto}</span>
              {:else}
                <div class="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                  <X class="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span class="text-xs font-medium text-zinc-600 leading-tight">{feature.texto}</span>
              {/if}
            </li>
          {/each}
        </ul>

        <a 
          href="/registro?plan={plan.id}&ciclo={facturacionAnual ? 'anual' : 'mensual'}"
          class="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all duration-200 
          {plan.id === 'trial' || plan.id === 'pro' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20' 
          : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 shadow-sm'}"
        >
          {plan.id === 'trial' ? 'Comenzar Trial' : 'Seleccionar Plan'}
          <ArrowRight class="w-3.5 h-3.5" />
        </a>
      </div>
    {/each}
  </div>

  <!-- BANNER DE ADD-ON: Dominio Personalizado -->
  <div class="max-w-4xl mx-auto px-6">
    <div class="bg-zinc-900/80 backdrop-blur-sm rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl border border-zinc-800">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shrink-0">
          <Globe class="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h4 class="text-base font-black text-white flex items-center gap-2">
            Módulo Premium: Tu propio dominio .com
          </h4>
          <p class="text-xs text-zinc-400 mt-0.5 font-medium">
            Sustituye el subdominio por tu marca (ej. www.tuagencia.com).
          </p>
        </div>
      </div>
      <div class="shrink-0 flex flex-col items-center sm:items-end">
        <span class="text-xl font-black text-white">+$299 <span class="text-xs font-medium text-zinc-500">MXN / mes</span></span>
        <span class="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mt-1">Disponible en tu consola</span>
      </div>
    </div>
  </div>

</div>
```eof

Pruébalo en pantalla completa, la interfaz ha pasado de ser un SaaS estándar a tener la presencia de una plataforma Enterprise moderna y atractiva visualmente.

¿Qué te parece el nuevo aspecto? ¿Hay alguna otra vista que quieras alinear a este diseño oscuro?
