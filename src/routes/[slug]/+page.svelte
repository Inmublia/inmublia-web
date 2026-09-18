<!-- src/routes/[slug]/+page.svelte -->
<script>
  import { page } from '$app/stores';
  import PropertySeo from '$lib/components/PropertySeo.svelte';
  
  // 🔥 Componente que inyecta Meta, GA4 y TikTok Pixel dinámicamente
  import AnalyticsScripts from '$lib/components/AnalyticsScripts.svelte';

  // 🔥 Componente unificado para la experiencia Brochure
  import SmartBrochure from '$lib/components/shared/SmartBrochure.svelte';

  // ==========================================
  // INMUBLIA: ENRUTADOR MAESTRO DE PLANTILLAS
  // ==========================================
  
  // 1. Nivel Básico (Basic / Clean)
  import Basic1 from '$lib/components/templates/Basic1.svelte';
  import Basic2 from '$lib/components/templates/Basic2.svelte';
  
  // 2. Nivel Pro (Lead Magnet / Asymmetric / Editorial)
  import Pro1 from '$lib/components/templates/Pro1.svelte';
  import Pro2 from '$lib/components/templates/Pro2.svelte';
  import Pro3 from '$lib/components/templates/Pro3.svelte';
  
  // 3. Nivel Elite (Immersive / Cinematic / Dark / Panoramic)
  import Elite1 from '$lib/components/templates/Elite1.svelte';
  import Elite2 from '$lib/components/templates/Elite2.svelte';
  import Elite3 from '$lib/components/templates/Elite3.svelte';
  import Elite4 from '$lib/components/templates/Elite4.svelte';

  let { data, form } = $props();

  // Variables reactivas para el motor SEO/GEO
  let propiedad = $derived(data.propiedad || {});
  let broker = $derived(data.broker || data.agencia || {});
  let urlActual = $derived($page.url.href);
  
  // Intercepta si viene el template forzado dinámico por la URL de apariencia (?template=)
  let templateId = $derived(data.templateForzado || data.propiedad?.template_id || 'prop_basic_1');

  // 🔥 LÓGICA DE NEGOCIO CENTRALIZADA: GATEKEEPER DEL SMART BROCHURE
  let urlPideBrochure = $derived($page.url.searchParams.get('brochure') === 'true');
  let planActual = $derived(broker?.plan_suscripcion?.toLowerCase()?.trim() || 'basico');
  let estatusActual = $derived(broker?.status_suscripcion?.toLowerCase()?.trim() || 'inactiva');
  
  // 🚀 FIX: Reconocer 'trial' como un estatus sano y darle permiso premium para usar Brochures
  let tienePlanPremium = $derived(
    (planActual === 'pro' || planActual === 'elite') && 
    (estatusActual === 'activa' || estatusActual === 'trial')
  );
  
  let isBrochure = $derived(urlPideBrochure && tienePlanPremium);

  // 🚀 ESTRATEGIA PLG: EL MURO DE FRUSTRACIÓN (SILENCIOSO)
  // Si el estatus es problemático ('past_due', 'cancelada', 'inactiva' o 'unpaid'), activamos el filtro gris.
  let cuentaSuspendida = $derived(
    ['cancelada', 'canceled', 'inactiva', 'past_due', 'unpaid'].includes(estatusActual)
  );

</script>

{#if propiedad.id && broker.id && !cuentaSuspendida}
  <PropertySeo {propiedad} {broker} {urlActual} />
  <!-- Inyección segura SSR de los Píxeles de Tracking (Solo si la cuenta está activa) -->
  <AnalyticsScripts {broker} />
{/if}

<!-- 🚀 INYECCIÓN DEL FILTRO GRIS Y BLOQUEO DE INTERACCIÓN (Sin Banner) -->
<div class="{cuentaSuspendida ? 'grayscale-[1] blur-[2px] pointer-events-none select-none overflow-hidden h-screen' : ''}">
  {#if isBrochure}
    <SmartBrochure {data} {form} />
  {:else}
    {#if templateId === 'prop_basic_1' || templateId === 'classic'}
      <Basic1 {data} {form} />

    {:else if templateId === 'prop_basic_2' || templateId === 'clean'}
      <Basic2 {data} {form} />

    {:else if templateId === 'prop_pro_1' || templateId === 'modern'}
      <Pro1 {data} {form} />

    {:else if templateId === 'prop_pro_2'}
      <Pro2 {data} {form} />

    {:else if templateId === 'prop_pro_3' || templateId === 'editorial'}
      <Pro3 {data} {form} />

    {:else if templateId === 'prop_elite_1' || templateId === 'luxury'}
      <Elite1 {data} {form} />

    {:else if templateId === 'prop_elite_2' || templateId === 'cinematic'}
      <Elite2 {data} {form} />

    {:else if templateId === 'prop_elite_3'}
      <Elite3 {data} {form} />

    {:else if templateId === 'prop_elite_4'}
      <Elite4 {data} {form} />

    {:else}
      <Basic1 {data} {form} />
    {/if}
  {/if}
</div>
