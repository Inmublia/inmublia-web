<script>
  // Asumiendo que el archivo de admin se quedó como OpenHouse.svelte o OpenHouseAdmin.svelte
  import OpenHouseAdmin from '$lib/components/OpenHouse.svelte'; 
  let { data } = $props();
</script>
<OpenHouseAdmin event={data.event} attendeesDb={data.attendeesDb} agentMode={true} />
