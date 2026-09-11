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

  // 🔥 MOTOR DE SEGURIDAD ZERO-TRUST (Estándar 2026)
  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutos
  const WARNING_WINDOW = 60 * 1000; // Avisar 60 segundos antes de cerrar
  
  let showWarning = $state(false);
  let countdown = $state(0);

  // Runa 1: Vigía de Inactividad (Nativo Svelte 5)
  $effect(() => {
    // Protección absoluta contra SSR: esto solo corre en el cliente y si hay sesión
    if (!browser || !data.session) return;

    let lastActivity = Date.now();
    const authChannel = new BroadcastChannel('inmublia_auth_sync');

    const forceLogout = () => {
      authChannel.postMessage({ type: 'LOGOUT_FORCED' });
      window.location.href = '/logout'; // Golpe directo a +server.js
    };

    const updateActivity = () => {
      const now = Date.now();
      // Throttling: Solo procesa clics/movimientos cada 2 segundos
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

    // Sincronización Multi-Pestaña
    authChannel.onmessage = (event) => {
      if (event.data.type === 'LOGOUT_FORCED') {
        window.location.href = '/logout';
      } else if (event.data.type === 'ACTIVITY') {
        lastActivity = event.data.time;
        showWarning = false;
      }
    };

    // Auditoría de eventos silenciosos
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));
    
    // Parche de seguridad para navegadores suspendidos (Laptops cerradas/Pestañas ocultas)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkInactivity();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Reloj interno
    const checkInterval = setInterval(checkInactivity, 1000);

    // Limpieza de Runa (Garbage Collection cuando el layout se destruye)
    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
      authChannel.close();
    };
  });

  // Runa 2: Vigía de Supabase Auth
  $effect(() => {
    if (!browser) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== data.session?.expires_at) {
        invalidate('supabase:auth');
      }
      if (event === 'SIGNED_OUT') {
        // Redundancia: si supabase expira, forzamos cierre masivo
        window.location.href = '/logout';
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<svelte:head>
  <link rel="icon" type="image/png" href="/favicon.png?v=3" />
</svelte:head>

<!-- MODAL DE ADVERTENCIA DE CIERRE DE SESIÓN -->
{#if showWarning}
  <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-rose-100 transform transition-all scale-100">
      <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-rose-50">
        <AlertTriangle class="w-8 h-8" />
      </div>
      <h2 class="text-xl font-black text-slate-900 mb-2 tracking-tight">Sesión Inactiva</h2>
      <p class="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
        Por seguridad, cerraremos tu cuenta en <span class="font-black text-rose-600 text-lg mx-1">{countdown}</span> seg.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <!-- OJO: Aquí reasignamos window.location directo para que forceLogout no dependa del Runa -->
        <button onclick={() => window.location.href = '/logout'} class="px-5 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
          <LogOut class="w-3.5 h-3.5" /> Salir Ahora
        </button>
        <!-- Inyectamos un evento sintético de mousemove para resetear la actividad -->
        <button onclick={() => window.dispatchEvent(new Event('mousemove'))} class="px-6 py-3 rounded-xl font-black uppercase tracking-widest bg-slate-900 hover:bg-indigo-600 text-white shadow-lg transition-all text-[10px] active:scale-95">
          Mantener Conexión
        </button>
      </div>
    </div>
  </div>
{/if}

{@render children()}
