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

<div class="min-h-screen bg-zinc-50 text-slate-900 font-sans selection:bg-indigo-100 pb-20">
  
  <header class="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
    <div class="font-black text-lg tracking-tight text-slate-900 flex items-center gap-2">
      <div class="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs">
        {event.agent?.name?.substring(0, 2).toUpperCase() || 'IN'}
      </div>
      {event.agent?.name || 'Inmublia'}
    </div>
    <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
      Open House
    </div>
  </header>

  <main class="max-w-2xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
    
    {#if eventStatus === 'live'}
      <div class="bg-red-50 text-red-600 border border-red-100 rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest shadow-sm">
        <span class="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        En Vivo: Ingreso Abierto
      </div>
    {:else if eventStatus === 'today'}
      <div class="bg-amber-50 text-amber-700 border border-amber-100 rounded-2xl p-4 flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest shadow-sm">
        El Evento Es Hoy
      </div>
    {/if}

    <div class="bg-white rounded-[2rem] p-3 shadow-sm border border-slate-200 overflow-hidden relative">
      <div class="relative h-72 sm:h-96 w-full rounded-[1.5rem] overflow-hidden bg-slate-100 group">
        {#if event.photos && event.photos.length > 0}
          <img src={event.photos[currentPhoto]} alt="Propiedad" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        {/if}
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
        
        {#if event.photos && event.photos.length > 1}
          <button class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors" onclick={prevPhoto}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <button class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors" onclick={nextPhoto}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        {/if}

        <div class="absolute bottom-6 left-6 right-6 text-white">
          <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 border border-white/10">
            Lanzamiento Exclusivo
          </span>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight leading-tight shadow-sm">{event.title}</h1>
        </div>
      </div>
      
      <div class="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="text-2xl font-black text-slate-900">{formattedPrice}</div>
          <div class="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            {event.address}
          </div>
        </div>
        <div class="flex gap-3">
          <div class="bg-slate-50 px-4 py-2 rounded-xl text-center border border-slate-100">
            <div class="text-sm font-black text-slate-900">{event.bedrooms}</div>
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recs</div>
          </div>
          <div class="bg-slate-50 px-4 py-2 rounded-xl text-center border border-slate-100">
            <div class="text-sm font-black text-slate-900">{event.bathrooms}</div>
            <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Baños</div>
          </div>
        </div>
      </div>
    </div>

    {#if eventStatus === 'upcoming' || eventStatus === 'today'}
      <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">El acceso se habilita en</p>
        <div class="flex justify-center gap-4 sm:gap-8">
          {#each [ { v: countdown.days, l: 'Días' }, { v: countdown.hours, l: 'Hrs' }, { v: countdown.minutes, l: 'Min' }, { v: countdown.seconds, l: 'Seg' } ] as unit}
            <div class="flex flex-col items-center">
              <span class="text-3xl sm:text-4xl font-black text-slate-900 tabular-nums tracking-tight">{String(unit.v).padStart(2, '0')}</span>
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{unit.l}</span>
            </div>
          {/each}
        </div>
        <div class="mt-6 inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 text-xs font-bold text-slate-600">
          <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {formattedDate} · {event.timeStart} a {event.timeEnd}
        </div>
      </div>
    {/if}

    <div class="space-y-4">
      {#if event.benefit}
        <div class="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex gap-4">
          <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"></path></svg>
          </div>
          <div>
            <h4 class="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-1">Beneficio de Asistencia</h4>
            <p class="text-sm text-emerald-700 font-medium leading-relaxed">{event.benefit}</p>
          </div>
        </div>
      {/if}
      
      <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
        <h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Acerca de la Propiedad</h4>
        <p class="text-sm text-slate-600 leading-relaxed font-medium">{event.description}</p>
      </div>
    </div>

    {#if eventStatus !== 'ended'}
      <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden relative">
        <div class="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div class="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5 blur-2xl"></div>
          <h3 class="text-xl font-black mb-2 relative z-10">{isFull ? 'Lista de Espera' : 'Asegura tu Acceso'}</h3>
          <div class="flex items-center gap-3 relative z-10">
            <div class="flex -space-x-2">
              {#each [1, 2, 3] as i}
                <div class="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-400">👤</div>
              {/each}
            </div>
            <p class="text-xs font-medium text-slate-300">
              <strong class="text-white">{attendees.length}</strong> registrados · 
              <span class={spotsLeft <= 3 ? 'text-amber-400 font-bold' : ''}>{isFull ? 'Cupo Lleno' : `${spotsLeft} lugares disponibles`}</span>
            </p>
          </div>
        </div>

        <div class="p-8">
          {#if showSuccess}
            <div class="text-center py-6 animate-fade-in">
              <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 class="text-xl font-black text-slate-900 mb-2">¡Lugar Reservado!</h3>
              <p class="text-sm text-slate-500 font-medium mb-6">Hemos registrado tu invitación. El asesor se pondrá en contacto para enviarte tu acceso.</p>
              <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" class="block w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm">
                Confirmar vía WhatsApp
              </a>
            </div>
          {:else}
            <form method="POST" action="?/rsvp" use:enhance={() => {
              submitting = true; return async ({ result }) => { submitting = false; if (result.type === 'success') showSuccess = true; };
            }} class="space-y-4">
              <input type="hidden" name="status" value={isFull ? 'waitlist' : 'confirmed'}>
              
              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                <input type="text" name="name" required placeholder="Ej. Juan Pérez" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">WhatsApp</label>
                <input type="tel" name="phone" required placeholder="Ej. 33 1234 5678" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all" />
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Objetivo</label>
                <select name="intent" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all appearance-none cursor-pointer">
                  <option value="">Selecciona una opción...</option>
                  <option value="Comprar">Quiero comprar</option>
                  <option value="Invertir">Busco invertir</option>
                  <option value="Rentar">Me interesa rentar</option>
                  <option value="Solo conocer">Solo quiero conocer</option>
                </select>
              </div>

              <button type="submit" disabled={submitting} class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-200 mt-2 flex justify-center items-center gap-2">
                {#if submitting}
                  Procesando...
                {:else if isFull}
                  Unirme a la lista de espera
                {:else}
                  Asegurar mi lugar
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                {/if}
              </button>
              <p class="text-[10px] font-medium text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                Tus datos están protegidos por la agencia.
              </p>
            </form>
          {/if}
        </div>
      </div>
    {/if}
  </main>
</div>
