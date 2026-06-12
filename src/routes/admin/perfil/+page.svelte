<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import imageCompression from 'browser-image-compression';
  import { Settings, ShieldCheck } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});

  let savingProfile = $state(false);
  let showSuccess = $state(false);
  let previewUrl = $state(null);

  let webhookUrl = $state(broker.webhook_url || '');
  let testingWebhook = $state(false);
  let webhookSuccess = $state(false);

  const planActual = broker.plan_suscripcion || 'basico';
  const isPro = planActual === 'pro' || planActual === 'elite';
  const isElite = planActual === 'elite';

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) previewUrl = URL.createObjectURL(file);
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
      } else alert('El endpoint no respondió correctamente.');
    } catch (e) {
      alert('Error de conexión con el Webhook.');
    }
    testingWebhook = false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-zinc-950 border-b border-zinc-800 flex items-center px-10 shrink-0 shadow-xl shadow-zinc-900/10 z-10 relative">
    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none translate-x-1/4 -translate-y-1/2"></div>
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-2.5 bg-zinc-900 rounded-xl text-white shadow-sm border border-zinc-800">
        <Settings class="w-5 h-5 text-indigo-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-white">Configuración de Agencia</h1>
        <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-zinc-300 uppercase">{broker.plan_suscripcion || 'Básico'}</span>
        </p>
      </div>
    </div>
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-5xl mx-auto">

      {#if form?.error}
         <div class="mb-6 bg-red-100 text-red-800 font-bold p-6 rounded-xl border-2 border-red-300 text-sm whitespace-pre-wrap shadow-lg" role="alert">
           ⚠️ DIAGNÓSTICO: {form.error}
         </div>
      {/if}
      
      {#if showSuccess}
        <div class="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]" role="alert">
          <div class="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <p class="text-sm font-bold text-emerald-800">Perfil actualizado correctamente.</p>
        </div>
      {/if}

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-8 space-y-6">
          
          <form method="POST" action="?/updateProfile" enctype="multipart/form-data" use:enhance={async ({ formData }) => {
            savingProfile = true;

            const avatarFile = formData.get('avatar');
            if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
              try {
                const options = {
                  maxSizeMB: 0.2, 
                  maxWidthOrHeight: 800,
                  useWebWorker: true 
                };
                const compressedFile = await imageCompression(avatarFile, options);
                formData.set('avatar', compressedFile, compressedFile.name);
              } catch (error) {
                console.error('Error comprimiendo', error);
              }
            }

            return async ({ update, result }) => {
              savingProfile = false;
              if (result.type === 'failure') alert("❌ Validación: " + (result.data?.error || "Error"));
              else if (result.type === 'error') alert("🔥 Caída Servidor: " + result.error.message);
              else if (result.type === 'success') { showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll(); }
              update({ reset: false });
            };
          }}>
            
            <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
              <div class="flex items-center gap-3 mb-6">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                <h3 class="text-lg font-black text-slate-900">Identidad de Marca</h3>
              </div>

              <div class="space-y-5">
                <div class="flex items-center gap-6 pb-4 border-b border-slate-50">
                  <label class="block cursor-pointer relative w-20 h-20 bg-slate-100 rounded-full border border-slate-200 overflow-hidden shadow-sm group">
                    <input type="file" name="avatar" accept="image/png, image/jpeg, image/webp" class="hidden" onchange={handleFileSelect} />
                    {#if previewUrl || broker.avatar_url}
                      <img src={previewUrl || broker.avatar_url} alt="Logo" class="w-full h-full object-cover">
                    {:else}
                      <svg class="w-8 h-8 m-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {/if}
                    <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span class="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar</span>
                    </div>
                  </label>
                  <div>
                    <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Logo o Fotografía</span>
                    <p class="text-xs text-slate-400 font-medium">Recomendado: 400x400px en formato PNG o JPG.</p>
                  </div>
                </div>

                <div>
                  <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre Comercial / Agencia</span>
                  <input type="text" name="nombre_comercial" bind:value={broker.nombre_comercial} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none">
                </div>
                
                <div>
                  <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp de Contacto</span>
                  <input type="tel" name="whatsapp" bind:value={broker.whatsapp} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none" placeholder="Ej. 523312345678">
                </div>

                <div>
                  <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Biografía Profesional (Pitch)</span>
                  <textarea name="bio" bind:value={broker.bio} rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none placeholder:text-slate-400"></textarea>
                </div>
              </div>
            </div>

            <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
              <div class="flex items-center gap-3 mb-6">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                <h3 class="text-lg font-black text-slate-900">Redes y Dominio</h3>
              </div>

              <div class="space-y-6">
                <div>
                  <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace Personalizado</span>
                  <div class="flex items-center">
                    <input type="text" name="subdominio" bind:value={broker.subdominio} required class="flex-1 bg-slate-50 border border-slate-200 rounded-l-xl px-4 py-3 text-sm font-bold text-slate-900 text-right focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none">
                    <div class="bg-slate-100 border-y border-r border-slate-200 rounded-r-xl px-4 py-3 text-sm font-medium text-slate-500 pointer-events-none">.inmublia.com</div>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Facebook URL</span>
                    <input type="url" name="facebook" bind:value={broker.facebook} placeholder="https://facebook.com/..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                  </div>
                  <div>
                    <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Instagram URL</span>
                    <input type="url" name="instagram" bind:value={broker.instagram} placeholder="https://instagram.com/..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                  </div>
                  <div>
                    <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">TikTok URL</span>
                    <input type="url" name="tiktok" bind:value={broker.tiktok} placeholder="https://tiktok.com/@..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                  </div>
                  <div>
                    <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">LinkedIn URL</span>
                    <input type="url" name="linkedin" bind:value={broker.linkedin} placeholder="https://linkedin.com/in/..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 mb-6">
              <div class="flex items-center gap-3 mb-6">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                <div>
                  <h3 class="text-lg font-black text-slate-900">Marketing & Tracking</h3>
                  <p class="text-[11px] font-medium text-slate-500">Mide visitas y crea audiencias de retargeting para tus anuncios.</p>
                </div>
              </div>

              <div class="space-y-4">
                
                <div class="p-4 rounded-xl border {isPro ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-70'}">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                      Meta Pixel ID (Facebook/Instagram)
                    </span>
                    {#if !isPro} <span class="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">🔒 Plan Pro</span> {/if}
                  </div>
                  <input type="text" name="pixel_fb" bind:value={broker.pixel_fb} disabled={!isPro} placeholder={isPro ? "Ej. 10456789012345" : "Requiere mejora de plan"} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed">
                </div>

                <div class="p-4 rounded-xl border {isPro ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-70'}">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <svg class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"/></svg>
                      Google Analytics ID (GA4)
                    </span>
                    {#if !isPro} <span class="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">🔒 Plan Pro</span> {/if}
                  </div>
                  <input type="text" name="pixel_google" bind:value={broker.pixel_google} disabled={!isPro} placeholder={isPro ? "Ej. G-ABC123XYZ" : "Requiere mejora de plan"} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed">
                </div>

                <div class="p-4 rounded-xl border {isElite ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-70'}">
                  <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-700 flex items-center gap-2">
                      <svg class="w-4 h-4 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.22-1.15 4.39-2.92 5.75-1.84 1.4-4.29 1.83-6.6 1.4-2.18-.4-4.14-1.74-5.26-3.66-1.16-1.99-1.37-4.46-.57-6.57.82-2.18 2.67-3.9 4.88-4.57 1.59-.48 3.32-.46 4.88.08v4.06c-.84-.27-1.78-.34-2.65-.13-.88.21-1.67.75-2.18 1.48-.52.75-.71 1.72-.5 2.6.21.88.75 1.67 1.48 2.18.75.52 1.72.71 2.6.5 1.25-.29 2.21-1.36 2.45-2.62.06-.32.07-.65.07-.98V.02z"/></svg>
                      TikTok Pixel ID
                    </span>
                    {#if !isElite} <span class="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">🔒 Plan Elite</span> {/if}
                  </div>
                  <input type="text" name="pixel_tiktok" bind:value={broker.pixel_tiktok} disabled={!isElite} placeholder={isElite ? "Ej. CB1234567890" : "Exclusivo Plan Elite"} class="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed">
                </div>
              </div>
            </div>

            <div class="mt-8 flex justify-end">
              <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-10 rounded-2xl shadow-xl flex items-center gap-3 transition-all border border-slate-700 w-full sm:w-auto">
                {#if savingProfile}
                  <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
                {:else}
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Guardar Configuración
                {/if}
              </button>
            </div>
          </form>
        </div>

        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 relative z-10">Membresía Actual</h4>
            <div class="flex items-center gap-4 mb-6 relative z-10">
              <div class="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shadow-md shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
              </div>
              <div>
                <h3 class="text-lg font-black text-slate-900 uppercase">Inmublia {broker.plan_suscripcion || 'Básico'}</h3>
                <p class="text-[11px] font-bold text-emerald-600 tracking-wider">Membresía Activa</p>
              </div>
            </div>
            <a href="#" rel="noopener noreferrer" class="block w-full text-center bg-white hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-colors border border-slate-200 text-sm shadow-sm relative z-10">Gestionar Facturación</a>
          </div>

          <form method="POST" action="?/actualizarWebhook" use:enhance={() => { return async ({ update }) => { update({ reset: false }); alert("Webhook guardado correctamente."); }; }}>
            <div class="bg-[#111827] text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
              <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-5 blur-2xl pointer-events-none"></div>
              <div class="flex items-center justify-between mb-4 relative z-10">
                <h3 class="text-lg font-black tracking-tight">Webhook (API)</h3>
                <span class="text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30">Pro / Elite</span>
              </div>
              <p class="text-[11px] text-slate-400 font-medium leading-relaxed mb-6 relative z-10">Conecta tu inventario con tu CRM externo. Recibe leads al instante.</p>
              <div class="space-y-4 relative z-10">
                <div>
                  <label class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2" for="webhook_url">URL del Endpoint</label>
                  <input type="url" id="webhook_url" name="webhook_url" bind:value={webhookUrl} class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all">
                </div>
                <div class="flex gap-2">
                  <button type="button" onclick={probarWebhook} disabled={testingWebhook} class="flex-1 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10 text-[11px]">
                    {#if testingWebhook} Probando... {:else if webhookSuccess} <span class="text-emerald-400">Exitosa</span> {:else} Probar {/if}
                  </button>
                  <button type="submit" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 rounded-xl transition-colors border border-transparent shadow-sm text-[11px]">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</main>
