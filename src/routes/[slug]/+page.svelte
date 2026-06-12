<script>
  // Importamos el catálogo de plantillas físicas
  import Basic1 from '$lib/components/templates/Basic1.svelte';
  // Aquí iremos importando las otras 8 conforme las construyamos...
  // import Pro1 from '$lib/components/templates/Pro1.svelte';
  // import Elite1 from '$lib/components/templates/Elite1.svelte';

  let { data, form } = $props();
  
  // Extraemos el ID del template (fallback a prop_basic_1 para que las casas viejas no se rompan)
  let templateId = $derived(data.propiedad?.template_id || 'prop_basic_1');
</script>

{#if templateId === 'prop_basic_1' || templateId === 'classic'}
  <Basic1 {data} {form} />
  
{:else}
  <Basic1 {data} {form} />
{/if}
