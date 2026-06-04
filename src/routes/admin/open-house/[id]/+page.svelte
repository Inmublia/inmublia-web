<script>
  import OpenHouse from '$lib/components/OpenHouse.svelte';
  let { data } = $props();
</script>

<OpenHouse event={data.event} attendeesDb={data.attendeesDb} agentMode={true} />
