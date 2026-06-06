<script>
  // Paso del Wizard: 1 = Planes, 2 = Formulario
  let step = $state(1);
  let selectedPlan = $state(null);

  // Estados del formulario
  let nombreComercial = $state('');
  let subdominioDeseado = $state('');
  let loading = $state(false);
  let errorMessage = $state('');

  // Estructura de tus paquetes (REEMPLAZA los priceId con los que te dé Stripe para cada uno)
  const planes = [
    {
      id: 'asesor',
      priceId: 'prod_UeShlvnXgWJkO8',
      nombre: 'Asesor',
      precio: 549,
      descripcion: 'Para agentes independientes que buscan digitalizar su inventario.',
      beneficios: ['1 Usuario', 'Smart Brochures', 'Gestión de Leads Básica']
    },
    {
      id: 'broker',
      priceId: 'prod_UeTFPaHYkKViQE',
      nombre: 'Broker',
      precio: 749,
      destacado: true,
      descripcion: 'El estándar de la industria. Para agencias en crecimiento.',
      beneficios: ['Multiusuario', 'Open House System', 'Estadísticas Avanzadas', 'Soporte Prioritario']
    },
    {
      id: 'socio',
      priceId: 'prod_UeTGbmV8p4Guo1',
      nombre: 'Socio',
      precio: 1399,
      descripcion: 'Control total. Escalabilidad y marca blanca corporativa.',
      beneficios: ['Usuarios Ilimitados', 'Marca Blanca Total', 'API Access', 'Onboarding Dedicado']
    }
  ];

  // Limpieza en tiempo real del subdominio
  let subdominioLimpio = $derived(
    subdominioDeseado
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  );

  function seleccionarPlan(plan) {
    selectedPlan = plan;
    step = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function procesarPago(e) {
    e.preventDefault();
    if (loading) return;
    
    if (!nombreComercial.trim() || !subdominioLimpio) {
      errorMessage = 'Por favor, completa los datos de tu agencia.';
      return;
    }

    loading = true;
    errorMessage = '';

    try {
      const payload = {
        authUserId: 'usr_test_provisional_12345', // En el futuro será el ID real de Supabase
        email: 'cliente_demo@inmublia.com',
        nombreComercial: nombreComercial.trim(),
        subdominioDeseado: subdominioLimpio,
        priceId: selectedPlan.priceId // Manda el ID correcto según el paquete que eligió
      };

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al conectar con la pasarela de pagos.');
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No se recibió la URL de redirección.');
      }

    } catch (err) {
      console.error('🔥 Error en Checkout:', err);
      errorMessage = err.message;
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans transition-all duration-500">
  
  {#if step === 1}
    <div class="max-w-7xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight sm:text-5xl">Invierte en tu Escalabilidad</h1>
        <p class="mt-4 text-lg text-slate-500 font-medium">Elige el paquete que defina el nivel de tu agencia.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {#each planes as plan}
          <div class="relative flex flex-col p-8 bg-white rounded-3xl border {plan.destacado ? 'border-slate-900 shadow-2xl scale-105 z-10' : 'border-slate-200 shadow-sm'} transition-transform">
            {#if plan.destacado}
              <div class="absolute -top-4 left-1/2 -translate-x-1/2">
                <span class="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-3 rounded-full">Más Popular</span>
              </div>
            {/if}
            
            <div class="mb-8">
              <h3 class="text-xl font-bold text-slate-900">{plan.nombre}</h3>
              <p class="mt-2 text-sm text-slate-500">{plan.descripcion}</p>
              <div class="mt-6 flex items-baseline text-slate-900">
                <span class="text-5xl font-black tracking-tight">${plan.precio}</span>
                <span class="ml-1 text-sm font-semibold text-slate-500 uppercase">/ mes</span>
              </div>
            </div>

            <ul class="flex-1 space-y-4 mb-8">
              {#each plan.beneficios as beneficio}
                <li class="flex items-start">
                  <svg class="h-5 w-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  <span class="ml-3 text-sm text-slate-600">{beneficio}</span>
                </li>
              {/each}
            </ul>

            <button onclick={() => seleccionarPlan(plan)} class="w-full py-4 px-6 rounded-xl text-sm font-bold transition-all {plan.destacado ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-50 text-slate-900 hover:bg-slate-100 border border-slate-200'}">
              Seleccionar {plan.nombre}
            </button>
          </div>
        {/each}
      </div>
    </div>
  
  {:else if step === 2}
    <div class="max-w-xl mx-auto animate-[fadeIn_0.3s_ease-out]">
      <button onclick={() => step = 1} class="mb-8 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Cambiar Plan
      </button>

      <div class="text-center mb-8">
        <h2 class="text-3xl font-black text-slate-900 tracking-tight">Crea tu Agencia</h2>
        <p class="mt-2 text-sm text-slate-500">Configura tu espacio bajo el plan <strong>{selectedPlan.nombre}</strong>.</p>
      </div>

      <div class="bg-white py-8 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 rounded-3xl sm:px-10">
        <div class="flex justify-between items-center mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Plan Seleccionado</p>
            <p class="text-lg font-black text-slate-900 mt-1">{selectedPlan.nombre}</p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-black text-slate-900">${selectedPlan.precio} <span class="text-xs font-semibold text-slate-500 uppercase">MXN</span></p>
          </div>
        </div>

        <form onsubmit={procesarPago} class="space-y-6">
          <div>
            <label for="agency-name" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de tu Agencia</label>
            <input type="text" id="agency-name" bind:value={nombreComercial} required placeholder="Ej. Uribe Bienes Raíces" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
          </div>

          <div>
            <label for="subdomain" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu Subdominio Exclusivo</label>
            <div class="relative rounded-xl shadow-sm flex items-center bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden px-4 py-3">
              <input type="text" id="subdomain" bind:value={subdominioDeseado} required placeholder="tu-marca" class="w-full bg-transparent text-sm text-slate-900 outline-none">
              <span class="text-xs font-bold text-slate-400 lowercase select-none">.inmublia.com</span>
            </div>
            {#if subdominioLimpio}
              <p class="text-[10px] text-slate-400 font-medium mt-2 px-1">Tu URL será: <span class="text-blue-600 font-bold">{subdominioLimpio}.inmublia.com</span></p>
            {/if}
          </div>

          {#if errorMessage}
            <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600 text-center">{errorMessage}</div>
          {/if}

          <button type="submit" disabled={loading} class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
            {#if loading}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Abriendo pasarela...
            {:else}
              Continuar al Pago Seguro
            {/if}
          </button>
        </form>
      </div>
    </div>
  {/if}
</div>
