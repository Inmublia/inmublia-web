<!-- src/routes/admin/open-house/nueva/+page.svelte -->
<script>
  import { enhance, deserialize } from '$app/forms';
  import { 
    ArrowLeft, Building2, CalendarClock, CalendarDays, Clock, Users, Gift, PenTool, 
    Loader2, Rocket, Sparkles, Zap, MessageCircle, Copy, AlertTriangle, AlertOctagon
  } from 'lucide-svelte';

  let { data } = $props();
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);

  // --- VARIABLES DE IA ---
  let creditosIA = $state(data?.creditos_ia ?? 15);
  let planSuscripcion = $derived(data?.plan_suscripcion ?? 'basico'); 
  
  let generandoIA = $state(false);
  let iaEjecutada = $state(false);
  let tonoIA = $state('lujo'); 
  let textoGeneradoWhatsapp = $state('');
  
  // 🛡️ NUEVO: Consola de error in-UI para evitar silent blocks
  let iaErrorMsg = $state('');

  let valPropiedadId = $state('');
  let valTitle = $state('');
  let valDescription = $state('');

  const timeOptions = [];
  for (let i = 7; i <= 21; i++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = i.toString().padStart(2, '0');
      const min = m === 0 ? '00' : '30';
      const hour12 = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      timeOptions.push({ value: `${hour24}:${min}`, label: `${hour12}:${min} ${ampm}` });
    }
  }

  async function typeWriter(text, setterCallback, speed = 10) {
    if (!text) return;
    let str = String(text); 
    let current = '';
    for (let i = 0; i < str.length; i++) {
      current += str.charAt(i);
      setterCallback(current);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  // 🛡️ MOTOR IA BLINDADO CON FINALLY Y ABORT CONTROLLER
  async function generarCampañaIA() {
    if (!valPropiedadId) {
      iaErrorMsg = "Selecciona una Propiedad Base en la sección de arriba para poder generar la campaña.";
      return;
    }

    if (creditosIA <= 0) return; 

    iaErrorMsg = '';
    generandoIA = true;
    valTitle = '';
    valDescription = '';
    textoGeneradoWhatsapp = '';

    document.getElementById('seccion-copywriting')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); 

    try {
      const formData = new FormData();
      formData.append('propiedad_id', valPropiedadId);
      formData.append('tono', tonoIA); 

      const res = await fetch('?/generarCampañaIA', {
        method: 'POST',
        body: formData,
        headers: { 'x-sveltekit-action': 'true' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const textRes = await res.text();
      
      if (textRes.trim().startsWith('<')) {
        throw new Error("El servidor devolvió una página de error (Posible caída temporal).");
      }

      let result;
      try {
        result = deserialize(textRes);
      } catch (e) {
        throw new Error(`Datos corruptos del servidor. Intenta de nuevo.`);
      }

      if (result.type === 'success' && result.data) {
        creditosIA--;
        iaEjecutada = true;
        generandoIA = false; // Liberamos UI antes de arrancar la animación
        
        await Promise.all([
          typeWriter(result.data.titulo, (v) => valTitle = v, 25),
          typeWriter(result.data.descripcion, (v) => valDescription = v, 5),
          typeWriter(result.data.whatsapp, (v) => textoGeneradoWhatsapp = v, 10)
        ]);
      } else {
        throw new Error(result.data?.error || result.error?.message || "La IA falló al redactar el copy.");
      }

    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        iaErrorMsg = "TIMEOUT: La Inteligencia Artificial se quedó colgada y tardó más de 35 segundos. Hemos abortado la operación por seguridad.";
      } else {
        iaErrorMsg = e.message;
      }
    } finally {
      // ESTE BLOQUE GARANTIZA QUE EL BOTÓN JAMÁS SE QUEDE PEGADO EN "REDACTANDO..."
      generandoIA = false;
    }
  }

  function copiarAlPortapapeles(texto) {
    navigator.clipboard.writeText(texto);
    alert("Copiado al portapapeles");
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1000px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4 text-left">
        <a href="/admin" class="text-zinc-400 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10 shrink-0" title="Volver al Inventario">
          <ArrowLeft class="w-6 h-6" />
        </a>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-zinc-50">Configurar Open House</h1>
          <p class="text-sm font-medium text-zinc-400 mt-1">Despliegue de Evento Físico</p>
        </div>
      </div>

      <button type="submit" form="form-openhouse" disabled={isSubmitting} class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-zinc-950 hover:bg-zinc-200 h-11 px-6 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 shrink-0">
        {#if isSubmitting}
          <Loader2 class="w-4 h-4 animate-spin text-zinc-950" />
          Lanzando...
        {:else}
          <Rocket class="w-4 h-4 text-indigo-500" />
          Lanzar Evento
        {/if}
      </button>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1000px] mx-auto px-4 sm:px-10 h-full">
      
      <form id="form-openhouse" method="POST" use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => { isSubmitting = false; update(); };
      }} class="space-y-8 pb-10">
        
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700 shrink-0">
              <Building2 class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 tracking-tight">Identidad del Evento</h2>
              <p class="text-xs font-medium text-slate-500 mt-1">Seleccione el activo inmobiliario y defina su presentación.</p>
            </div>
          </div>
          
          <div class="p-8 space-y-6">
            <div>
              <label for="propiedad_id" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Seleccionar Propiedad Base *</label>
              <div class="relative w-full">
                <select id="propiedad_id" name="propiedad_id" bind:value={valPropiedadId} required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
                  <option value="" class="text-slate-400">Selecciona una propiedad del inventario...</option>
                  {#each propiedades as prop}
                    <option value={prop.id}>{prop.titulo} ({prop.operacion})</option>
                  {/each}
                  {#if propiedades.length === 0}
                    <option value="test">Casa en Col. Americana (Activo de Prueba)</option>
                  {/if}
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label for="title" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Título Promocional del Evento *</label>
              <input id="title" type="text" name="title" bind:value={valTitle} required placeholder="Ej. Presentación Exclusiva: Residencia en Puerta de Hierro" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700 shrink-0">
              <CalendarClock class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 tracking-tight">Horarios y Aforos</h2>
              <p class="text-xs font-medium text-slate-500 mt-1">Establezca los parámetros de acceso y la capacidad operativa.</p>
            </div>
          </div>
          
          <div class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="md:col-span-3">
                <label for="date" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fecha de Convocatoria *</label>
                <div class="relative">
                  <CalendarDays class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input id="date" type="date" name="date" required class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-text">
                </div>
              </div>

              <div>
                <label for="timeStart" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Apertura *</label>
                <div class="relative w-full">
                  <select id="timeStart" name="timeStart" required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
                    <option value="">Seleccionar...</option>
                    {#each timeOptions as time}
                      <option value={time.value}>{time.label}</option>
                    {/each}
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Clock class="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label for="timeEnd" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cierre *</label>
                <div class="relative w-full">
                  <select id="timeEnd" name="timeEnd" required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
                    <option value="">Seleccionar...</option>
                    {#each timeOptions as time}
                      <option value={time.value}>{time.label}</option>
                    {/each}
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Clock class="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div>
                <label for="maxCapacity" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aforo Máximo *</label>
                <div class="relative">
                  <Users class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input id="maxCapacity" type="number" name="maxCapacity" required min="1" max="100" placeholder="Ej. 15" class="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-center">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 🚀 UI RENOVADA: Título Alineado a la Izquierda y Elementos Extendidos -->
        <section class="relative">
          <div class="bg-slate-800 rounded-[2rem] p-6 sm:p-10 relative overflow-hidden shadow-lg border border-slate-700">
            <div class="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div class="relative z-10">
              <div class="flex flex-col items-start w-full mb-8">
                <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  Estudio Creativo IA para Eventos
                  <span class="flex h-2.5 w-2.5 relative mt-1">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </h2>
                <p class="text-sm text-slate-400 mt-2 leading-relaxed font-medium">
                  Autogenera invitaciones magnéticas y copy para WhatsApp leyendo los datos del inventario que seleccionaste arriba.
                </p>
              </div>

              <!-- 🛡️ NUEVO: DISPLAY DE ERRORES IN-UI -->
              {#if iaErrorMsg}
                <div class="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 animate-[fadeIn_0.3s_ease-out]">
                  <AlertOctagon class="w-5 h-5 text-red-400 shrink-0" />
                  <p class="text-xs font-bold text-red-300">{iaErrorMsg}</p>
                </div>
              {/if}

              {#if creditosIA > 0}
                <div class="flex flex-col md:flex-row items-end gap-6 w-full bg-slate-700/40 border border-slate-600/50 backdrop-blur-md rounded-2xl p-6 shadow-inner">
                  <div class="flex flex-col gap-2 w-full md:w-5/12">
                    <label for="tono-ia" class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tono de Invitación</label>
                    <div class="relative w-full">
                      <select id="tono-ia" bind:value={tonoIA} class="w-full bg-slate-800 text-white border border-slate-600 text-sm font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner cursor-pointer appearance-none pr-10">
                        <option value="lujo">Gala / Exclusiva</option>
                        <option value="familiar">Casual / Familiar</option>
                        <option value="inversionista">Business / Inversión</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center w-full md:w-3/12 pb-1">
                    <div class="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-600/80 rounded-full text-xs font-bold text-slate-200 shadow-inner w-full justify-center">
                      <Sparkles class="w-4 h-4 text-amber-400" />
                      {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                    </div>
                  </div>

                  <div class="w-full md:w-4/12 flex flex-col">
                    <div class="h-[18px] mb-2 hidden md:block"></div> 
                    <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="w-full relative overflow-hidden group bg-white text-slate-900 font-bold px-6 py-3 rounded-xl transition-all disabled:opacity-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95">
                      {#if generandoIA}
                        <Loader2 class="animate-spin w-4 h-4 text-slate-900" /> Redactando...
                      {:else}
                        <Sparkles class="w-4 h-4 text-slate-900" /> Generar Invitación
                      {/if}
                    </button>
                  </div>
                </div>
              {:else}
                <div class="w-full bg-gradient-to-br from-indigo-900/50 to-slate-900/80 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
                  <Zap class="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
                  {#if planSuscripcion === 'elite'}
                    <h3 class="text-xl font-bold text-white mb-2">Límite Mensual Alcanzado</h3>
                    <p class="text-sm text-slate-300 mb-6 mx-auto">Has utilizado todos tus créditos. Adquiere un paquete de recarga extra.</p>
                  {:else if planSuscripcion === 'pro'}
                    <h3 class="text-xl font-bold text-white mb-2">Límite Mensual Alcanzado</h3>
                    <p class="text-sm text-slate-300 mb-6 mx-auto">Mejora al plan <strong>Elite</strong> o adquiere una recarga para operar sin límites.</p>
                  {:else}
                    <h3 class="text-xl font-bold text-white mb-2">Has agotado tus créditos</h3>
                    <p class="text-sm text-slate-300 mb-6 mx-auto">Mejora tu plan a <strong>Pro</strong> o <strong>Elite</strong> para dominar el mercado.</p>
                  {/if}
                  <a href="/admin/perfil" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                    <Sparkles class="w-4 h-4" /> Solucionar
                  </a>
                </div>
              {/if}
            </div>

            {#if iaEjecutada && textoGeneradoWhatsapp}
              <div class="mt-8 animate-[fadeIn_0.4s_ease-out] relative z-10 w-full">
                <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex flex-col w-full">
                  <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                      <MessageCircle class="w-4 h-4 text-emerald-400" /> Campaña WhatsApp
                    </h4>
                    {#if !generandoIA}
                      <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600/50">
                        <Copy class="w-3.5 h-3.5" /> Copiar
                      </button>
                    {/if}
                  </div>
                  <div class="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                    {#if generandoIA}
                       <div class="space-y-2 mt-1">
                         <div class="h-3 bg-slate-700/50 rounded w-full animate-pulse"></div>
                         <div class="h-3 bg-slate-700/50 rounded w-5/6 animate-pulse"></div>
                       </div>
                    {:else}
                      {textoGeneradoWhatsapp}
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </section>

        <div id="seccion-copywriting" class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div class="flex items-start gap-4">
              <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700 shrink-0">
                <PenTool class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-lg font-black text-slate-900 tracking-tight">Persuasión y Copywriting</h2>
                <p class="text-xs font-medium text-slate-500 mt-1">Defina los diferenciadores que impulsarán el registro de prospectos.</p>
              </div>
            </div>
            {#if iaEjecutada && !generandoIA}
              <span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-[fadeIn_0.4s_ease-out] shrink-0">
                <CheckCircle2 class="w-3.5 h-3.5" /> Autocompletado
              </span>
            {/if}
          </div>
          
          <div class="p-8 space-y-6">
            <div>
              <label for="benefit" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Incentivo de Asistencia (Opcional)</label>
              <div class="relative">
                <Gift class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input id="benefit" type="text" name="benefit" placeholder="Ej. Asesoría financiera gratuita" class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
              </div>
            </div>

            <div>
              <label for="description" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sinopsis del Evento (Storytelling) *</label>
              <textarea id="description" name="description" bind:value={valDescription} rows="8" required placeholder="Redacte la experiencia..." class="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm resize-y leading-relaxed"></textarea>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} class="sm:hidden w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-indigo-600 h-14 gap-2 shadow-lg active:scale-95 mt-4">
          {#if isSubmitting}
            <Loader2 class="w-5 h-5 animate-spin" /> Lanzando...
          {:else}
            <Rocket class="w-5 h-5" /> Lanzar Evento Oficial
          {/if}
        </button>

      </form>
    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
