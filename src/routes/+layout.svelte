<script lang="ts">
  import { invalidate } from '$app/navigation';
  import './layout.css';
  import favicon from '$lib/assets/favicon.png';

  // Svelte 5: Declaración reactiva de propiedades (props)
  let { data, children } = $props();

  // Derivamos la sesión para poder rastrear cambios de forma reactiva
  const session = $derived(data?.session);

  // Svelte 5: Efecto secundario que sincroniza la sesión del cliente con el servidor
  $effect(() => {
    if (data?.supabase?.auth) {
      const { data: { subscription } } = data.supabase.auth.onAuthStateChange((event, _session) => {
        // Si el token expira o cambia, invalidamos la carga del servidor de forma controlada
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
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
