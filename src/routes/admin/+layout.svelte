<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  let { children } = $props();
</script>

<div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
  <Sidebar />
  
  <div class="flex-1 flex flex-col min-w-0">
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-4 sm:px-6 shrink-0 z-40 shadow-sm relative">
      <div class="flex items-center gap-4">
        <NotificationBell />
        
        </div>
    </header>

    <main class="flex-1 overflow-auto relative z-0">
      {@render children()}
    </main>
  </div>
</div>
