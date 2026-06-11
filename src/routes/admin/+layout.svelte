<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  let { children } = $props();
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-100 overflow-hidden relative">
  <Sidebar />
  
  {@render children()}
</div>
