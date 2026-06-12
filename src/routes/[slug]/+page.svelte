<script>
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
  
  // Extraemos la elección de diseño desde la base de datos
  // Fallbacks para propiedades antiguas o nulas: 'prop_basic_1' o 'classic'
  let templateId = $derived(data.propiedad?.template_id || 'prop_basic_1');
</script>

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
