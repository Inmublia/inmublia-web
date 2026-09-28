<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { browser } from '$app/environment';
  import { createBrowserClient } from '@supabase/ssr';
  import { env } from '$env/dynamic/public';
  import { AlertTriangle, LogOut } from 'lucide-svelte';
  import './layout.css';

  let { data, children } = $props();

  const supabase = createBrowserClient(
    env.PUBLIC_SUPABASE_URL, 
    env.PUBLIC_SUPABASE_ANON_KEY
  );

  // 🔥 MOTOR DE SEGURIDAD ZERO-TRUST
  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
  const WARNING_WINDOW = 60 * 1000; // Avisar 60 segundos antes de cerrar
  
  let showWarning = $state(false);
  let countdown = $state(0);

  $effect(() => {
    if (!browser || !data.session) return;

    let lastActivity = Date.now();
    const authChannel = new BroadcastChannel('inmublia_auth_sync');

    const forceLogout = () => {
      authChannel.postMessage({ type: 'LOGOUT_FORCED' });
      window.location.href = '/logout';
    };

    const updateActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 2000) {
        lastActivity = now;
        if (showWarning) showWarning = false;
        authChannel.postMessage({ type: 'ACTIVITY', time: now });
      }
    };

    const checkInactivity = () => {
      const now = Date.now();
      const idleTime = now - lastActivity;

      if (idleTime >= INACTIVITY_LIMIT) {
        forceLogout();
      } else if (idleTime >= INACTIVITY_LIMIT - WARNING_WINDOW) {
        showWarning = true;
        countdown = Math.ceil((INACTIVITY_LIMIT - idleTime) / 1000);
      } else {
        showWarning = false;
      }
    };

    authChannel.onmessage = (event) => {
      if (event.data.type === 'LOGOUT_FORCED') {
        window.location.href = '/logout';
      } else if (event.data.type === 'ACTIVITY') {
        lastActivity = event.data.time;
        showWarning = false;
      }
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkInactivity();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkInterval = setInterval(checkInactivity, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
      authChannel.close();
    };
  });

  $effect(() => {
    if (!browser) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth');
      }
      if (event === 'SIGNED_OUT') {
        window.location.href = '/logout';
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/favicon.png?v=3" />
</svelte:head>

{#if showWarning}
  <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300 transition-colors">
    <div class="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-rose-100 dark:border-rose-900/50 transform transition-all scale-100">
      <div class="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-rose-50 dark:ring-rose-500/5">
        <AlertTriangle class="w-8 h-8" />
      </div>
      <h2 class="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Sesión Inactiva</h2>
      <p class="text-sm text-slate-500 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
        Por seguridad, cerraremos tu cuenta en <span class="font-black text-rose-600 dark:text-rose-400 text-lg mx-1">{countdown}</span> seg.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button onclick={() => window.location.href = '/logout'} class="px-5 py-3 rounded-xl font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
          <LogOut class="w-3.5 h-3.5" /> Salir Ahora
        </button>
        <button onclick={() => window.dispatchEvent(new Event('mousemove'))} class="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-lg transition-all text-[10px] active:scale-95">
          Mantener Conexión
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="min-h-screen relative pb-8">
  {@render children()}

  <footer class="absolute bottom-2 w-full text-center z-40">
    <a href="/privacidad" class="text-[10px] font-medium text-slate-400/60 hover:text-slate-600/90 dark:text-zinc-500/60 dark:hover:text-zinc-400 transition-colors duration-300">
      Privacidad y Legal
    </a>
  </footer>
</div>
