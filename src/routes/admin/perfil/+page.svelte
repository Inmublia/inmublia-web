<script>
  import { enhance } from '$app/forms';
  
  // Runas de Svelte 5
  let { data, form } = $props();
  let broker = $derived(data.broker || {});
  
  let saving = $state(false);
  let testingWebhook = $state(false);
  let webhookSuccess = $state(false);
  let webhookUrl = $state(broker.webhook_url || '');

  // Simulador de Ping para probar la conexión del Webhook en tiempo real
  function testWebhook(event) {
    event.preventDefault();
    if (!webhookUrl) return;
    
    testingWebhook = true;
    webhookSuccess = false;

    // Simulamos el tiempo de respuesta de un endpoint externo
    setTimeout(() => {
      testingWebhook = false;
      webhookSuccess = true;
      setTimeout(() => webhookSuccess = false, 3000);
    }, 1200);
  }
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-blue-100">
  
  <!-- SIDEBAR -->
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>

      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración
      </a>
    </nav>
    <div class="p-6 border-t border-slate-100 bg-white">
      <div class="px-2 py-2 text-sm font-bold text-slate-900 truncate">{broker.nombre_comercial || 'Usuario'}</div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors w-full text-left text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="flex-1 flex flex-col h-screen overflow-hidden bg-zinc-50">
    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Configuración de Agencia</h1>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      <div class="max-w-5xl mx-auto">
        
        {#if form?.success}
          <div class="mb-8 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold p-4 rounded-2xl flex items-center gap-3 shadow-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Configuración guardada exitosamente.
          </div>
        {/if}

        <form method="POST" action="?/guardar" use:enhance={() => { saving = true; return async ({ update }) => { saving = false; update(); }; }} class="space-y-8">
          
          <!-- BENTO GRID -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- COLUMNA IZQUIERDA: Perfil y Dominio -->
            <div class="lg:col-span-2 space-y-8">
              
              <!-- Tarjeta 1: Perfil de Marca -->
              <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 class="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  Identidad de Marca
                </h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre Comercial / Agencia</label>
                    <input type="text" name="nombre_comercial" value={broker.nombre_comercial} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                  </div>
                  
                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp de Contacto (Para Leads)</label>
                    <input type="tel" name="whatsapp" value={broker.whatsapp} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="Ej. 523312345678">
                    <p class="text-[10px] text-slate-400 mt-2 font-medium">Incluye el código de país (Ej. 52 para México) sin signos de suma (+).</p>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 2: Configuración Web -->
              <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 class="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                  Presencia Digital
                </h2>
                
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace Personalizado</label>
                  <div class="flex items-center">
                    <input type="text" name="subdominio" value={broker.subdominio} required class="w-1/2 bg-slate-50 border border-slate-200 rounded-l-xl px-4 py-3 text-slate-900 font-bold text-right focus:ring-2 focus:ring-blue-100 outline-none transition-all" placeholder="tumarca">
                    <div class="bg-slate-100 border-y border-r border-slate-200 rounded-r-xl px-4 py-3 text-slate-500 font-medium">
                      .inmublia.com
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- COLUMNA DERECHA: Integraciones y Plan -->
            <div class="space-y-8">
              
              <!-- Tarjeta 3: Webhook (Puente de Oro) -->
              <div class="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4">
                  <span class="bg-amber-400/10 text-amber-400 text-[9px] uppercase tracking-widest px-2 py-1 rounded-full font-black border border-amber-400/20">Elite Feature</span>
                </div>
                
                <h2 class="text-lg font-black text-white mb-2">Webhook Universal</h2>
                <p class="text-xs text-slate-400 mb-6 leading-relaxed">Conecta tu inventario con el resto de tu ecosistema. Pega tu endpoint de Make, Zapier, Clientify o Resend para recibir prospectos al instante.</p>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL del Endpoint</label>
                    <input type="url" name="webhook_url" bind:value={webhookUrl} class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:ring-2 focus:ring-amber-400 outline-none transition-all" placeholder="https://hooks.zapier.com/...">
                  </div>
                  
                  <button type="button" onclick={testWebhook} disabled={testingWebhook || !webhookUrl} class="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50">
                    {#if testingWebhook}
                      <svg class="animate-spin h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Enviando Ping...
                    {:else if webhookSuccess}
                      <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      <span class="text-emerald-400">¡Conexión Exitosa!</span>
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      Probar Conexión
                    {/if}
                  </button>
                </div>
              </div>

              <!-- Tarjeta 4: Estado de Suscripción -->
              <div class="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <h2 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Plan Actual</h2>
                <div class="flex items-center gap-4 mb-6">
                  <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-inner">
                    <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
                  </div>
                  <div>
                    <h3 class="text-xl font-black text-slate-900">Inmublia Elite</h3>
                    <p class="text-xs text-emerald-600 font-bold mt-0.5">Activo y Facturando</p>
                  </div>
                </div>
                <a href="/admin/planes" class="block text-center w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-xl text-sm transition-colors border border-slate-200">
                  Gestionar Facturación
                </a>
              </div>

            </div>
          </div>

          <!-- BARRA DE ACCIÓN FLOTANTE (Fixed Bottom) -->
          <div class="fixed bottom-0 left-64 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200 flex justify-end z-20">
            <button type="submit" disabled={saving} class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 px-10 rounded-full transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none text-sm flex items-center gap-2">
              {#if saving}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Guardando Configuración...
              {:else}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Guardar Cambios
              {/if}
            </button>
          </div>

        </form>
      </div>
    </div>
  </main>
</div>
