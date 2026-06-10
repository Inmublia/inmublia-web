<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  let { children } = $props();
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-blue-100 overflow-hidden relative">
  <Sidebar />
  
  {@render children()}
</div>
