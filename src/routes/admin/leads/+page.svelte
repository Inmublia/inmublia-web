<script>
  import { invalidateAll } from '$app/navigation';
  
  let { data } = $props();
  let broker = $derived(data.broker || {});
  
  // Clonamos los leads en un estado local para la actualización optimista (UI instantánea)
  let leads = $state(data.leads || []);
  
  // Motor de búsqueda
  let searchQuery = $state('');
  let leadsFiltrados = $derived(
    leads.filter(l => 
      l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (l.propiedad_titulo && l.propiedad_titulo.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Prospectos', color: 'bg-slate-100 text-slate-700' },
    { id: 'contactado', titulo: 'Contactados / Negociación', color: 'bg-blue-50 text-blue-700' },
    { id: 'cerrado', titulo: 'Cerrados / Descartados', color: 'bg-emerald-50 text-emerald-700' }
  ];

  let draggedLeadId = null;

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
    setTimeout(() => event.target.classList.add('opacity-40'), 0);
  }

  function terminar(event) {
    event.target.classList.remove('opacity-40');
  }

  function permitirSoltar(event) {
    event.preventDefault();
  }

  async function soltar(event, nuevaColumnaId) {
    event.preventDefault();
    if (draggedLeadId) {
      // 1. Actualización Optimista (La UI cambia de inmediato)
      leads = leads.map(lead => {
        if (lead.id === draggedLeadId) {
          return { ...lead, estado: nuevaColumnaId };
        }
        return lead;
      });

      // 2. Sincronización Silenciosa con Supabase
      const formData = new FormData();
      formData.append('id', draggedLeadId);
      formData.append('estado', nuevaColumnaId);

      fetch('?/actualizar', {
        method: 'POST',
        body: formData
      }).catch(err => console.error("Error guardando estado:", err));

      draggedLeadId = null;
    }
  }

  async function eliminarLead(id) {
    if (confirm('¿Eliminar este prospecto permanentemente?')) {
      // Remover de la UI inmediatamente
      leads = leads.filter(l => l.id !== id);
      
      const formData = new FormData();
      formData.append('id', id);
      fetch('?/eliminar', { method: 'POST', body: formData });
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-blue-100">
  
  <!-- BARRA LATERAL (UNIFICADA) -->
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
      
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>

      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
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
  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
      <h1 class="text-2xl font-black text-slate-900 tracking-tight">Gestión de Interesados</h1>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      
      <!-- BARRA DE BÚSQUEDA Y FILTRADO -->
      <div class="flex flex-col lg:flex-row gap-8 mb-10">
        <div class="flex-1 bg-white rounded-2xl p-2 shadow-sm border border-slate-200 flex items-center px-4">
          <svg class="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" bind:value={searchQuery} placeholder="Buscar prospecto por nombre o propiedad..." class="w-full bg-transparent border-none focus:outline-none text-slate-900 py-3 placeholder:text-slate-400">
        </div>
      </div>

      <!-- TABLERO KANBAN -->
      <div class="flex gap-6 overflow-x-auto pb-8 items-start min-h-[600px]">
        {#each columnas as columna}
          <div 
            class="flex-shrink-0 w-[340px] bg-white rounded-2xl p-4 flex flex-col min-h-[500px] border border-slate-200 shadow-sm"
            ondragover={permitirSoltar}
            ondrop={(e) => soltar(e, columna.id)}
          >
            <div class="flex items-center justify-between mb-6 px-2 border-b border-slate-100 pb-4">
              <h2 class="text-[11px] font-bold uppercase tracking-widest text-slate-500">{columna.titulo}</h2>
              <span class="text-xs font-bold {columna.color} px-2.5 py-1 rounded-full">
                {leadsFiltrados.filter(l => l.estado === columna.id).length}
              </span>
            </div>

            <div class="flex-1 flex flex-col gap-4">
              {#each leadsFiltrados.filter(l => l.estado === columna.id) as lead (lead.id)}
                <div 
                  draggable="true"
                  ondragstart={(e) => arrancar(e, lead.id)}
                  ondragend={terminar}
                  class="bg-white p-5 rounded-xl border border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md transition-all group relative"
                >
                  
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=0f172a&color=fff" alt="Avatar" class="w-9 h-9 rounded-full shadow-sm">
                      <div>
                        <h3 class="text-sm font-black text-slate-900">{lead.nombre}</h3>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{timeAgo(lead.creado_en)}</p>
                      </div>
                    </div>
                    
                    <!-- Botón Eliminar (Deseable #2) -->
                    <button onclick={() => eliminarLead(lead.id)} class="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Descartar prospecto">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  
                  <div class="bg-slate-50 p-3 rounded-lg mb-4 border border-slate-100">
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Interés en</p>
                    <p class="text-xs text-slate-900 font-bold truncate">{lead.propiedad_titulo || 'Propiedad Privada'}</p>
                    
                    {#if lead.correo}
                      <p class="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1 truncate">
                        <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        {lead.correo}
                      </p>
                    {/if}
                  </div>
                  
                  <a 
                    href="https://wa.me/52{lead.telefono.replace(/\s+/g, '')}?text=Hola%20{lead.nombre.split(' ')[0]},%20soy%20tu%20asesor%20de%20Inmublia.%20Recibí%20tu%20solicitud%20por%20la%20propiedad:%20{lead.propiedad_titulo}.%20¿En%20qué%20te%20puedo%20ayudar?" 
                    target="_blank"
                    class="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] text-xs font-bold uppercase tracking-widest rounded-lg transition-colors border border-[#25D366]/20"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    WhatsApp
                  </a>
                </div>
              {/each}
              
              {#if leadsFiltrados.filter(l => l.estado === columna.id).length === 0}
                <div class="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Soltar tarjeta aquí</p>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

    </div>
  </main>
</div>
