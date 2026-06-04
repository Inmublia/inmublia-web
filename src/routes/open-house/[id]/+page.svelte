<script>
  import OpenHousePublic from '$lib/components/OpenHousePublic.svelte';
  let { data } = $props();
</script>
<OpenHousePublic event={data.event} attendeesDb={data.attendeesDb} />
