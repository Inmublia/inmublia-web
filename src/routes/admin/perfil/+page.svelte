<script>
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  
  let saving = $state(false);
  let showSuccess = $state(false);
  let previewUrl = $state(null); // Para mostrar la foto seleccionada antes de guardar

  // Variables del webhook
  let webhookUrl = $state(broker.webhook_url || '');
  let testingWebhook = $state(false);
  let webhookSuccess = $state(false);

  // Función para previsualizar la imagen al elegirla
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      previewUrl = URL.createObjectURL(file);
    }
  }

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

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-indigo-100 animate-[fadeIn_0.5s_ease-out]">
  
  <!-- SIDEBAR -->
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <!-- LOGO GIGANTE -->
    <div class="h-28 flex items-center justify-center border-b border-slate-100 px-6 py-4">
      <img src="/logo.png" alt="Inmublia" class="h-16 w-full object-contain">
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

      <!-- Pestaña Activa -->
      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-indigo-600 bg-indigo-50 rounded-xl font-bold transition-colors shadow-sm">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
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

  <!-- CONTENIDO PRINCIPAL -->
  <main class="flex-1 flex flex-col h-screen overflow-hidden relative">
    
    <header class="h-24 bg-white border-b border-slate-200 flex items-center px-10 shrink-0">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">Configuración de Agencia</h1>
        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ajustes de Plataforma y Perfil</p>
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto pb-32">
      <div class="max-w-5xl mx-auto">

        {#if form?.success || showSuccess}
          <div class="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
            <div class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <p class="text-sm font-bold text-emerald-800">Perfil actualizado correctamente.</p>
          </div>
        {/if}

        <!-- EL ENCTYPE ES CLAVE PARA SUBIR FOTOS -->
        <form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance={() => {
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
            
            <div class="lg:col-span-8 space-y-6">
              
              <!-- Identidad de Marca -->
              <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
                <div class="flex items-center gap-3 mb-6">
                  <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <h3 class="text-lg font-black text-slate-900">Identidad de Marca</h3>
                </div>

                <div class="space-y-5">
                  <div class="flex items-center gap-6 pb-4 border-b border-slate-50">
                    <!-- BOTÓN FUNCIONAL DE IMAGEN (Wrap con etiqueta LABEL) -->
                    <label class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden relative group cursor-pointer shadow-sm">
                      <input type="file" name="avatar" accept="image/png, image/jpeg" class="hidden" onchange={handleFileSelect} />
                      
                      {#if previewUrl || broker.avatar_url}
                        <img src={previewUrl || broker.avatar_url} alt="Logo" class="w-full h-full object-cover">
                      {:else}
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      {/if}
                      
                      <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar</span>
                      </div>
                    </label>
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
                  </div>

                  <div>
                    <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Biografía Profesional (Pitch)</label>
                    <textarea name="bio" bind:value={broker.bio} rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-400"></textarea>
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
                      <input type="text" name="subdominio" bind:value={broker.subdominio} required class="flex-1 bg-slate-50 border border-slate-200 rounded-l-xl px-4 py-3 text-sm font-bold text-slate-900 text-right focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
                      <div class="bg-slate-100 border-y border-r border-slate-200 rounded-r-xl px-4 py-3 text-sm font-medium text-slate-500 pointer-events-none">
                        .inmublia.com
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instagram URL</label>
                      <input type="url" name="instagram" bind:value={broker.instagram} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">LinkedIn URL</label>
                      <input type="url" name="linkedin" bind:value={broker.linkedin} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all">
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- COLUMNA LATERAL (Derecha) -->
            <div class="lg:col-span-4 space-y-6">
              
              <div class="bg-[#111827] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-5 blur-2xl pointer-events-none"></div>
                <div class="flex items-center justify-between mb-4 relative z-10">
                  <h3 class="text-lg font-black tracking-tight">Webhook Universal</h3>
                  <span class="text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">Elite Feature</span>
                </div>
                <p class="text-xs text-slate-400 font-medium leading-relaxed mb-6 relative z-10">Conecta tu inventario con el resto de tu ecosistema. Pega tu endpoint para recibir prospectos al instante.</p>
                <div class="space-y-4 relative z-10">
                  <div>
                    <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL del Endpoint</label>
                    <input type="url" name="webhook_url" bind:value={webhookUrl} class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
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
                <a href="#" class="block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-3 rounded-xl transition-colors border border-slate-200 text-sm">Gestionar Facturación</a>
              </div>

            </div>
          </div>

          <!-- BOTÓN GUARDAR CAMBIOS -->
          <div class="fixed bottom-0 right-0 p-6 z-40 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent w-full md:w-[calc(100%-16rem)] flex justify-end">
            <button type="submit" disabled={saving} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-8 rounded-2xl shadow-2xl flex items-center gap-3 transition-all border border-slate-700">
              {#if saving}
                <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Subiendo a la nube...
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                Guardar Cambios
              {/if}
            </button>
          </div>
        </form>

      </div>
    </div>
  </main>
</div>
