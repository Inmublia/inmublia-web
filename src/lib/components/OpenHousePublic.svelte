<script>
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';

  let { event = {}, attendeesDb = [] } = $props();

  let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let eventStatus = $state('upcoming'); 
  let currentPhoto = $state(0);
  let showSuccess = $state(false);

  let attendees = $derived(attendeesDb);
  let spotsLeft = $derived(event.maxCapacity - attendees.length);
  let isFull = $derived(spotsLeft <= 0);

  let submitting = $state(false);
  let timer;

  function updateCountdown() {
    if (!event.date) return;
    const now = new Date();
    const eventDate = new Date(`${event.date}T${event.timeStart}`);
    const diff = eventDate - now;

    if (diff <= 0) {
      const eventEnd = new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);
      eventStatus = now < eventEnd ? 'live' : 'ended';
      countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return;
    }

    const today = new Date();
    const isToday =
      eventDate.getDate() === today.getDate() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getFullYear() === today.getFullYear();

    eventStatus = isToday ? 'today' : 'upcoming';

    countdown = {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  }

  onMount(() => {
    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
  });

  onDestroy(() => clearInterval(timer));

  let formattedDate = $derived(
    event.date ? new Date(`${event.date}T00:00:00`).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }) : ''
  );

  let formattedPrice = $derived(
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(event.price || 0)
  );

  let whatsappMsg = $derived(
    encodeURIComponent(`Hola, me interesa asistir al Open House de "${event.title}".`)
  );

  function nextPhoto() {
    if (event.photos && event.photos.length > 0) {
      currentPhoto = (currentPhoto + 1) % event.photos.length;
    }
  }

  function prevPhoto() {
    if (event.photos && event.photos.length > 0) {
      currentPhoto = (currentPhoto - 1 + event.photos.length) % event.photos.length;
    }
  }
</script>

<div class="min-h-screen bg-zinc-50 text-slate-900 font-sans selection:bg-indigo-100">
  
  <div class="relative w-full h-[85vh] bg-slate-900 overflow-hidden group">
    
    {#if event.photos && event.photos.length > 0}
      <img src={event.photos[currentPhoto]} alt="Propiedad Exclusiva" class="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105" />
    {/if}
    
    <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 z-10 pointer-events-none"></div>

    <header class="absolute top-0 w-full z-50 px-6 sm:px-12 py-8 flex justify-between items-center text-white">
      <div class="font-black text-xl tracking-tight flex items-center gap-3">
        <div class="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center text-sm shadow-lg">
          {event.agent?.name?.substring(0, 2).toUpperCase() || 'IN'}
        </div>
        <span class="drop-shadow-md">{event.agent?.name || 'Inmublia'}</span>
      </div>
      <div class="text-[10px] font-bold uppercase tracking-widest text-white/90 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
        Open House Exclusivo
      </div>
    </header>

    {#if event.photos && event.photos.length > 1}
      <button class="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-40 border border-white/10" onclick={prevPhoto} aria-label="Foto Anterior">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
      </button>
      <button class="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-40 border border-white/10" onclick={nextPhoto} aria-label="Siguiente Foto">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </button>
    {/if}

    <div class="absolute inset-0 z-20 flex flex-col justify-end px-6 sm:px-12 pb-16 sm:pb-24 max-w-7xl mx-auto w-full">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        
        <div class="max-w-3xl">
          {#if eventStatus === 'live'}
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest rounded-sm mb-4 shadow-lg">
              <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span> PUERTAS ABIERTAS AHORA
            </div>
          {:else}
            <div class="inline-flex px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest border border-white/30 rounded-sm mb-4">
              Lanzamiento Privado
            </div>
          {/if}
          
          <h1 class="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.05] drop-shadow-xl mb-4">
            {event.title}
          </h1>
          
          <p class="text-lg sm:text-xl text-white/80 font-medium flex items-center gap-2 drop-shadow-md">
            <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {event.address}
          </p>
        </div>

        {#if eventStatus === 'upcoming' || eventStatus === 'today'}
          <div class="bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl shrink-0">
            <p class="text-[10px] font-bold text-white/60 uppercase tracking-widest text-center mb-4">Apertura de Accesos en</p>
            <div class="flex gap-4 sm:gap-6 justify-center">
              {#each [ { v: countdown.days, l: 'Días' }, { v: countdown.hours, l: 'Hrs' }, { v: countdown.minutes, l: 'Min' }, { v: countdown.seconds, l: 'Seg' } ] as unit}
                <div class="flex flex-col items-center">
                  <span class="text-4xl sm:text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-lg">{String(unit.v).padStart(2, '0')}</span>
                  <span class="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">{unit.l}</span>
                </div>
              {/each}
            </div>
            <div class="mt-5 text-center text-xs font-bold text-white/80 uppercase tracking-widest border-t border-white/10 pt-4">
              {formattedDate} · {event.timeStart}
            </div>
          </div>
        {/if}

      </div>
    </div>
  </div>
<!-- MAIN BODY: Especificaciones y Formulario -->
  <main class="max-w-7xl mx-auto px-6 sm:px-12 py-16 sm:py-24">
    <!-- Agregamos items-start para que el Sticky funcione impecable -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-16 relative items-start">
      
      <!-- COLUMNA IZQUIERDA: Detalles -->
      <div class="lg:col-span-7 space-y-12">
        
        <!-- Ficha de Precio y Espacios -->
        <div>
          <div class="text-5xl sm:text-6xl font-black text-slate-900 tracking-tighter mb-8">
            {formattedPrice} <span class="text-2xl text-slate-400 font-bold ml-1">MXN</span>
          </div>
          
          <div class="flex flex-wrap gap-4 sm:gap-8 border-y border-slate-200 py-8">
            <div>
              <div class="text-2xl font-black text-slate-900">{event.bedrooms}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Recámaras</div>
            </div>
            <div class="w-px h-12 bg-slate-200 hidden sm:block"></div>
            <div>
              <div class="text-2xl font-black text-slate-900">{event.bathrooms}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Baños</div>
            </div>
            <div class="w-px h-12 bg-slate-200 hidden sm:block"></div>
            <div>
              <div class="text-2xl font-black text-slate-900">{event.sqm}</div>
              <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">M² Construcción</div>
            </div>
          </div>
        </div>

        <!-- Beneficio Premium -->
        {#if event.benefit}
          <div class="bg-indigo-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo-900/10">
            <div class="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl pointer-events-none"></div>
            <h4 class="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2 relative z-10">Incentivo de Asistencia</h4>
            <p class="text-lg font-medium leading-relaxed relative z-10">{event.benefit}</p>
          </div>
        {/if}

        <!-- Descripción Editorial -->
        <div>
          <h3 class="text-lg font-black text-slate-900 mb-6">Acerca del Inmueble</h3>
          <p class="text-base text-slate-600 leading-relaxed font-medium whitespace-pre-line text-justify">
            {event.description}
          </p>
        </div>

        <!-- Tarjeta del Asesor -->
        <div class="flex items-center gap-6 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm mt-8">
          <div class="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black">
            {event.agent?.avatar || 'IN'}
          </div>
          <div>
            <h4 class="text-lg font-black text-slate-900">{event.agent?.name}</h4>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{event.agent?.specialty || 'Asesor Inmobiliario'}</p>
          </div>
        </div>

      </div>

      <!-- COLUMNA DERECHA: Formulario Sticky -->
      <div class="lg:col-span-5 relative w-full sticky top-10">
        
        {#if eventStatus === 'ended'}
          <div class="bg-white rounded-[2rem] p-10 text-center shadow-xl border border-slate-200">
            <div class="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 class="text-2xl font-black text-slate-900 mb-2">Evento Concluido</h3>
            <p class="text-slate-500 font-medium mb-8">El Open House ha finalizado, pero aún puedes solicitar información de la propiedad.</p>
            <a href="https://wa.me/{event.agent?.whatsapp}" target="_blank" class="block w-full bg-slate-900 text-white font-bold py-4 rounded-xl transition-all hover:bg-slate-800">
              Contactar Asesor
            </a>
          </div>
        {:else}
          <!-- Inicio del Formulario Activo -->
          <div class="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            
            <!-- Encabezado del Formulario -->
            <div class="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
              <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5 blur-2xl pointer-events-none"></div>
              <h3 class="text-2xl font-black tracking-tight mb-4 relative z-10">
                {isFull ? 'Lista de Espera' : 'Asegura tu Acceso'}
              </h3>
              <div class="flex flex-col items-center justify-center relative z-10">
                <p class="text-xs font-medium text-slate-300">
                  <strong class="text-white font-bold">{attendees.length}</strong> Registros validados
                </p>
                <p class="text-xs font-bold uppercase tracking-widest mt-2 px-3 py-1 rounded-full border border-white/20 {spotsLeft <= 3 ? 'text-amber-400 border-amber-400/30' : 'text-emerald-400 border-emerald-400/30'}">
                  {isFull ? 'Cupo Lleno' : `${spotsLeft} Lugares Disponibles`}
                </p>
              </div>
            </div>

            <!-- Cuerpo del Formulario -->
            <div class="p-8">
              {#if showSuccess}
                <div class="text-center py-8 transition-opacity duration-500">
                  <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <h3 class="text-2xl font-black text-slate-900 mb-3">Lugar Reservado</h3>
                  <p class="text-sm text-slate-500 font-medium mb-8 leading-relaxed">Hemos registrado tu acceso VIP. Un concierge de Inmublia se comunicará contigo vía WhatsApp.</p>
                  <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" class="block w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black uppercase tracking-widest py-4 rounded-xl transition-colors shadow-lg shadow-[#25D366]/20 text-center">
                    Abrir WhatsApp
                  </a>
                </div>
              {:else}
                <form method="POST" action="?/rsvp" use:enhance={() => {
                  submitting = true; return async ({ result }) => { submitting = false; if (result.type === 'success') showSuccess = true; };
                }} class="space-y-5">
                  <input type="hidden" name="status" value={isFull ? 'waitlist' : 'confirmed'}>
                  
                  <div>
                    <input type="text" name="name" required placeholder="Nombre Completo *" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all" />
                  </div>

                  <div>
                    <input type="tel" name="phone" required placeholder="Teléfono de Contacto *" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all" />
                  </div>

                  <div>
                    <select name="intent" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all appearance-none cursor-pointer">
                      <option value="" disabled selected>Motivo de su registro *</option>
                      <option value="Comprar">Adquisición / Residencia propia</option>
                      <option value="Invertir">Inversión / Portafolio</option>
                      <option value="Rentar">Arrendamiento</option>
                      <option value="Solo conocer">Asesor Inmobiliario / Colega</option>
                    </select>
                  </div>

                  <button type="submit" disabled={submitting} class="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg mt-4 flex justify-center items-center gap-2">
                    {#if submitting}
                      Procesando...
                    {:else if isFull}
                      Unirme a lista de espera
                    {:else}
                      Solicitar Invitación
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    {/if}
                  </button>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mt-6">
                    🔒 Datos encriptados y confidenciales
                  </p>
                </form>
              {/if}
            </div>
          </div>
          <!-- Fin del Formulario Activo -->
        {/if}
      </div>

    </div>
  </main>

  <footer class="bg-slate-900 py-12 text-center text-white/50 text-xs mt-24">
    <p class="font-bold tracking-widest uppercase">Powered by <span class="text-white">Inmublia</span></p>
  </footer>

</div>
