<script lang="ts">
  import { Mail, KeyRound, Loader2, AlertCircle, ArrowRight, ShieldCheck, Building2, Globe } from 'lucide-svelte';
  
  let { data, form } = $props();
  
  let cargando = $state(false);
  let email = $state(data.email || '');
  let nombreComercial = $state('');
  let subdominio = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let errorLocal = $state('');
  
  let subdominioManual = $state(false);

  // Genera el subdominio en vivo mientras teclea el nombre comercial
  function manejarNombreComercial(e: Event) {
    nombreComercial = (e.target as HTMLInputElement).value;
    if (!subdominioManual) {
      subdominio = nombreComercial
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    }
  }

  function manejarSubdominio(e: Event) {
    subdominioManual = true;
    subdominio = (e.target as HTMLInputElement).value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-]/g, "");
  }

  function validarFormulario(evento: Event) {
    errorLocal = '';
    if (password !== confirmPassword) {
      evento.preventDefault(); 
      errorLocal = 'Las contraseñas no coinciden.';
      return;
    }
    if (subdominio.length < 3) {
      evento.preventDefault();
      errorLocal = 'El subdominio es demasiado corto.';
      return;
    }
    cargando = true;
  }
</script>

<div class="min-h-screen bg-zinc-950 flex flex-col justify-center items-center font-sans text-white selection:bg-indigo-500/30 relative overflow-hidden">
  
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

  {#if data.status === 'waiting'}
    <div class="flex flex-col items-center z-10 animate-pulse">
      <Loader2 class="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <h2 class="text-xl font-bold">Aprovisionando tu espacio...</h2>
      <p class="text-zinc-500 text-sm mt-2 text-center max-w-xs">Tu pago fue exitoso. Estamos preparando la base de datos para tu agencia. No cierres esta ventana.</p>
      <script>setTimeout(() => location.reload(), 3000);</script>
    </div>
  {:else}
    <div class="w-full max-w-[480px] px-6 py-10 md:px-10 md:py-12 bg-zinc-900/40 backdrop-blur-xl sm:rounded-3xl sm:shadow-2xl sm:border sm:border-white/10 relative z-10 my-8">
      
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

      <div class="flex flex-col items-center mb-8">
        <div class="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
          <img src="/logo.png" alt="Inmublia" class="h-8 w-auto filter invert opacity-90">
        </div>
        <h1 class="text-2xl font-black tracking-tighter leading-tight text-center text-white drop-shadow-sm">
          Configura tu Agencia
        </h1>
        <p class="text-xs text-zinc-400 mt-2 text-center font-medium max-w-[320px] tracking-wide">
          Define la identidad de tu infraestructura operativa para comenzar.
        </p>
      </div>

      <div class="space-y-4 mb-6">
        {#if form?.error || errorLocal}
          <div class="flex items-center gap-3.5 px-4 py-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 shadow-sm">
            <AlertCircle class="w-4 h-4" />
            <p class="text-xs font-medium">{errorLocal || form?.error}</p>
          </div>
        {/if}
      </div>

      <form method="POST" action="?/configurarPerfil" class="space-y-5" onsubmit={validarFormulario}>
        
        <input type="hidden" name="authUserId" value={data.authUserId} />
        <input type="hidden" name="email" value={data.email} />

        <div class="space-y-1.5 group">
          <label for="email_display" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1">Correo Registrado</label>
          <div class="relative opacity-60">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
              <Mail class="w-4 h-4" />
            </div>
            <input type="email" id="email_display" value={data.email} disabled class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white cursor-not-allowed" />
          </div>
        </div>

        <div class="space-y-1.5 group">
          <label for="nombre_comercial" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Nombre Inmobiliaria</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
              <Building2 class="w-4 h-4" />
            </div>
            <input type="text" name="nombre_comercial" id="nombre_comercial" value={nombreComercial} oninput={manejarNombreComercial} placeholder="Ej. Luxury Estates" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all shadow-inner" />
          </div>
        </div>

        <div class="space-y-1.5 group">
          <label for="subdominio" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Tu Enlace Web</label>
          <div class="relative flex items-center bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden shadow-inner focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
            <div class="pl-4 pr-2 text-zinc-500 group-focus-within:text-indigo-400">
              <Globe class="w-4 h-4" />
            </div>
            <input type="text" name="subdominio" id="subdominio" value={subdominio} oninput={manejarSubdominio} placeholder="tu-agencia" required class="w-full bg-transparent py-3.5 text-sm text-white focus:outline-none text-right pr-0.5" />
            <span class="pr-4 py-3.5 text-sm text-zinc-500 font-medium bg-transparent">.inmublia.com</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5 group">
            <label for="password" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Contraseña</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <KeyRound class="w-4 h-4" />
              </div>
              <input type="password" name="password" id="password" bind:value={password} minlength="6" placeholder="••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-3.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all" />
            </div>
          </div>

          <div class="space-y-1.5 group">
            <label for="confirmPassword" class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 transition-colors group-focus-within:text-indigo-400">Confirmar</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-indigo-400 transition-colors">
                <ShieldCheck class="w-4 h-4" />
              </div>
              <input type="password" id="confirmPassword" bind:value={confirmPassword} minlength="6" placeholder="••••••" required class="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-9 pr-3 py-3.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all" />
            </div>
          </div>
        </div>

        <div class="pt-6">
          <button type="submit" disabled={cargando} class="w-full bg-white hover:bg-zinc-200 text-black disabled:opacity-50 font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group">
            {#if cargando}
              <Loader2 class="w-4 h-4 animate-spin" />
              Construyendo...
            {:else}
              Lanzar Inmobiliaria
              <ArrowRight class="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            {/if}
          </button>
        </div>
      </form>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
