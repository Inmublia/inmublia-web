<script>
  // Simulamos los datos que vendrían de tu base de datos usando runas de Svelte 5
  let leads = $state([
    { id: 1, nombre: 'Alejandro Garza', telefono: '33 1234 5678', propiedad: 'Casa Bugambilias', estado: 'nuevo', fecha: 'Hace 2 horas' },
    { id: 2, nombre: 'Mariana Ríos', telefono: '55 9876 5432', propiedad: 'Depa Puerta de Hierro', estado: 'contactado', fecha: 'Ayer' },
    { id: 3, nombre: 'Roberto Castañeda', telefono: '81 4444 5555', propiedad: 'Terreno Valle Real', estado: 'nuevo', fecha: 'Hace 5 horas' }
  ]);

  const columnas = [
    { id: 'nuevo', titulo: 'Nuevos Prospectos', color: 'bg-blue-50 text-blue-700' },
    { id: 'contactado', titulo: 'Contactados / Negociando', color: 'bg-amber-50 text-amber-700' },
    { id: 'cerrado', titulo: 'Cerrados / Descartados', color: 'bg-emerald-50 text-emerald-700' }
  ];

  let draggedLeadId = null;

  // Eventos Nativos de Drag & Drop
  function arrancar(event, id) {
    draggedLeadId = id;
    // Efecto visual al arrastrar
    event.dataTransfer.effectAllowed = 'move';
    setTimeout(() => event.target.classList.add('opacity-50'), 0);
  }

  function terminar(event) {
    event.target.classList.remove('opacity-50');
  }

  function permitirSoltar(event) {
    event.preventDefault(); // Necesario para que HTML5 permita el Drop
  }

  function soltar(event, nuevaColumnaId) {
    event.preventDefault();
    if (draggedLeadId) {
      // Actualizamos el estado reactivo
      leads = leads.map(lead => {
        if (lead.id === draggedLeadId) {
          // AQUÍ IRÍA TU FETCH A SUPABASE PARA GUARDAR EL NUEVO ESTADO EN BD
          // supabase.from('leads').update({ estado: nuevaColumnaId }).eq('id', lead.id);
          return { ...lead, estado: nuevaColumnaId };
        }
        return lead;
      });
      draggedLeadId = null;
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 py-10 px-8 font-sans">
  <div class="max-w-[1400px] mx-auto">
    
    <header class="mb-10">
      <h1 class="text-3xl font-black text-slate-900 tracking-tight">Gestión de Interesados</h1>
      <p class="text-slate-500 mt-2">Arrastra los prospectos para actualizar su estado.</p>
    </header>

    <div class="flex gap-6 overflow-x-auto pb-8 items-start">
      {#each columnas as columna}
        <div 
          class="flex-shrink-0 w-80 bg-slate-200/50 rounded-2xl p-4 flex flex-col min-h-[600px]"
          ondragover={permitirSoltar}
          ondrop={(e) => soltar(e, columna.id)}
        >
          <div class="flex items-center justify-between mb-4 px-2">
            <h2 class="text-sm font-bold uppercase tracking-widest text-slate-700">{columna.titulo}</h2>
            <span class="text-xs font-bold bg-white text-slate-900 px-2 py-1 rounded-full shadow-sm">
              {leads.filter(l => l.estado === columna.id).length}
            </span>
          </div>

          <div class="flex-1 flex flex-col gap-3">
            {#each leads.filter(l => l.estado === columna.id) as lead (lead.id)}
              <div 
                draggable="true"
                ondragstart={(e) => arrancar(e, lead.id)}
                ondragend={terminar}
                class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative"
              >
                <!-- Avatar Generado Automáticamente -->
                <div class="flex items-center gap-3 mb-3">
                  <img src="https://ui-avatars.com/api/?name={lead.nombre}&background=0f172a&color=fff" alt="Avatar" class="w-8 h-8 rounded-full">
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">{lead.nombre}</h3>
                    <p class="text-[10px] uppercase tracking-widest text-slate-400">{lead.fecha}</p>
                  </div>
                </div>
                
                <p class="text-xs text-slate-600 font-medium mb-3">Interés: <span class="text-slate-900">{lead.propiedad}</span></p>
                
                <!-- Botón Mágico WhatsApp Web -->
                <a 
                  href="https://wa.me/52{lead.telefono.replace(/\s+/g, '')}?text=Hola%20{lead.nombre.split(' ')[0]},%20soy%20tu%20asesor%20de%20Inmublia.%20Recibí%20tu%20solicitud%20por%20la%20propiedad:%20{lead.propiedad}.%20¿En%20qué%20te%20puedo%20ayudar?" 
                  target="_blank"
                  class="flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors"
                >
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                  Contactar
                </a>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
