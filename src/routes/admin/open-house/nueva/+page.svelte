<script>
  import { enhance } from '$app/forms';

  let { data } = $props();
  // Asumimos que data pasará las propiedades disponibles (data.propiedades) desde un +page.server.js
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-indigo-100">
  
  <aside class="w-64 bg-white flex flex-col hidden md:flex border-r border-slate-200 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
    <div class="h-24 flex items-center px-8 border-b border-slate-100">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="flex-1 p-6 space-y-2">
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Consola Operativa</p>
      <a href="/admin" class="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>
    </nav>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-20">
      <div class="flex items-center">
        <a href="/admin" class="text-slate-400 hover:text-indigo-600 transition-colors mr-4 bg-slate-100 hover:bg-indigo-50 p-2 rounded-lg" title="Volver al Inventario">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </a>
        <div>
          <h1 class="text-lg font-black text-slate-900 leading-tight">Configurar Open House</h1>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Evento Virtual y Físico</p>
        </div>
      </div>
      
      <button 
        type="submit" 
        form="form-openhouse"
        disabled={isSubmitting}
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-full shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
      >
        {#if isSubmitting}
          <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Generando...
        {:else}
          Lanzar Evento 🚀
        {/if}
      </button>
    </header>

    <div class="p-8 flex-1 overflow-auto">
      <div class="max-w-4xl mx-auto">
        
        <form id="form-openhouse" method="POST" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            update();
          };
        }}>
          
          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-xl font-black text-slate-900 mb-2">Identidad del Evento</h2>
              <p class="text-xs text-slate-500 font-medium">Asocia este Open House con una propiedad existente en tu inventario.</p>
            </div>
            
            <div class="p-8">
              <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Seleccionar Propiedad Base *</label>
                  <select name="propiedad_id" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                    <option value="">Selecciona una propiedad...</option>
                    {#each propiedades as prop}
                      <option value={prop.id}>{prop.titulo} ({prop.operacion})</option>
                    {/each}
                    {#if propiedades.length === 0}
                      <option value="test">Casa en Col. Americana (Demostración)</option>
                    {/if}
                  </select>
                </div>

                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título Promocional del Evento *</label>
                  <input type="text" name="title" required placeholder="Ej. Gran Open House: Lujo y Exclusividad en Puerta de Hierro" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-xl font-black text-slate-900 mb-2">Horarios y Capacidad</h2>
              <p class="text-xs text-slate-500 font-medium">Define cuándo sucederá y cuánta gente puede asistir simultáneamente.</p>
            </div>
            
            <div class="p-8">
              <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-3">
                <div class="sm:col-span-3">
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fecha del Evento *</label>
                  <input type="date" name="date" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hora de Inicio *</label>
                  <input type="time" name="timeStart" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Hora de Finalización *</label>
                  <input type="time" name="timeEnd" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cupo Máximo (Personas) *</label>
                  <input type="number" name="maxCapacity" required min="1" max="100" placeholder="Ej. 15" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                </div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div class="p-8 border-b border-slate-100 bg-slate-50/50">
              <h2 class="text-xl font-black text-slate-900 mb-2">Ganchos y Persuasión</h2>
              <p class="text-xs text-slate-500 font-medium">Información adicional para convencer al prospecto de reservar su lugar.</p>
            </div>
            
            <div class="p-8">
              <div class="grid grid-cols-1 gap-y-6 gap-x-6">
                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Beneficio Exclusivo (Opcional)</label>
                  <input type="text" name="benefit" placeholder="Ej. Valuación gratuita de tu propiedad actual al asistir" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none">
                  <p class="text-[10px] text-slate-400 mt-2 font-medium">Un incentivo para que los prospectos asistan físicamente.</p>
                </div>

                <div>
                  <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción del Evento (Storytelling) *</label>
                  <textarea name="description" rows="5" required placeholder="Describe la experiencia de recorrer esta casa..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed"></textarea>
                </div>
              </div>
            </div>
          </div>

        </form>

      </div>
    </div>
  </main>
</div>
