<!-- src/routes/admin/open-house/nueva/+page.svelte -->
<script>
  import { enhance, deserialize } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { 
    ArrowLeft, Building2, CalendarClock, CalendarDays, Clock, Users, Gift, PenTool, 
    Loader2, Rocket, Sparkles, Zap, MessageCircle, Copy, AlertOctagon, Check, CheckCircle2, Lock
  } from 'lucide-svelte';

  let { data } = $props();
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);

  // --- VARIABLES DE IA ---
  let creditosIA = $state(data?.creditos_ia ?? 15);
  let planSuscripcion = $derived(data?.plan_suscripcion ?? 'basico'); 
  
  // 🚀 EXTRACCIÓN DE PAYWALLS DESDE EL LAYOUT (Sin romper lógica extra)
  let hitOHPaywall = $derived(data?.limits?.hitOHPaywall || false);
  
  let generandoIA = $state(false);
  let iaEjecutada = $state(false);
  let tonoIA = $state('lujo'); 
  let textoGeneradoWhatsapp = $state('');
  let iaErrorMsg = $state('');
  let copiadoWhatsapp = $state(false);

  // 🚀 VARIABLES DE ESTADO ENLAZADAS (BINDING) PARA EVITAR ALUCINACIONES
  let valPropiedadId = $state('');
  let valTitle = $state('');
  let valDate = $state('');
  let valTimeStart = $state('');
  let valTimeEnd = $state('');
  let valMaxCapacity = $state('15');
  let valBenefit = $state('');
  let valDescription = $state('');

  // 🚀 FIX: Validación derivada de horarios lógicos
  let horarioValido = $derived(!valTimeStart || !valTimeEnd || valTimeStart < valTimeEnd);

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

  // 🚀 FIX: TypeWriter protegido por AbortSignal
  async function typeWriter(text, setterCallback, speed = 10, signal) {
    if (!text) return;
    let str = String(text); 
    let current = '';
    setterCallback('');
    
    for (let i = 0; i < str.length; i++) {
      if (signal?.aborted) { 
        setterCallback(str); 
        return; 
      }
      current += str.charAt(i);
      setterCallback(current);
      await new Promise(r => setTimeout(r, speed));
    }
  }

  // 🚀 MOTOR BLINDADO CON EXTRACCIÓN REAL DE DATOS
  async function generarCampañaIA() {
    if (!valPropiedadId) {
      iaErrorMsg = "Selecciona una Propiedad Base en la Sección 1.";
      return;
    }
    
    // 🛡️ BLOQUEO: Si no hay datos de evento, no hay IA. Cero alucinaciones.
    if (!valDate || !valTimeStart || !valTimeEnd) {
      iaErrorMsg = "Completa la Fecha y Horarios del evento para que la IA redacte datos reales.";
      document.getElementById('date')?.focus();
      return;
    }
    
    if (!horarioValido) {
      iaErrorMsg = "El horario de cierre debe ser posterior a la apertura.";
      return;
    }

    if (creditosIA <= 0) return; 

    iaErrorMsg = '';
    generandoIA = true;
    valTitle = '';
    valDescription = '';
    textoGeneradoWhatsapp = '';

    // 🚀 FIX: Un solo mecanismo de timeout limpio (AbortController)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); 

    try {
      const formData = new FormData();
      formData.append('propiedad_id', valPropiedadId);
      formData.append('tono', tonoIA); 
      formData.append('date', valDate); 
      formData.append('timeStart', valTimeStart); 
      formData.append('timeEnd', valTimeEnd); 
      formData.append('maxCapacity', valMaxCapacity); 
      formData.append('benefit', valBenefit); 

      const res = await fetch('?/generarPromptIA', {
        method: 'POST',
        body: formData,
        headers: { 'x-sveltekit-action': 'true' },
        signal: controller.signal
      });

      const textRes = await res.text();
      
      if (textRes.trim().startsWith('<')) throw new Error("Posible caída de red");

      let result;
      try {
        result = deserialize(textRes);
      } catch (e) { throw new Error("Datos corruptos"); }

      if (result.type === 'success' && result.data) {
        // 🚀 FIX: Descuento Optimista + Sincronización en BD
        creditosIA = result.data.creditos_restantes ?? (creditosIA - 1);
        invalidateAll(); 
        
        iaEjecutada = true;
        generandoIA = false; 
        
        const sig = controller.signal;
        await Promise.all([
          typeWriter(result.data.titulo, (v) => valTitle = v, 25, sig),
          typeWriter(result.data.descripcion, (v) => valDescription = v, 5, sig),
          typeWriter(result.data.whatsapp, (v) => textoGeneradoWhatsapp = v, 10, sig)
        ]);
        
        // 🚀 FIX: Scroll al resultado de IA una vez que empieza a escribir
        setTimeout(() => document.getElementById('seccion-resultado-ia')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      } else if (result.type === 'failure') {
        throw new Error(`${result.data?.error || "Falla en generación"}`);
      } else if (result.type === 'error') {
        throw new Error(`${result.error?.message || "Error del servidor"}`);
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        iaErrorMsg = "La IA tardó más de 25 segundos. Intenta de nuevo por favor.";
      } else {
        // 🚀 FIX: Mensaje amigable, sin mostrar código crudo
        iaErrorMsg = `Error al generar: ${e.message.split(':')[0] || 'Intenta de nuevo en un momento'}`;
      }
    } finally {
      clearTimeout(timeoutId);
      generandoIA = false; 
    }
  }

  // 🚀 FIX: Portapapeles Seguro y Asíncrono
  async function copiarAlPortapapeles(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), {
        value: texto, style: 'position:fixed;opacity:0'
      });
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    copiadoWhatsapp = true;
    setTimeout(() => copiadoWhatsapp = false, 2200);
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4 text-left w-full">
        <a href="/admin" class="text-zinc-400 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10 shrink-0" title="Volver al Inventario">
          <ArrowLeft class="w-6 h-6" />
        </a>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-zinc-50">Configurar Open House</h1>
          <p class="text-sm font-medium text-zinc-400 mt-1">Despliegue de Evento Físico</p>
        </div>
      </div>

      <!-- 🚀 FIX: Mutación del Botón Principal (Header) por Paywall -->
      {#if hitOHPaywall}
        <a href="/admin/perfil" class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 h-11 px-6 gap-2 shadow-lg active:scale-95 shrink-0">
          <Lock class="w-4 h-4" /> Actualizar Plan
        </a>
      {:else}
        <button type="submit" form="form-openhouse" disabled={isSubmitting || generandoIA} class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-zinc-950 hover:bg-zinc-200 h-11 px-6 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 shrink-0">
          {#if isSubmitting}
            <Loader2 class="w-4 h-4 animate-spin text-zinc-950" /> Lanzando...
          {:else}
            <Rocket class="w-4 h-4 text-indigo-500" /> Lanzar Evento
          {/if}
        </button>
      {/if}
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 h-full">
      
      <!-- 🚀 FIX: AVISO DE PAYWALL EN PANTALLA -->
      {#if hitOHPaywall}
        <div class="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-[fadeIn_0.4s_ease-out] shadow-sm">
          <div class="flex gap-4">
            <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Lock class="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-indigo-900">Módulo Bloqueado</h3>
              <p class="text-sm text-indigo-700 mt-1 font-medium">
                {#if planSuscripcion === 'basico'}
                  El plan Básico no incluye eventos Open House. Mejora a Profesional para desbloquearlo.
                {:else}
                  Has alcanzado el límite de 1 Open House simultáneo de tu plan de Prueba.
                {/if}
              </p>
            </div>
          </div>
          <a href="/admin/perfil" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95 text-sm">
            Actualizar Plan
          </a>
        </div>
      {/if}

      <!-- 🚀 FIX: Formulario desactivado si hay paywall (opacity-50 pointer-events-none) -->
      <form id="form-openhouse" action="?/crear" method="POST" use:enhance={({ cancel }) => {
        if (hitOHPaywall) {
          cancel();
          window.location.href = '/admin/perfil?alerta=limite_alcanzado';
          return;
        }
        isSubmitting = true;
        return async ({ update }) => { isSubmitting = false; update(); };
      }} class="space-y-8 pb-10 {hitOHPaywall ? 'opacity-50 pointer-events-none' : ''}">
        
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
          
          <div class="p-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="lg:col-span-2">
              <label for="propiedad_id" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Seleccionar Propiedad Base *</label>
              <div class="relative w-full">
                <select id="propiedad_id" name="propiedad_id" bind:value={valPropiedadId} required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
                  <option value="" class="text-slate-400">Selecciona una propiedad del inventario...</option>
                  {#each propiedades as prop}
                    <option value={prop.id}>{prop.titulo} ({prop.operacion})</option>
                  {/each}
                  {#if propiedades.length === 0}
                    <option value="" disabled>Sin propiedades activas — agrega una propiedad primero</option>
                  {/if}
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div class="lg:col-span-2">
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="lg:col-span-1">
                <label for="date" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fecha de Convocatoria *</label>
                <div class="relative">
                  <CalendarDays class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input id="date" type="date" name="date" bind:value={valDate} required class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-text">
                </div>
              </div>

              <div class="lg:col-span-1">
                <label for="timeStart" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Apertura *</label>
                <div class="relative w-full">
                  <select id="timeStart" name="timeStart" bind:value={valTimeStart} required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
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

              <div class="lg:col-span-1">
                <label for="timeEnd" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Cierre *</label>
                <div class="relative w-full">
                  <select id="timeEnd" name="timeEnd" bind:value={valTimeEnd} required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none {!horarioValido && valTimeEnd ? 'border-red-400 ring-1 ring-red-400' : ''}">
                    <option value="">Seleccionar...</option>
                    {#each timeOptions as time}
                      <option value={time.value}>{time.label}</option>
                    {/each}
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Clock class="w-3.5 h-3.5" />
                  </div>
                </div>
                {#if !horarioValido && valTimeEnd}
                  <p class="text-red-500 text-[10px] font-bold mt-1.5">El cierre debe ser posterior a la apertura.</p>
                {/if}
              </div>

              <div class="lg:col-span-1">
                <label for="maxCapacity" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Aforo Máximo *</label>
                <div class="relative">
                  <Users class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input id="maxCapacity" type="number" name="maxCapacity" bind:value={valMaxCapacity} required min="1" max="100" placeholder="Ej. 15" class="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-center">
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="relative">
          <div class="bg-slate-800 rounded-[2rem] p-8 sm:p-10 relative overflow-hidden shadow-lg border border-slate-700">
            <div class="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

            <div class="relative z-10 w-full flex flex-col gap-6 text-left">
              <div class="w-full">
                <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  Estudio Creativo IA para Eventos
                  <span class="flex h-2.5 w-2.5 relative mt-1">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </h2>
                <p class="text-sm text-slate-400 mt-2 leading-relaxed font-medium">
                  Autogenera invitaciones magnéticas y copy para WhatsApp usando los datos del formulario de arriba.
                </p>
              </div>

              {#if iaErrorMsg}
                <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-5 flex items-start gap-3 animate-[fadeIn_0.3s_ease-out]">
                  <AlertOctagon class="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div class="w-full">
                    <p class="text-sm font-black text-red-300 mb-1">Aviso:</p>
                    <p class="text-xs text-red-200">{iaErrorMsg}</p>
                  </div>
                </div>
              {/if}

              {#if creditosIA > 0}
                <div class="flex flex-col sm:flex-row items-end gap-4 w-full bg-slate-700/40 border border-slate-600/50 backdrop-blur-md rounded-2xl p-6 shadow-inner">
                  <div class="w-full md:flex-1">
                    <label for="tono-ia" class="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Tono de Invitación</label>
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

                  <div class="w-full md:w-auto shrink-0 flex flex-col sm:flex-row gap-4">
                    <div class="h-[46px] px-6 flex items-center justify-center gap-2 bg-slate-800 rounded-xl border border-slate-600/80 text-xs font-bold text-slate-200 shadow-inner">
                      <Sparkles class="w-4 h-4 text-amber-400" />
                      {creditosIA} {creditosIA === 1 ? 'Crédito' : 'Créditos'}
                    </div>
                    <button type="button" onclick={generarCampañaIA} disabled={generandoIA} class="h-[46px] px-8 relative overflow-hidden group bg-white text-slate-900 font-bold rounded-xl transition-all disabled:opacity-50 hover:bg-slate-100 flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95">
                      {#if generandoIA}
                        <Loader2 class="animate-spin w-4 h-4 text-slate-900" /> Redactando...
                      {:else}
                        <Sparkles class="w-4 h-4 text-slate-900" /> Generar
                      {/if}
                    </button>
                  </div>
                </div>
              {:else}
                <div class="w-full flex items-center gap-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                  <Zap class="w-8 h-8 text-red-400 shrink-0" />
                  <div>
                    <h3 class="text-sm font-bold text-white">Créditos Agotados</h3>
                    <p class="text-xs text-red-200 mt-1">Acude a Configuración para realizar un Top-Up de IA y dominar el mercado.</p>
                  </div>
                </div>
              {/if}
            </div>

            <div id="seccion-resultado-ia">
              {#if iaEjecutada && textoGeneradoWhatsapp}
                <div class="mt-6 animate-[fadeIn_0.4s_ease-out] relative z-10 w-full">
                  <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex flex-col w-full">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-xs font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <MessageCircle class="w-4 h-4 text-emerald-400" /> Campaña WhatsApp
                      </h4>
                      {#if !generandoIA}
                        <button type="button" onclick={() => copiarAlPortapapeles(textoGeneradoWhatsapp)} class="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-600/50">
                          {#if copiadoWhatsapp}
                            <Check class="w-3.5 h-3.5 text-emerald-400"/> Copiado
                          {:else}
                            <Copy class="w-3.5 h-3.5"/> Copiar
                          {/if}
                        </button>
                      {/if}
                    </div>
                    <div class="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                      {textoGeneradoWhatsapp}
                    </div>
                  </div>
                </div>
              {/if}
            </div>
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div class="lg:col-span-2">
                <label for="benefit" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Incentivo de Asistencia (Opcional)</label>
                <div class="relative">
                  <Gift class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input id="benefit" type="text" name="benefit" bind:value={valBenefit} placeholder="Ej. Asesoría financiera gratuita y coctel de bienvenida" class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                </div>
              </div>

              <div class="lg:col-span-2">
                <label for="description" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sinopsis del Evento (Storytelling) *</label>
                <textarea id="description" name="description" bind:value={valDescription} rows="8" required placeholder="Redacte la experiencia..." class="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm resize-y leading-relaxed"></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- 🚀 FIX: Mutación del Botón de Guardado Inferior por Paywall -->
        {#if hitOHPaywall}
          <a href="/admin/perfil" class="sm:hidden w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 h-14 gap-2 shadow-lg active:scale-95 mt-4">
            <Lock class="w-5 h-5" /> Actualizar Plan
          </a>
        {:else}
          <button type="submit" disabled={isSubmitting || generandoIA} class="sm:hidden w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-indigo-600 h-14 gap-2 shadow-lg active:scale-95 mt-4">
            {#if isSubmitting}
              <Loader2 class="w-5 h-5 animate-spin" /> Lanzando...
            {:else}
              <Rocket class="w-5 h-5" /> Lanzar Evento Oficial
            {/if}
          </button>
        {/if}

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
