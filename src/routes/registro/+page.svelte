<!-- src/routes/registro/+page.svelte -->
<script>
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { ArrowRight, CheckCircle2, ShieldCheck, Loader2, X, Lock } from 'lucide-svelte';

  let planId = $derived(page.url.searchParams.get('plan') || 'trial');
  let ciclo = $derived(page.url.searchParams.get('ciclo') || 'anual');
  
  let planSeleccionado = $derived({
    trial:  { nombre: 'Trial Élite', precioTexto: '$0 / 14 días', boton: 'Activar Trial Gratis', esPago: false },
    basico: { nombre: 'Básico', precioTexto: ciclo === 'anual' ? '$399 / mes' : '$499 / mes', boton: 'Ir al Pago Seguro', esPago: true },
    pro:    { nombre: 'Profesional', precioTexto: ciclo === 'anual' ? '$749 / mes' : '$899 / mes', boton: 'Ir al Pago Seguro', esPago: true },
    elite:  { nombre: 'Élite', precioTexto: ciclo === 'anual' ? '$1,199 / mes' : '$1,499 / mes', boton: 'Ir al Pago Seguro', esPago: true }
  }[planId] ?? { nombre: 'Trial Élite', precioTexto: '$0 / 14 días', boton: 'Activar Trial Gratis', esPago: false });

  let loading = $state(false);

  let valEmail = $state('');
  let valAgencia = $state('');
  let valPassword = $state('');

  let valSubdominio = $derived(() => {
    const base = valAgencia.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').replace(/^[0-9]/, 'i$&').substring(0, 40);
    return base || '';
  });

  let emailValido = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valEmail));
  let subdominioValido = $derived(valSubdominio().length >= 3 && valSubdominio().length <= 40);
  let passValido = $derived(valPassword.length >= 6);

  let verificandoSubdominio = $state(false);
  let subdominioDisponible = $state(null);

  $effect(() => {
    const sub = valSubdominio();
    if (sub.length < 3) { subdominioDisponible = null; return; }

    verificandoSubdominio = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-subdominio?sub=${sub}`);
        if (res.ok) {
          const { disponible } = await res.json();
          subdominioDisponible = disponible;
        } else { subdominioDisponible = null; }
      } catch { subdominioDisponible = null; } 
      finally { verificandoSubdominio = false; }
    }, 600);
    return () => clearTimeout(timer);
  });

  let botonHabilitado = $derived(!loading && valAgencia.trim().length >= 3 && emailValido && passValido && subdominioValido && subdominioDisponible !== false);

  let { form } = $props();
</script>

<svelte:head>
  <title>Configurar Agencia | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-white font-sans flex flex-col md:flex-row">
  <div class="hidden md:flex flex-col justify-between w-1/3 bg-slate-900 text-white p-12 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
    <div class="relative z-10">
      <a href="/" class="flex items-center mb-16">
        <img src="/logo.png" alt="Inmublia Logo" class="h-10 w-auto object-contain drop-shadow-sm" />
      </a>
      
      <h2 class="text-3xl font-black mb-4">
        {planSeleccionado.esPago ? 'Excelente elección de infraestructura.' : 'Empieza a escalar tu agencia hoy.'}
      </h2>
      <p class="text-slate-400 font-medium mb-8">Has seleccionado el plan {planSeleccionado.nombre}.</p>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div class="text-2xl font-black text-white mb-1">{planSeleccionado.precioTexto}</div>
        {#if !planSeleccionado.esPago}
          <div class="text-xs text-indigo-400 font-bold mb-4 uppercase tracking-wider">Sin tarjeta de crédito</div>
        {/if}
        <div class="space-y-3 mt-6">
          <div class="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 class="w-4 h-4 text-indigo-400" /> Entorno dedicado y seguro</div>
          <div class="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 class="w-4 h-4 text-indigo-400" /> CRM Operativo SaaS</div>
          <div class="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 class="w-4 h-4 text-indigo-400" /> Catálogos Inmobiliarios VIP</div>
        </div>
      </div>
    </div>
    <div class="relative z-10 text-xs font-medium text-slate-500 mt-12 flex items-center gap-2">
      <ShieldCheck class="w-4 h-4" /> Plataforma encriptada. {planSeleccionado.esPago ? 'Pago procesado por Stripe.' : ''}
    </div>
  </div>

  <div class="flex-1 flex flex-col justify-center px-6 py-12 md:px-24 bg-slate-50">
    <div class="max-w-md w-full mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      
      <h1 class="text-3xl font-black text-slate-900 mb-2">Configura tu Espacio</h1>
      <p class="text-slate-500 font-medium mb-8 text-sm">Crea tu agencia y obtén acceso inmediato a tu consola.</p>

      <form method="POST" autocomplete="off" use:enhance={() => {
          loading = true;
          return async ({ result, update }) => {
            if (result.type === 'redirect') {
              window.location.href = result.location;
            } else {
              await update();
            }
            loading = false;
          };
        }} class="space-y-5">
        
        <input type="hidden" name="subdominio" value={valSubdominio()}>
        <input type="hidden" name="planId" value={planId}>
        <input type="hidden" name="ciclo" value={ciclo}>

        {#if form?.error}
          <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100">{form.error}</div>
        {/if}

        <div>
          <label for="agencia" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre Comercial</label>
          <input type="text" id="agencia" name="agencia" bind:value={valAgencia} required placeholder="Ej. Skyline Inmobiliaria" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
        </div>

        <div>
          <!-- 🚀 FIX: Cambiado label a div para eliminar el Warning de A11y de Svelte -->
          <div class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subdominio Asignado</div>
          <div class="flex items-center w-full h-12 bg-slate-100 border rounded-xl px-4 overflow-hidden transition-colors {subdominioDisponible === false ? 'border-red-300 bg-red-50' : subdominioDisponible === true ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}">
            <span class="text-slate-400 font-medium">https://</span>
            <span class="text-indigo-600 font-bold px-1 overflow-hidden text-ellipsis whitespace-nowrap">{valSubdominio() || 'tuagencia'}</span>
            <span class="text-slate-400 font-medium">.inmublia.com</span>
            {#if verificandoSubdominio} <Loader2 class="w-4 h-4 animate-spin text-slate-400 ml-auto"/>
            {:else if subdominioDisponible === true} <CheckCircle2 class="w-4 h-4 text-indigo-500 ml-auto"/>
            {:else if subdominioDisponible === false} <X class="w-4 h-4 text-red-500 ml-auto"/> {/if}
          </div>
          {#if subdominioDisponible === false}
            <p class="text-[10px] text-red-500 font-bold mt-1.5">Este subdominio ya está registrado.</p>
          {/if}
        </div>

        <div class="pt-2">
          <label for="email" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Correo Electrónico</label>
          <input type="email" id="email" name="email" bind:value={valEmail} autocomplete="new-password" required placeholder="director@agencia.com" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
        </div>

        <div class="pt-2">
          <label for="password" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Crear Contraseña</label>
          <div class="relative">
            <input type="password" id="password" name="password" bind:value={valPassword} autocomplete="new-password" required minlength="6" placeholder="••••••••" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pl-10 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
            <Lock class="w-4 h-4 text-slate-400 absolute left-4 top-4" />
          </div>
        </div>

        <button type="submit" disabled={!botonHabilitado} class="w-full h-14 mt-8 {planSeleccionado.esPago ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {#if loading}
            <Loader2 class="w-5 h-5 animate-spin" /> Procesando...
          {:else}
            {planSeleccionado.boton} <ArrowRight class="w-5 h-5" />
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>
