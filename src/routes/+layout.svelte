<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { createBrowserClient } from '@supabase/ssr';
  import { env } from '$env/dynamic/public';
  import './layout.css';

  let { data, children } = $props();

  // El cliente del navegador DEBE instanciarse aquí, NO se hereda del servidor
  const supabase = createBrowserClient(
    env.PUBLIC_SUPABASE_URL, 
    env.PUBLIC_SUPABASE_ANON_KEY
  );

  // Runas Svelte 5: Vigía automático de expiración de sesión
  $effect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/favicon.png?v=3" />
</svelte:head>

{@render children()}
