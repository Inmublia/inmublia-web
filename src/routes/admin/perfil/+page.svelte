<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  let saving = $state(false);
  let showSuccess = $state(false);

  // Variables del webhook
  let webhookUrl = $state(broker.webhook_url || '');
  let testingWebhook = $state(false);
  let webhookSuccess = $state(false);

  async function probarWebhook() {
    if (!webhookUrl) return alert('Ingresa una URL primero.');
    testingWebhook = true;
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, mensaje: "Ping desde Inmublia Elite" })
      });
      if (res.ok) {
        webhookSuccess = true;
        setTimeout(() => webhookSuccess = false, 3000);
      } else {
        alert('El endpoint no respondió correctamente.');
      }
    } catch (e) {
      alert('Error de conexión con el Webhook.');
    }
    testingWebhook = false;
  }
</script>

<div class="h-full overflow-auto pb-24">
  <div class="max-w-6xl mx-auto">
    <header class="mb-8">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Configuración de Agencia</h1>
    </header>

    {#if form?.success || showSuccess}
      <div class="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
        <div class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <p class="text-sm font-bold text-emerald-800">Perfil actualizado correctamente.</p>
      </div>
    {/if}

    <!-- ENVOLVEMOS TODO EN UN FORMULARIO -->
    <form method="POST" action="?/updateProfile" use:enhance={() => {
      saving = true;
      return async ({ update, result }) => {
        saving = false;
        if (result.type === 'success') {
          showSuccess = true;
          setTimeout(() => showSuccess = false, 4000);
        }
        update({ reset: false });
      };
    }}>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- COLUMNA PRINCIPAL (Izquierda) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Identidad de Marca -->
          <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
            <div class="flex items-center gap-3 mb-6">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              <h3 class="text-lg font-black text-slate-900">Identidad de Marca</h3>
            </div>

            <div class="space-y-5">
              <!-- NUEVO: Avatar / Logo -->
              <div class="flex items-center gap-6 pb-4 border-b border-slate-50">
                <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden relative group cursor-pointer">
                  {#if broker.avatar_url}
                    <img src={broker.avatar_url} alt="Logo" class="w-full h-full object-cover">
                  {:else}
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  {/if}
                  <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="text-[9px] font-bold text-white uppercase tracking-widest">Subir</span>
                  </div>
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Logo o Fotografía</label>
                  <p class="text-xs text-slate-400 font-medium">Recomendado: 400x400px en formato PNG o JPG.</p>
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre Comercial / Agencia</label>
                <input type="text" name="nombre_comercial" bind:value={broker.nombre_comercial} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
              </div>
              
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp de Contacto (Para Leads)</label>
                <input type="tel" name="whatsapp" bind:value={broker.whatsapp} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" placeholder="Ej. 523312345678">
                <p class="text-[10px] text-slate-400 mt-2 font-medium">Incluye el código de país (Ej. 52 para México) sin signos de suma (+).</p>
              </div>

              <!-- NUEVO: Biografía Corta -->
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Biografía Profesional (Pitch)</label>
                <textarea name="bio" bind:value={broker.bio} rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-400" placeholder="Especialista en propiedades patrimoniales y desarrollos boutique..."></textarea>
              </div>
            </div>
          </div>

          <!-- Presencia Digital -->
          <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
            <div class="flex items-center gap-3 mb-6">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
              <h3 class="text-lg font-black text-slate-900">Presencia Digital</h3>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace Personalizado</label>
                <div class="flex items-center">
                  <input type="text" name="subdominio" bind:value={broker.subdominio} required class="flex-1 bg-slate-50 border border-slate-200 rounded-l-xl px-4 py-3 text-sm font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" placeholder="tumarca">
                  <div class="bg-slate-100 border-y border-r border-slate-200 rounded-r-xl px-4 py-3 text-sm font-medium text-slate-500 pointer-events-none">
                    .inmublia.com
                  </div>
                </div>
              </div>

              <!-- NUEVO: Redes Sociales -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instagram URL</label>
                  <input type="url" name="instagram" bind:value={broker.instagram} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" placeholder="https://instagram.com/tumarca">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">LinkedIn URL</label>
                  <input type="url" name="linkedin" bind:value={broker.linkedin} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" placeholder="https://linkedin.com/in/tuperfil">
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMNA LATERAL (Derecha) -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Webhook Elite -->
          <div class="bg-[#111827] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-5 blur-2xl pointer-events-none"></div>
            
            <div class="flex items-center justify-between mb-4 relative z-10">
              <h3 class="text-lg font-black tracking-tight">Webhook Universal</h3>
              <span class="text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">Elite Feature</span>
            </div>
            
            <p class="text-xs text-slate-400 font-medium leading-relaxed mb-6 relative z-10">Conecta tu inventario con el resto de tu ecosistema. Pega tu endpoint de Make, Zapier o Clientify para recibir prospectos al instante.</p>
            
            <div class="space-y-4 relative z-10">
              <div>
                <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL del Endpoint</label>
                <input type="url" name="webhook_url" bind:value={webhookUrl} class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all" placeholder="https://hooks.zapier.com/...">
              </div>
              
              <button type="button" onclick={probarWebhook} disabled={testingWebhook} class="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors border border-white/10 text-xs">
                {#if testingWebhook}
                  Probando...
                {:else if webhookSuccess}
                  <span class="text-emerald-400">¡Conexión Exitosa!</span>
                {:else}
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Probar Conexión
                {/if}
              </button>
            </div>
          </div>

          <!-- Plan Actual y Facturación -->
          <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Plan Actual</h4>
            
            <div class="flex items-center gap-4 mb-6">
              <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shadow-md">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900">Inmublia Elite</h3>
                <p class="text-xs font-bold text-emerald-600">Activo y Facturando</p>
              </div>
            </div>

            <a href="#" class="block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors border border-slate-200 text-sm">
              Gestionar Facturación
            </a>
          </div>

        </div>
      </div>

      <!-- BOTÓN GUARDAR CAMBIOS (Sticky en la parte inferior) -->
      <div class="fixed bottom-0 right-0 p-6 z-40">
        <button type="submit" disabled={saving} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl flex items-center gap-3 transition-all border border-slate-700">
          {#if saving}
            <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Guardando...
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
            Guardar Cambios
          {/if}
        </button>
      </div>
    </form>

  </div>
</div>
