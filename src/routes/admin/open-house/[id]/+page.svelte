<script>
  import OpenHouseAdmin from '$lib/components/OpenHouse.svelte'; 
  
  let { data } = $props();
</script>

<OpenHouseAdmin event={data.event} attendeesDb={data.attendeesDb} agentMode={true} />
