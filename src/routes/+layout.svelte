<script lang="ts">
  import { invalidate } from '$app/navigation';
  import './layout.css';

  // Svelte 5: Props reactivas
  let { data, children } = $props();

  // Monitoreamos la sesión de forma reactiva
  const session = $derived(data?.session);

  // Svelte 5: Sincronización de sesión en segundo plano (si existe Supabase en el cliente)
  $effect(() => {
    if (data?.supabase?.auth) {
      const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event, _session) => {
        if (_session?.expires_at !== session?.expires_at) {
          invalidate('supabase:auth');
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  });
</script>

<svelte:head>
  <!-- Al estar en /static/favicon.png, el navegador lo lee directamente desde la raíz del dominio -->
  <link rel="icon" type="image/png" href="/favicon.png?v=3" />
</svelte:head>

{@render children()}
