<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  let { children } = $props();
</script>

<div class="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
  <Sidebar />
  
  <div class="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-[100]">
    <NotificationBell />
  </div>

  <div class="flex-1 h-screen overflow-y-auto relative min-w-0">
    {@render children()}
  </div>
</div>
