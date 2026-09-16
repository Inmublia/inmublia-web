<!-- src/routes/admin/open-house/nueva/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  import { 
    ArrowLeft, 
    Building2, 
    CalendarClock, 
    CalendarDays, 
    Clock, 
    Users, 
    Gift, 
    PenTool, 
    Loader2,
    Rocket
  } from 'lucide-svelte';

  let { data } = $props();
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);

  // Motor para generar horarios Premium (intervalos de 30 mins)
  const timeOptions = [];
  for (let i = 7; i <= 21; i++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = i.toString().padStart(2, '0');
      const min = m === 0 ? '00' : '30';
      const hour12 = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      timeOptions.push({
        value: `${hour24}:${min}`,
        label: `${hour12}:${min} ${ampm}`
      });
    }
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <!-- 🚀 FIX: Cabecera Estilo Premium (Oscura, con padding profundo) -->
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[800px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <a href="/admin" class="text-zinc-400 hover:text-white transition-colors p-2.5 rounded-xl hover:bg-white/10" aria-label="Volver al inicio" title="Volver al Inventario">
          <ArrowLeft class="w-6 h-6" />
        </a>
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">Configurar Open House</h1>
          <p class="text-sm font-medium text-zinc-400 mt-1">Despliegue de Evento Físico</p>
        </div>
      </div>

      <!-- 🚀 FIX: Botón de Guardado Superior en Blanco -->
      <button type="submit" form="form-openhouse" disabled={isSubmitting} class="hidden sm:inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-white text-zinc-950 hover:bg-zinc-200 h-11 px-6 gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95">
        {#if isSubmitting}
          <Loader2 class="w-4 h-4 animate-spin text-zinc-950" />
          Lanzando Evento...
        {:else}
          <Rocket class="w-4 h-4 text-indigo-500" />
          Lanzar Evento Oficial
        {/if}
      </button>
    </div>
  </header>

  <!-- 🚀 FIX: Contenedor Principal (Sobresale hacia la cabecera oscura con -mt-16) -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[800px] mx-auto px-4 sm:px-10 h-full">
      
      <form id="form-openhouse" method="POST" use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          isSubmitting = false;
          update();
        };
      }} class="space-y-8 pb-10">
        
        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700">
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
                <select id="propiedad_id" name="propiedad_id" required class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer appearance-none">
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
              <input id="title" type="text" name="title" required placeholder="Ej. Presentación Exclusiva: Residencia en Puerta de Hierro" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
            </div>
          </div>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700">
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

        <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-start gap-4">
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-slate-700">
              <PenTool class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-black text-slate-900 tracking-tight">Persuasión y Copywriting</h2>
              <p class="text-xs font-medium text-slate-500 mt-1">Defina los diferenciadores que impulsarán el registro de prospectos.</p>
            </div>
          </div>
          
          <div class="p-8 space-y-6">
            <div>
              <label for="benefit" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Incentivo de Asistencia (Opcional)</label>
              <div class="relative">
                <Gift class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input id="benefit" type="text" name="benefit" placeholder="Ej. Asesoría financiera gratuita y valuación de mercado" class="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
              </div>
            </div>

            <div>
              <label for="description" class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sinopsis del Evento (Storytelling) *</label>
              <textarea id="description" name="description" rows="5" required placeholder="Redacte la experiencia que vivirá el prospecto al recorrer esta propiedad..." class="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm resize-y leading-relaxed"></textarea>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} class="sm:hidden w-full inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-indigo-600 h-14 gap-2 shadow-lg active:scale-95 mt-4">
          {#if isSubmitting}
            <Loader2 class="w-5 h-5 animate-spin" />
            Lanzando Evento...
          {:else}
            <Rocket class="w-5 h-5" />
            Lanzar Evento Oficial
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
