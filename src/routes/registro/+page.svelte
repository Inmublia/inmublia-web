<!-- src/routes/registro/+page.svelte -->
<script>
  import { page } from '$app/state';
  import { enhance } from '$app/forms';
  import { ArrowRight, CheckCircle2, ShieldCheck, Loader2, X } from 'lucide-svelte';

  let planId = $derived(page.url.searchParams.get('plan') || 'elite');
  let ciclo = $derived(page.url.searchParams.get('ciclo') || 'anual');
  
  let planSeleccionado = $derived({
    basico: { nombre: 'Básico', precio: ciclo === 'anual' ? '$399' : '$499', creditos: 15 },
    pro:    { nombre: 'Profesional', precio: ciclo === 'anual' ? '$749' : '$899', creditos: 125 },
    elite:  { nombre: 'Élite (Trial Gratis)', precio: '$0', creditos: 15 } // Ajustado para el modelo Trial Elite
  }[planId] ?? { nombre: 'Élite (Trial Gratis)', precio: '$0', creditos: 15 });

  let loading = $state(false);

  let valEmail = $state('');
  let valAgencia = $state('');

  let valSubdominio = $derived(() => {
    const base = valAgencia
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .replace(/^[0-9]/, 'i$&')
      .substring(0, 40);
    return base || '';
  });

  let emailValido = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valEmail));
  let subdominioValido = $derived(valSubdominio().length >= 3 && valSubdominio().length <= 40);

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
        } else {
          subdominioDisponible = null; 
        }
      } catch {
        subdominioDisponible = null;
      } finally {
        verificandoSubdominio = false;
      }
    }, 600);

    return () => clearTimeout(timer);
  });

  let botonHabilitado = $derived(
    !loading &&
    valAgencia.trim().length >= 3 &&
    emailValido &&
    subdominioValido &&
    subdominioDisponible !== false
  );

  let form = $props().form;
</script>

<svelte:head>
  <title>Comenzar Trial | Inmublia</title>
</svelte:head>

<div class="min-h-screen bg-white font-sans flex flex-col md:flex-row">
  <!-- Columna Izquierda (Informativa - Trial Focus) -->
  <div class="hidden md:flex flex-col justify-between w-1/3 bg-slate-900 text-white p-12 relative overflow-hidden">
    <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/20 to-transparent"></div>
    <div class="relative z-10">
      
      <a href="/" class="flex items-center gap-3 mb-16">
        <img src="/logo.png" alt="Inmublia Logo" class="w-10 h-10 object-contain rounded-lg shadow-sm" />
        <span class="font-black text-2xl tracking-tight text-white">Inmublia</span>
      </a>
      
      <h2 class="text-3xl font-black mb-4">Empieza a escalar tu agencia hoy.</h2>
      <p class="text-slate-400 font-medium mb-8">Disfruta 14 días de acceso total al plan {planSeleccionado.nombre}. Sin tarjeta de crédito.</p>

      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div class="text-2xl font-black text-white mb-1">{planSeleccionado.precio} <span class="text-sm text-slate-400 font-medium">MXN por 14 días</span></div>
        <div class="space-y-3 mt-6">
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> Hasta 5 Propiedades Activas
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> {planSeleccionado.creditos} Generaciones de IA
          </div>
          <div class="flex items-center gap-3 text-sm text-slate-300">
            <CheckCircle2 class="w-4 h-4 text-emerald-400" /> CRM Inmobiliario Completo
          </div>
        </div>
      </div>
    </div>
    <div class="relative z-10 text-xs font-medium text-slate-500 mt-12 flex items-center gap-2">
      <ShieldCheck class="w-4 h-4" /> Registro seguro. Sin compromisos de pago.
    </div>
  </div>

  <!-- Columna Derecha (Formulario SvelteKit Actions) -->
  <div class="flex-1 flex flex-col justify-center px-6 py-12 md:px-24 bg-slate-50">
    <div class="max-w-md w-full mx-auto bg-white p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
      
      <div class="md:hidden flex items-center gap-2 mb-8 border-b border-slate-100 pb-6">
        <img src="/logo.png" alt="Inmublia Logo" class="w-8 h-8 object-contain rounded-md" />
        <span class="font-black text-xl tracking-tight text-slate-900">Inmublia</span>
      </div>

      <h1 class="text-3xl font-black text-slate-900 mb-2">Configura tu Espacio</h1>
      <p class="text-slate-500 font-medium mb-8 text-sm">Crea tu agencia y entra a Inmublia en segundos.</p>

      <form method="POST" use:enhance={() => {
          loading = true;
          return async ({ update }) => {
            await update();
            loading = false;
          };
        }} class="space-y-5">
        
        <input type="hidden" name="subdominio" value={valSubdominio()}>
        <input type="hidden" name="planId" value={planId}>

        {#if form?.error}
          <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 animate-[fadeIn_0.3s_ease-out]">
            {form.error}
          </div>
        {/if}

        <div>
          <label for="agencia" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre Comercial</label>
          <input type="text" id="agencia" name="agencia" bind:value={valAgencia} required placeholder="Ej. Skyline Inmobiliaria" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300">
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subdominio Asignado</label>
          <div class="flex items-center w-full h-12 bg-slate-100 border rounded-xl px-4 overflow-hidden transition-colors duration-300 {subdominioDisponible === false ? 'border-red-300 bg-red-50' : subdominioDisponible === true ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}">
            <span class="text-slate-400 font-medium whitespace-nowrap">https://</span>
            <span class="text-indigo-600 font-bold px-1 overflow-hidden text-ellipsis whitespace-nowrap">{valSubdominio() || 'tuagencia'}</span>
            <span class="text-slate-400 font-medium whitespace-nowrap">.inmublia.com</span>
            
            {#if verificandoSubdominio}
              <Loader2 class="w-4 h-4 animate-spin text-slate-400 ml-auto shrink-0"/>
            {:else if subdominioDisponible === true}
              <CheckCircle2 class="w-4 h-4 text-emerald-500 ml-auto shrink-0"/>
            {:else if subdominioDisponible === false}
              <X class="w-4 h-4 text-red-500 ml-auto shrink-0"/>
            {/if}
          </div>
          
          {#if subdominioDisponible === false}
            <p class="text-[10px] text-red-500 font-bold mt-1.5">Este subdominio ya está registrado. Usa otro nombre.</p>
          {:else}
            <p class="text-[10px] text-slate-400 mt-1.5 font-medium">Esta será la URL de tu catálogo público.</p>
          {/if}
        </div>

        <div class="pt-2">
          <label for="email" class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Correo del Administrador</label>
          <input type="email" id="email" name="email" bind:value={valEmail} required placeholder="director@agencia.com" class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-300">
          <p class="text-[10px] text-slate-400 mt-1.5 font-medium">Te daremos una clave de acceso temporal para entrar de inmediato.</p>
        </div>

        <button type="submit" disabled={!botonHabilitado} class="w-full h-14 mt-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95">
          {#if loading}
            <Loader2 class="w-5 h-5 animate-spin" /> Creando Entorno...
          {:else}
            Entrar a Inmublia <ArrowRight class="w-5 h-5" />
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>
