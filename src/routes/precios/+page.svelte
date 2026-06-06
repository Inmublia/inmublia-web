<script>
  import { onMount } from 'svelte';

  // ID del precio que generaste en tu panel de Stripe (Sustitúyelo por el tuyo)
  const PRICE_ID = 'price_1AQUÍ_TU_ID_DE_STRIPE'; 

  // Estados reactivos con Svelte 5 Runes
  let nombreComercial = $state('');
  let subdominioDeseado = $state('');
  let loading = $state(false);
  let errorMessage = $state('');

  // Validación y limpieza automática del subdominio en tiempo real
  let subdominioLimpio = $derived(
    subdominioDeseado
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
      .replace(/[^a-z0-9]/g, '-') // Reemplaza espacios y caracteres raros con guiones
      .replace(/-+/g, '-') // Evita guiones dobles --
      .replace(/^-|-$/g, '') // Quita guiones al inicio o al final
  );

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
      // Nota: En una fase posterior, aquí validaríamos si el usuario ya está logueado.
      // Por ahora, enviamos un ID de usuario de prueba para validar la integración completa del Webhook.
      const payload = {
        authUserId: 'usr_test_provisional_12345', // Reemplazable por el ID real de Supabase Auth
        email: 'cliente_demo@inmublia.com',       // Reemplazable por el email real del usuario firmado
        nombreComercial: nombreComercial.trim(),
        subdominioDeseado: subdominioLimpio,
        priceId: PRICE_ID
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

      // Redirección instantánea al checkout seguro de Stripe
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No se recibió la URL de redirección externa.');
      }

    } catch (err) {
      console.error('🔥 Error en Checkout:', err);
      errorMessage = err.message;
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
  <div class="sm:mx-auto w-full max-w-md text-center mb-6">
    <h1 class="text-3xl font-black text-slate-900 tracking-tight">Comienza tu Agencia Digital</h1>
    <p class="mt-2 text-sm text-slate-500 font-medium">Configura el acceso a tu consola exclusiva en un clic.</p>
  </div>

  <div class="mt-4 sm:mx-auto w-full max-w-xl">
    <div class="bg-white py-8 px-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 rounded-3xl sm:px-10 grid grid-cols-1 md:grid-cols-2 gap-8">
      
      <div class="flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
        <div>
          <span class="text-[9px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">Plan Profesional</span>
          <h3 class="text-xl font-black text-slate-900 mt-3 tracking-tight">Inmublia SaaS</h3>
          <p class="text-xs text-slate-400 mt-1 leading-relaxed">Incluye marca blanca, Smart Brochures ilimitados, gestión de Open Houses y CRM de leads.</p>
        </div>
        
        <div class="mt-6 md:mt-0">
          <div class="flex items-baseline text-slate-900">
            <span class="text-4xl font-black tracking-tight">$999</span>
            <span class="ml-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">MXN / mes</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1 font-medium">Cancela en cualquier momento desde tu panel.</p>
        </div>
      </div>

      <form onsubmit={procesarPago} class="space-y-5 flex flex-col justify-center">
        <div>
          <label for="agency-name" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de tu Agencia</label>
          <input 
            type="text" 
            id="agency-name" 
            bind:value={nombreComercial} 
            required 
            placeholder="Ej. Uribe Bienes Raíces" 
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300"
          >
        </div>

        <div>
          <label for="subdomain" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu Subdominio Exclusivo</label>
          <div class="relative rounded-xl shadow-sm flex items-center bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden px-4 py-3">
            <input 
              type="text" 
              id="subdomain" 
              bind:value={subdominioDeseado} 
              required 
              placeholder="tu-marca" 
              class="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300"
            >
            <span class="text-xs font-bold text-slate-400 lowercase select-none">.inmublia.com</span>
          </div>
          {#if subdominioDeseado && subdominioLimpio}
            <p class="text-[10px] text-slate-400 font-medium mt-1.5 px-1">
              Tu URL final: <span class="text-blue-600 font-bold">{subdominioLimpio}.inmublia.com</span>
            </p>
          {/if}
        </div>

        {#if errorMessage}
          <div class="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-medium text-red-600 text-center">
            {errorMessage}
          </div>
        {/if}

        <button 
          type="submit" 
          disabled={loading}
          class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {#if loading}
            <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            Abriendo pasarela...
          {:else}
            Proceder al Pago Seguro
          {/if}
        </button>
      </form>

    </div>
  </div>
</div>
