<script>
  import { enhance } from '$app/forms';
  import { 
    LayoutTemplate, 
    CheckCircle2, 
    Lock, 
    Sparkles, 
    Loader2, 
    ShieldCheck,
    Settings,
    CreditCard
  } from 'lucide-svelte';

  let { data, form } = $props();
  
  let broker = $derived(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let loading = $state(false);

  // NUEVO: Variables para la nueva lógica de facturación y webhooks
  let redirigiendoStripe = $state(false);
  let esPlanBasico = $derived(broker.plan_suscripcion === 'basico');

  const catalogoTemplates = [
    { 
      id: 'classic', 
      nombre: 'Classic Minimalist', 
      desc: 'Diseño limpio y tradicional enfocado en texto de alta legibilidad y listados rápidos.', 
      minPlan: 'basico',
      mockupBg: 'bg-white',
      mockupLine: 'bg-slate-200'
    },
    { 
      id: 'modern', 
      nombre: 'Modern Grid', 
      desc: 'Mosaicos dinámicos y transiciones fluidas optimizadas para agencias en escala.', 
      minPlan: 'pro',
      mockupBg: 'bg-slate-50',
      mockupLine: 'bg-indigo-300'
    },
    { 
      id: 'luxury', 
      nombre: 'Luxury Immersive', 
      desc: 'Diseño oscuro premium con cinemáticas, ideal para exclusivas de alto ticket.', 
      minPlan: 'elite',
      mockupBg: 'bg-zinc-950',
      mockupLine: 'bg-amber-500/50'
    }
  ];

  // NUEVO: Manejador para el botón de facturación
  function manejadorPortal() {
    redirigiendoStripe = true;
    return async ({ update }) => {
      await update();
      redirigiendoStripe = false;
    };
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-slate-50 font-sans text-slate-900">
  
 <header class="h-20 bg-zinc-950 border-b border-zinc-800 flex items-center px-6 sm:px-10 shrink-0 sticky top-0 z-20 shadow-xl shadow-zinc-900/10">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-zinc-900 rounded-xl text-white shadow-sm border border-zinc-800">
        <LayoutTemplate class="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-white">Configuración de Agencia</h1>
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-zinc-300 uppercase">{broker.plan_suscripcion}</span>
        </p>
      </div>
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto pb-32 animate-[fadeIn_0.4s_ease-out]">
    <div class="max-w-[1200px] mx-auto">
      
      <div class="mb-10">
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">Arquitectura Visual</h2>
        <p class="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
          Elige la identidad y el motor de renderizado con la que tus compradores potenciales interactuarán con tus exclusivas inmobiliarias.
        </p>
      </div>

      {#if form?.success}
        <div class="mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-bold p-4 rounded-xl text-sm flex items-center gap-3 shadow-sm animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle2 class="w-5 h-5 text-emerald-500" />
          ¡Arquitectura visual del portal sincronizada con éxito!
        </div>
      {/if}

      <form method="POST" action="?/guardarTemplate" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }}>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {#each catalogoTemplates as template}
            {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
            {@const activo = broker.template_seleccionado === template.id}
            
            <label class="relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 cursor-pointer shadow-sm
              {activo ? 'bg-white border-2 border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.12)] ring-4 ring-indigo-50' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'} 
              {!autorizado ? 'opacity-75 bg-slate-50/50 cursor-not-allowed filter grayscale-[20%]' : ''}">
              
              {#if autorizado}
                <input type="radio" name="template_id" value={template.id} checked={activo} class="sr-only">
              {/if}

              <div class="w-full h-32 rounded-xl mb-6 border border-slate-200/60 overflow-hidden relative shadow-inner {template.mockupBg}">
                <div class="absolute top-4 left-4 right-4 h-4 rounded-md {template.mockupLine} opacity-50"></div>
                <div class="absolute top-10 left-4 w-1/3 h-12 rounded-md {template.mockupLine} opacity-30"></div>
                <div class="absolute top-10 right-4 w-1/2 h-12 rounded-md {template.mockupLine} opacity-30"></div>
                {#if template.id === 'luxury'}
                  <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
                {/if}
              </div>

              <div class="flex-1">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-black text-lg text-slate-900 flex items-center gap-2">
                    {template.nombre}
                    {#if template.id === 'luxury'} <Sparkles class="w-4 h-4 text-amber-500" /> {/if}
                  </h3>
                </div>
                <p class="text-sm text-slate-500 leading-relaxed font-medium">{template.desc}</p>
              </div>

              <div class="mt-8 pt-5 border-t border-slate-100/80">
                {#if autorizado}
                  <div class="flex items-center gap-3">
                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors {activo ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}">
                      {#if activo} <CheckCircle2 class="w-3.5 h-3.5 text-white" /> {/if}
                    </div>
                    <span class="text-xs font-bold uppercase tracking-widest {activo ? 'text-indigo-700' : 'text-slate-500'}">
                      {activo ? 'Motor Activo' : 'Seleccionar Motor'}
                    </span>
                  </div>
                {:else}
                  <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Lock class="w-3.5 h-3.5 text-slate-400" /> Requiere Licencia
                    </div>
                    <button type="submit" formaction="?/abrirPortalFacturacion" class="inline-flex items-center justify-center w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm active:scale-95 gap-2" disabled={redirigiendoStripe}>
                      <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                      Desbloquear Plan {template.minPlan.toUpperCase()}
                    </button>
                  </div>
                {/if}
              </div>
            </label>
          {/each}
        </div>

        <div class="mt-12 flex justify-end">
          <button type="submit" disabled={loading} class="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-indigo-600 h-14 px-10 gap-3 shadow-xl shadow-slate-900/10 active:scale-95">
            {#if loading}
              <Loader2 class="w-5 h-5 animate-spin" />
              Sincronizando Identidad...
            {:else}
              <CheckCircle2 class="w-5 h-5" />
              Confirmar Arquitectura Visual
            {/if}
          </button>
        </div>
      </form>

      <div class="mt-20 pt-16 border-t border-slate-200">
        <div class="mb-10">
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Settings class="w-6 h-6 text-slate-400" /> Ajustes Avanzados
          </h2>
          <p class="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Administra tu membresía y configura conexiones avanzadas con herramientas externas.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">MEMBRESÍA ACTUAL</p>
              
              <div class="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                <div class="w-14 h-14 bg-zinc-950 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                  <Sparkles class="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 class="text-xl font-black text-slate-900 uppercase">INMUBLIA {broker.plan_suscripcion}</h3>
                  <p class="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 class="w-3.5 h-3.5" /> Membresía Activa
                  </p>
                </div>
              </div>
              <p class="text-sm text-slate-500 font-medium leading-relaxed">
                Administra tu método de pago, descarga tus facturas o cambia tu plan de suscripción directamente desde nuestro portal seguro.
              </p>
            </div>

            <form method="POST" action="?/abrirPortalFacturacion" use:enhance={manejadorPortal} class="mt-8">
              <button 
                type="submit" 
                disabled={redirigiendoStripe}
                class="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black tracking-tight py-4 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
              >
                {#if redirigiendoStripe}
                  <Loader2 class="w-5 h-5 animate-spin" /> Conectando con Stripe...
                {:else}
                  <CreditCard class="w-5 h-5" /> Gestionar Facturación
                {/if}
              </button>
            </form>
          </div>

          <div class="bg-zinc-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-zinc-900/10 flex flex-col">
            <div class="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

            <div class="flex items-center justify-between mb-4 relative z-10">
              <h3 class="text-xl font-black tracking-tight text-white">Webhook (API)</h3>
              <span class="text-[10px] font-black tracking-widest bg-amber-900/40 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-md shadow-sm">
                PRO / ELITE
              </span>
            </div>

            <p class="text-sm text-zinc-400 mb-8 relative z-10 font-medium leading-relaxed">
              Conecta tu inventario con tu CRM externo. Recibe leads al instante y sincroniza tus propiedades automáticamente.
            </p>

            <div class="relative z-10 flex-1 flex flex-col justify-end {esPlanBasico ? 'opacity-30 pointer-events-none' : ''} transition-opacity duration-300">
              <div class="mb-5">
                <label class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">URL DEL ENDPOINT</label>
                <input 
                  type="url" 
                  value={broker.webhook_url || ''}
                  disabled={esPlanBasico}
                  placeholder="https://tu-crm.com/api/inmublia"
                  class="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors font-medium placeholder:text-zinc-600 shadow-inner" 
                />
              </div>
              
              <div class="flex gap-3">
                <button type="button" disabled={esPlanBasico} class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50">Probar</button>
                <button type="button" disabled={esPlanBasico} class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-3.5 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50">Guardar</button>
              </div>
            </div>

            {#if esPlanBasico}
              <div class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/50 backdrop-blur-[3px] p-6">
                <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center shadow-2xl w-full max-w-xs transform hover:scale-105 transition-transform duration-300">
                  <Lock class="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                  <p class="text-sm font-bold text-white mb-5 leading-tight">Actualiza tu plan para usar la API externa</p>
                  <form method="POST" action="?/abrirPortalFacturacion" use:enhance={manejadorPortal}>
                    <button type="submit" disabled={redirigiendoStripe} class="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-black uppercase tracking-widest px-4 py-3 rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2">
                      {#if redirigiendoStripe}
                        <Loader2 class="w-4 h-4 animate-spin" /> Procesando...
                      {:else}
                        <Sparkles class="w-4 h-4" /> Mejorar Plan
                      {/if}
                    </button>
                  </form>
                </div>
              </div>
            {/if}
          </div>
          
        </div>
      </div>
      
    </div>
  </div>
</main>
