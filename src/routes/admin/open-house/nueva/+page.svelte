<script>
  import { enhance } from '$app/forms';

  let { data } = $props();
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);
</script>

<div class="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-100">
  
  <!-- Sidebar -->
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      <a href="#" class="flex items-center gap-3 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        Lanzamientos
      </a>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col h-screen overflow-hidden relative">
    
    <!-- Background Design Element -->
    <div class="absolute top-0 left-0 right-0 h-96 bg-slate-900 -z-10"></div>

    <!-- Header -->
    <header class="h-24 flex items-center justify-between px-10 shrink-0 z-20">
      <div class="flex items-center gap-6">
        <a href="/admin" class="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </a>
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">Estrategia de Lanzamiento</h1>
          <p class="text-xs font-medium text-slate-400 mt-1">Configuración de Open House Digital</p>
        </div>
      </div>
      
      <button 
        type="submit" 
        form="form-openhouse"
        disabled={isSubmitting}
        class="bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 font-black py-3 px-8 rounded-full shadow-2xl transition-all flex items-center gap-2 text-sm disabled:opacity-50"
      >
        {#if isSubmitting}
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Desplegando...
        {:else}
          Lanzar Evento al Mercado
        {/if}
      </button>
    </header>

    <div class="px-10 pb-20 flex-1 overflow-auto z-20">
      <div class="max-w-5xl mx-auto">
        
        <form id="form-openhouse" method="POST" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            update();
          };
        }} class="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-10 md:p-14 space-y-16">
          
          <!-- SECCIÓN 1: EL ACTIVO -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div class="lg:col-span-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">1. El Activo</h3>
              <p class="text-sm text-slate-500 mt-3 leading-relaxed">Selecciona la propiedad en Pre-Mercado y define el "gancho" comercial con el que atraerás a los prospectos.</p>
            </div>
            <div class="lg:col-span-8 space-y-6">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Inmueble Base *</label>
                <div class="relative">
                  <select name="propiedad_id" required class="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-5 pr-12 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer">
                    <option value="">Selecciona la propiedad a lanzar...</option>
                    {#each propiedades as prop}
                      <option value={prop.id}>{prop.titulo} ({prop.operacion})</option>
                    {/each}
                    {#if propiedades.length === 0}
                      <option value="test">Casa en Col. Americana (Demostración)</option>
                    {/if}
                  </select>
                  <svg class="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título Promocional (Copywriting) *</label>
                <input type="text" name="title" required placeholder="Ej. Lanzamiento Exclusivo: Lujo en Puerta de Hierro" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
              </div>
            </div>
          </div>

          <hr class="border-slate-100">

          <!-- SECCIÓN 2: LOGÍSTICA -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div class="lg:col-span-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">2. Urgencia y Escasez</h3>
              <p class="text-sm text-slate-500 mt-3 leading-relaxed">El reloj activa el FOMO (Fear Of Missing Out). Limitar el cupo aumenta dramáticamente el ratio de conversión.</p>
            </div>
            <div class="lg:col-span-8">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fecha Exacta *</label>
                  <div class="relative">
                    <!-- Escondemos el icono nativo feo con CSS en tailwind -->
                    <input type="date" name="date" required class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer uppercase tracking-wider">
                    <svg class="w-5 h-5 text-indigo-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Apertura *</label>
                  <div class="relative">
                    <input type="time" name="timeStart" required class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer uppercase tracking-wider">
                    <svg class="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cierre *</label>
                  <div class="relative">
                    <input type="time" name="timeEnd" required class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer uppercase tracking-wider">
                    <svg class="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Límite de Asistentes (Cupo Máximo) *</label>
                  <input type="number" name="maxCapacity" required min="1" max="100" placeholder="Ej. 15" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
                </div>
              </div>
            </div>
          </div>

          <hr class="border-slate-100">

          <!-- SECCIÓN 3: STORYTELLING -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div class="lg:col-span-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">3. El Pitch de Ventas</h3>
              <p class="text-sm text-slate-500 mt-3 leading-relaxed">Pinta una imagen mental en la mente del prospecto. ¿Qué van a sentir al recorrer la casa? ¿Hay algún regalo por asistir?</p>
            </div>
            <div class="lg:col-span-8 space-y-6">
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Incentivo de Asistencia (Opcional)</label>
                <div class="relative">
                  <input type="text" name="benefit" placeholder="Ej. Asesoría hipotecaria gratuita en el lugar" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-5 py-4 font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">🎁</span>
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción Inmersiva *</label>
                <textarea name="description" rows="5" required placeholder="Acompáñanos a descubrir este espacio diseñado para..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all leading-relaxed resize-none"></textarea>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  </main>
</div>
