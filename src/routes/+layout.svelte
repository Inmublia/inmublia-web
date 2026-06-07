<script lang="ts">
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';
  import { createBrowserClient } from '@supabase/ssr';
  import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
  import { invalidate } from '$app/navigation';

  let { data, children } = $props();

  // Inicialización del cliente en el navegador
  const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

  // Escucha activa de cambios de estado (Login / Logout / Expiración)
  $effect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== data.session?.access_token) {
        // Fuerza a SvelteKit a ejecutar de nuevo el +layout.server.js de raíz
        invalidate('supabase:auth');
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
