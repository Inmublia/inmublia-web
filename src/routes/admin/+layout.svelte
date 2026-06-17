<script>
  import Sidebar from '$lib/components/Sidebar.svelte';
  import NotificationBell from '$lib/components/NotificationBell.svelte';
  import { onMount } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { createBrowserClient } from '@supabase/ssr';
  import { env } from '$env/dynamic/public';
  
  let { data, children } = $props();

  onMount(() => {
    const supabase = createBrowserClient(
      env.PUBLIC_SUPABASE_URL, 
      env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Si el navegador y el servidor se desincronizan, SvelteKit frena todo y recarga el layout de forma segura
      if (newSession?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  });
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
