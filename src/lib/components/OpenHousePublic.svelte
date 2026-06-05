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
