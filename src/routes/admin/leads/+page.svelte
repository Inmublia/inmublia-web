<script>
  import { invalidateAll } from '$app/navigation';
  import { enhance } from '$app/forms';
  import { 
    Search, 
    X, 
    Phone, 
    Mail, 
    Home, 
    Send, 
    Trash2, 
    Clock, 
    UserCircle,
    GripVertical,
    MessageSquareQuote
  } from 'lucide-svelte';
  
  let { data } = $props();
  let broker = $derived(data.broker || {});
  
  let leads = $state(data.leads || []);
  let draggedLeadId = $state(null);

  let selectedLead = $state(null);
  let isPanelOpen = $state(false);
  let nuevaNotaTexto = $state('');
  let guardandoNota = $state(false);
  let submitBtn = $state(null);
  
  let searchQuery = $state('');
  let leadsFiltrados = $derived(
    leads.filter(l => 
      l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (l.propiedades?.titulo && l.propiedades.titulo.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  $effect(() => {
    leads = data.leads || [];
  });

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos', dot: 'bg-zinc-400', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
    { id: 'contactado', titulo: 'Contactados', dot: 'bg-blue-500', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { id: 'visita', titulo: 'Citas / Visitas', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { id: 'negociacion', titulo: 'Negociación', dot: 'bg-purple-500', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { id: 'cerrado', titulo: 'Ganados', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { id: 'descartado', titulo: 'Perdidos', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
  ];

  function getBadgeColor(estado) {
    const col = columnas.find(c => c.id === estado);
    return col ? col.badge : 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }

  function timeAgo(dateString) {
    if (!dateString) return 'Desconocido';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  }

  function arrancar(event, id) {
    draggedLeadId = id;
    event.dataTransfer.effectAllowed = 'move';
    // Ocultar sutilmente la tarjeta original mientras se arrastra
    setTimeout(() => event.target.classList.add('opacity-30'), 0);
  }

  function terminar(event) {
    event.target.classList.remove('opacity-30');
  }

  function permitirSoltar(event) {
    event.preventDefault();
  }

  async function soltar(event, nuevaColumnaId) {
    event.preventDefault();
    if (draggedLeadId) {
      actualizarEstadoLocalYBD(draggedLeadId, nuevaColumnaId);
      draggedLeadId = null;
    }
  }

  function actualizarEstadoLocalYBD(leadId, nuevoEstado) {
    leads = leads.map(lead => {
      if (lead.id === leadId) return { ...lead, estado: nuevoEstado };
      return lead;
    });

    const formData = new FormData();
    formData.append('id', leadId);
    formData.append('estado', nuevoEstado);
    
    fetch('?/actualizar', {
      method: 'POST',
      body: formData,
      headers: {
        'x-sveltekit-action': 'true',
        'accept': 'application/json'
      }
    }).catch(err => {
      console.error("Error guardando estado:", err);
      alert('Falló la sincronización con el CRM.');
    });
  }

  function abrirPanel(lead) {
    selectedLead = { ...lead };
    if (!selectedLead.lead_notas) selectedLead.lead_notas = [];
    isPanelOpen = true;
  }

  function cerrarPanel() {
    isPanelOpen = false;
    setTimeout(() => { selectedLead = null; nuevaNotaTexto = ''; }, 300);
  }

  function manejadorNota({ formData, cancel }) {
    const notaTemp = formData.get('contenido').trim();
    if (!notaTemp || guardandoNota) { cancel(); return; }
    
    guardandoNota = true;
    
    const nuevaNotaObj = {
      id: 'temp-' + Date.now(),
      contenido: notaTemp,
      tipo: 'nota',
      creado_en: new Date().toISOString()
    };
    
    selectedLead.lead_notas = [nuevaNotaObj, ...selectedLead.lead_notas];
    
    if (selectedLead.estado === 'nuevo') {
      actualizarEstadoLocalYBD(selectedLead.id, 'contactado');
      selectedLead.estado = 'contactado';
    }

    return async ({ result, update }) => {
      guardandoNota = false;
      if (result.type === 'success') {
        nuevaNotaTexto = ''; 
        await update(); 
        
        const leadActualizado = data.leads.find(l => l.id === selectedLead.id);
        if (leadActualizado) {
          selectedLead = { ...leadActualizado, lead_notas: [...leadActualizado.lead_notas] };
        }
      } else {
        alert(`Fallo en servidor: ${result.data?.error || 'Revisa tu conexión'}`);
      }
    };
  }

  function eliminarLead(id) {
    if (confirm('¿Eliminar este prospecto permanentemente?')) {
      leads = leads.filter(l => l.id !== id);
      const formData = new FormData();
      formData.append('id', id);
      fetch('?/eliminar', { 
        method: 'POST', body: formData, 
        headers: { 'x-sveltekit-action': 'true', 'accept': 'application/json' } 
      });
    }
  }

  // Atajo de teclado (Cmd+Enter o Ctrl+Enter)
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (nuevaNotaTexto.trim() && submitBtn) {
        submitBtn.click();
      }
    }
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-zinc-950 font-sans text-zinc-50">
  
  <header class="h-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 sm:px-10 shrink-0 sticky top-0 z-20">
    <div class="flex items-center gap-3">
      <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <MessageSquareQuote class="w-5 h-5 text-indigo-400" />
        Centro de Operaciones
      </h1>
    </div>

    <div class="relative w-full max-w-md hidden sm:block">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar prospecto o propiedad..." class="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-inner">
    </div>
  </header>

  <div class="p-6 sm:p-10 flex-1 overflow-auto animate-in fade-in duration-500">
    <div class="relative w-full mb-6 sm:hidden">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
      <input type="text" bind:value={searchQuery} placeholder="Buscar prospecto..." class="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-inner">
    </div>

    <div class="flex gap-6 overflow-x-auto pb-8 items-start min-h-[70vh] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
      
      {#each columnas as columna}
        <div 
          class="flex-shrink-0 w-[340px] bg-zinc-900/40 rounded-2xl p-4 flex flex-col min-h-[500px] border border-zinc-800/50 shadow-inner"
          ondragover={permitirSoltar}
          ondrop={(e) => soltar(e, columna.id)}
        >
          <div class="flex items-center justify-between mb-5 px-1 border-b border-zinc-800/50 pb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full {columna.dot}"></span>
              {columna.titulo}
            </h2>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {leadsFiltrados.filter(l => l.estado === columna.id).length}
            </span>
          </div>

          <div class="flex-1 flex flex-col gap-3">
            {#each leadsFiltrados.filter(l => l.estado === columna.id) as lead (lead.id)}
              <div 
                draggable="true"
                ondragstart={(e) => arrancar(e, lead.id)}
                ondragend={terminar}
                class="bg-zinc-900 p-4 rounded-xl border border-zinc-800 cursor-pointer active:cursor-grabbing hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] transition-all group relative"
              >
                <button onclick={() => abrirPanel(lead)} class="absolute inset-0 w-full h-full z-0 cursor-pointer"></button>

                <div class="flex items-start justify-between mb-3 relative z-10 pointer-events-none">
                  <div class="flex items-center gap-3">
                    <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=18181b&color=fff" alt="Avatar" class="w-8 h-8 rounded-full shadow-sm ring-1 ring-zinc-700">
                    <div>
                      <h3 class="text-sm font-bold text-zinc-100 leading-none mb-1">{lead.nombre}</h3>
                      <p class="text-[10px] font-medium text-zinc-500 flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {timeAgo(lead.creado_en)}
                      </p>
                    </div>
                  </div>
                  
                  <button aria-label="Eliminar lead" onclick={(e) => { e.stopPropagation(); eliminarLead(lead.id); }} class="pointer-events-auto text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 p-1.5 rounded-md">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div class="bg-zinc-950/50 p-3 rounded-lg mb-4 border border-zinc-800/80 relative z-10 pointer-events-none">
                  <p class="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Home class="w-3 h-3" /> Propiedad de Interés
                  </p>
                  <p class="text-xs text-zinc-200 font-medium truncate">
                    {lead.propiedades?.titulo || 'Inventario Privado'}
                  </p>
                </div>
                
                <a 
                  href="https://wa.me/{lead.telefono ? lead.telefono.replace(/\D/g, '') : ''}?text={encodeURIComponent('Hola ' + lead.nombre.split(' ')[0] + ', soy tu asesor de Inmublia. Recibí tu solicitud por la propiedad: ' + (lead.propiedades?.titulo || 'Inventario Privado') + '. ¿En qué te puedo ayudar?')}" 
                  target="_blank"
                  rel="noopener noreferrer"
                  onclick={(e) => e.stopPropagation()}
                  class="relative z-10 flex items-center justify-center gap-2 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-emerald-500/20"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Contactar
                </a>
              </div>
            {/each}
            
            {#if leadsFiltrados.filter(l => l.estado === columna.id).length === 0}
              <div class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30 min-h-[120px] opacity-50">
                <GripVertical class="w-6 h-6 text-zinc-600 mb-2" />
                <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">Soltar aquí</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if isPanelOpen}
    <div 
      class="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in"
      onclick={cerrarPanel}
    ></div>
  {/if}

  <div 
    class="absolute top-0 right-0 h-full w-full sm:w-[480px] bg-zinc-950 shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] border-l border-zinc-800 flex flex-col {isPanelOpen ? 'translate-x-0' : 'translate-x-full'}"
  >
    {#if selectedLead}
      <div class="px-6 py-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900/50">
        <div class="flex items-center gap-4">
          <img src="https://ui-avatars.com/api/?name={selectedLead.nombre}&background=18181b&color=fff" alt="Avatar" class="w-12 h-12 rounded-full shadow-md ring-2 ring-zinc-800">
          <div>
            <h2 class="text-lg font-bold text-zinc-50 leading-tight">{selectedLead.nombre}</h2>
            <span class="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md border {getBadgeColor(selectedLead.estado)} mt-1.5 inline-block">
              {selectedLead.estado}
            </span>
          </div>
        </div>
        <button aria-label="Cerrar panel" onclick={cerrarPanel} class="text-zinc-500 hover:text-zinc-100 p-2 rounded-full hover:bg-zinc-800 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="px-6 py-5 border-b border-zinc-800 shrink-0 bg-zinc-950 grid grid-cols-2 gap-6">
        <div>
          <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Phone class="w-3 h-3" /> Teléfono</p>
          <p class="text-sm font-semibold text-zinc-200">{selectedLead.telefono || 'No registrado'}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Mail class="w-3 h-3" /> Correo</p>
          <p class="text-sm font-semibold text-zinc-200 truncate" title={selectedLead.correo}>{selectedLead.correo || 'No registrado'}</p>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 bg-zinc-950 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">Historial de Actividad</h3>
        
        {#if selectedLead.lead_notas && selectedLead.lead_notas.length > 0}
          <div class="flex flex-col gap-4">
            {#each selectedLead.lead_notas as nota}
              <div class="relative pl-6">
                <div class="absolute left-0 top-1 bottom-[-20px] w-px bg-zinc-800 last:hidden"></div>
                <div class="absolute left-[-4px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-zinc-950"></div>
                
                <div class="bg-zinc-900 p-4 rounded-xl border border-zinc-800 shadow-sm">
                  <p class="text-sm text-zinc-300 font-medium whitespace-pre-wrap leading-relaxed">{nota.contenido}</p>
                  <div class="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800/50">
                    <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{nota.tipo === 'nota' ? 'Nota Interna' : 'Evento'}</span>
                    <span class="text-[10px] font-medium text-zinc-500 flex items-center gap-1"><Clock class="w-3 h-3" /> {timeAgo(nota.creado_en)}</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="flex-1 flex flex-col items-center justify-center text-center px-4 opacity-40">
            <UserCircle class="w-12 h-12 text-zinc-600 mb-3" />
            <p class="text-sm font-bold text-zinc-400">Sin historial</p>
            <p class="text-xs text-zinc-500 mt-1">Escribe tu primera nota abajo para comenzar.</p>
          </div>
        {/if}
      </div>

      <div class="p-6 bg-zinc-900 border-t border-zinc-800 shrink-0">
        <form method="POST" action="?/guardarNota" use:enhance={manejadorNota} class="flex flex-col gap-3 relative">
          <input type="hidden" name="lead_id" value={selectedLead.id} />
          
          <textarea 
            name="contenido"
            bind:value={nuevaNotaTexto} 
            onkeydown={handleKeyDown}
            placeholder="Resumen de llamada... (Cmd + Enter para guardar)" 
            class="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none min-h-[80px] shadow-inner"
            required
          ></textarea>
          
          <button 
            type="submit" 
            bind:this={submitBtn}
            disabled={guardandoNota || !nuevaNotaTexto.trim()}
            class="absolute bottom-3 right-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2 rounded-lg transition-colors flex items-center justify-center shadow-md active:scale-95"
            title="Guardar Nota (Cmd/Ctrl + Enter)"
          >
            {#if guardandoNota}
              <Loader2 class="w-4 h-4 animate-spin" />
            {:else}
              <Send class="w-4 h-4" />
            {/if}
          </button>
        </form>
        <p class="text-[9px] text-zinc-500 font-medium mt-3 text-center">* Al registrar interacción, el prospecto avanza a "Contactado".</p>
      </div>
    {/if}
  </div>
</main>
