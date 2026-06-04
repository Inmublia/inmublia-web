<script>
  /**
   * INMUBLIA — Open House Digital (Edición Luxury 2026)
   * Svelte 5 · Runes syntax
   */
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';

  let {
    event = {},
    attendeesDb = [],
    agentMode = false,
  } = $props();

  let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let eventStatus = $state('upcoming'); 
  let currentPhoto = $state(0);
  let showSuccess = $state(false);
  let showCheckin = $state(false);
  let activeTab = $state('overview');

  let attendees = $derived(attendeesDb);
  let spotsLeft = $derived(event.maxCapacity - attendees.length);
  let isFull = $derived(spotsLeft <= 0);

  let form = $state({ name: '', phone: '', intent: '', budget: '' });
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
    encodeURIComponent(
      `Hola ${event.agent?.name}, solicito el acceso privado de alta prioridad para el Open House de la propiedad de colección "${event.title}".`
    )
  );

  let shareMsg = $derived(
    encodeURIComponent(
      `🏛️ Inmublia Portfolio · Private Open House: ${event.title}\n📅 ${formattedDate}\n✨ Cupo estrictamente restringido. Registra tus credenciales aquí: https://${event.agent?.url}/open-house/${event.id}`
    )
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

  const avatarColors = ['#0A0A0A', '#1A1A1A', '#2A2A2A', '#8C7034', '#D4AF37'];
</script>
{#if !agentMode}
<div class="inmublia-public-wrapper animate-fade-in">
  {#if eventStatus === 'live'}
    <div class="luxury-banner live">
      <span class="live-pulse-ring"></span> TRANSMISIÓN EXCLUSIVA EN VIVO · {event.timeStart} – {event.timeEnd}
    </div>
  {:else if eventStatus === 'today'}
    <div class="luxury-banner today">CONVOCATORIA ACTIVA · ACCESO AUTORIZADO HOY</div>
  {/if}

  <div class="hero-editorial-gallery">
    <div class="gallery-viewport">
      {#if event.photos && event.photos.length > 0}
        <img src={event.photos[currentPhoto]} alt="Inmublia Premium Estate" class="gallery-main-asset" />
      {/if}
      <div class="gallery-vignette"></div>
      
      {#if event.photos && event.photos.length > 1}
        <button class="gallery-nav-arrow prev" onclick={prevPhoto} aria-label="Anterior">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button class="gallery-nav-arrow next" onclick={nextPhoto} aria-label="Siguiente">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>
        </button>
        <div class="gallery-bar-indicators">
          {#each event.photos as _, i}
            <span class="indicator-bar {i === currentPhoto ? 'active' : ''}"></span>
          {/each}
        </div>
      {/if}
    </div>

    <div class="hero-meta-block">
      <div class="editorial-badge-tag">LAUNCH PRIVADO — {formattedDate}</div>
      <h1 class="estate-luxury-title">{event.title}</h1>
      <p class="estate-time-schedule">Convocatoria: {event.timeStart} hrs a {event.timeEnd} hrs · Agenda Cerrada</p>
    </div>
  </div>

  {#if eventStatus === 'upcoming' || eventStatus === 'today'}
    <div class="luxury-countdown-container">
      <p class="countdown-editorial-label">Apertura del Portal de Acceso</p>
      <div class="inmublia-countdown-grid">
        {#each [
          { val: countdown.days, label: 'DÍAS' },
          { val: countdown.hours, label: 'HORAS' },
          { val: countdown.minutes, label: 'MINUTOS' },
          { val: countdown.seconds, label: 'SEGUNDOS' }
        ] as unit}
          <div class="countdown-luxury-box">
            <div class="countdown-digits">{String(unit.val).padStart(2, '0')}</div>
            <div class="countdown-unit-meta">{unit.label}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="luxury-editorial-body">
    <div class="price-architecture-row">
      <div class="luxury-price">{formattedPrice} <span class="currency-code">MXN</span></div>
      <p class="editorial-location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline mr-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        {event.address}
      </p>
    </div>
    
    <div class="architectural-specs-row">
      <div class="spec-editorial-item"><strong>{event.bedrooms}</strong> RECÁMARAS</div>
      <div class="spec-editorial-item"><strong>{event.bathrooms}</strong> BAÑOS</div>
      <div class="spec-editorial-item"><strong>{event.sqm}</strong> M² CONSTRUCCIÓN</div>
    </div>

    {#if event.benefit}
      <div class="inmublia-amenity-card">
        <div class="amenity-accent-line"></div>
        <div class="amenity-content">
          <h4 class="amenity-card-header">Beneficio Exclusivo de Asistencia</h4>
          <p class="amenity-card-body">{event.benefit}</p>
        </div>
      </div>
    {/if}

    <p class="estate-long-description">{event.description}</p>
  </div>

  {#if eventStatus !== 'ended'}
    <div class="inmublia-rsvp-form-anchor">
      {#if showSuccess}
        <div class="luxury-success-viewport">
          <div class="success-gold-circle">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h3 class="success-luxury-title">Acceso Concedido</h3>
          <p class="success-luxury-text">Tus credenciales han sido cifradas e incorporadas a la lista privada. Un concierge de Inmublia se comunicará contigo de inmediato para validar el ingreso.</p>
          <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" rel="noopener noreferrer" class="btn-inmublia-primary mt-8">Contactar Concierge Vía WhatsApp</a>
        </div>
      {:else}
<div class="min-h-screen bg-zinc-50 flex font-sans text-slate-900 selection:bg-indigo-100 animate-fade-in">
  
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
      <a href="/admin/leads" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>
      <a href="/admin/perfil" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-xl font-bold transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        Configuración
      </a>
    </nav>
    <div class="p-6 border-t border-slate-100 bg-white">
      <div class="px-2 py-2 text-sm font-bold text-slate-900 truncate">{event.agent?.name || 'Usuario'}</div>
      <form action="/logout" method="POST">
        <button type="submit" class="flex items-center gap-3 px-2 py-2 text-slate-500 hover:text-red-600 font-medium transition-colors w-full text-left text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          Cerrar Sesión
        </button>
      </form>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    
    <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
      <div class="flex items-center">
        <a href="/admin" class="text-slate-400 hover:text-indigo-600 transition-colors mr-6 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-xl border border-slate-200" title="Volver al Inventario">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </a>
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight">{event.title}</h1>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Dashboard del Open House</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        {#if eventStatus === 'live'}
          <span class="px-4 py-2 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase tracking-widest border border-red-200 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> En Vivo
          </span>
        {:else if eventStatus === 'today'}
          <span class="px-4 py-2 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase tracking-widest border border-amber-200">
            Sucede Hoy
          </span>
        {:else if eventStatus === 'upcoming'}
          <span class="px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-widest border border-indigo-200">
            Próximo
          </span>
        {:else}
          <span class="px-4 py-2 rounded-full bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-widest border border-slate-200">
            Finalizado
          </span>
        {/if}
      </div>
    </header>

    <div class="p-10 flex-1 overflow-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Prospectos Registrados</p>
          <p class="text-3xl font-black text-slate-900">{attendees.length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Capacidad: {event.maxCapacity}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accesos en Propiedad</p>
          <p class="text-3xl font-black text-emerald-600">{attendees.filter(a => a.checked_in).length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Check-in físico validado</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Leads Alta Intención</p>
          <p class="text-3xl font-black text-amber-600">{attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Patrimonial/Inversor</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lista de Espera</p>
          <p class="text-3xl font-black text-slate-500">{attendees.filter(a => a.status === 'waitlist').length}</p>
          <p class="text-xs text-slate-500 font-medium mt-2">Pendientes de cupo</p>
        </div>
      </div>

      <div class="flex gap-4 border-b border-slate-200 mb-8 pb-4">
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'overview'}>Difusión Comercial</button>
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'attendees' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'attendees'}>Asistentes ({attendees.length})</button>
        <button class="px-6 py-2.5 rounded-full font-bold text-sm transition-colors {activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}" onclick={() => activeTab = 'analytics'}>Analíticas</button>
      </div>

      {#if activeTab === 'overview'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
             <h3 class="text-lg font-black text-slate-900 mb-2">Canales de Difusión Directa</h3>
             <p class="text-sm text-slate-500 font-medium mb-8">Utiliza estos enlaces para promover el evento exclusivo en tus redes.</p>
             
             <div class="flex flex-col gap-4">
               <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-[#25D366]/20">
                 <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                 Compartir Invitación Privada
               </a>
               <button class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200" onclick={() => { navigator.clipboard.writeText(`https://${event.agent?.url}/open-house/${event.id}`); alert('Enlace de la Landing Pública copiado.'); }}>
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                 Copiar Enlace de Landing
               </button>
               <button class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200" onclick={() => showCheckin = !showCheckin}>
                 <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                 {showCheckin ? 'Ocultar QR de Puerta' : 'Desplegar QR de Puerta'}
               </button>
             </div>
          </div>
          {#if showCheckin}
            <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 flex flex-col items-center justify-center text-center animate-fade-in">
              <h4 class="text-lg font-black text-slate-900 mb-2">Código QR de Autoregistro</h4>
              <p class="text-sm text-slate-500 font-medium mb-6">Muestra esto en la entrada de la casa para que los prospectos escaneen y liberen su acceso físico.</p>
              <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm mb-4">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodeURIComponent(`https://${event.agent?.url}/open-house/${event.id}/checkin`)}&format=png&margin=0" alt="QR" class="w-40 h-40">
              </div>
              <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-lg">ID: {event.id}</span>
            </div>
          {/if}
        </div>

      {:else if activeTab === 'attendees'}
        <div class="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden">
          <div class="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 class="text-lg font-black text-slate-900">Prospectos Registrados</h3>
            <button class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm" onclick={() => {
              const rows = [['Nombre', 'WhatsApp', 'Objetivo Comercial', 'Presupuesto', 'Check-In Físico', 'Estatus Base']];
              attendees.forEach(a => rows.push([a.name, a.phone, a.intent, a.budget || 'N/A', a.checked_in ? 'SÍ' : 'NO', a.status]));
              const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
              window.open(encodeURI(csvContent));
            }}>Exportar a CSV</button>
          </div>
          <table class="w-full divide-y divide-slate-100 table-fixed">
            <thead class="bg-white">
              <tr>
                <th scope="col" class="w-3/12 px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prospecto</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Perfil</th>
                <th scope="col" class="w-2/12 px-4 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estatus</th>
                <th scope="col" class="w-3/12 px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              {#each attendees as att}
                <tr class="hover:bg-slate-50/80 transition-colors {att.checked_in ? 'bg-emerald-50/30' : ''}">
                  <td class="px-8 py-4 truncate">
                    <div class="flex items-center gap-3">
                      <img src="https://ui-avatars.com/api/?name={att.name}&background=0f172a&color=fff" alt="Avatar" class="w-8 h-8 rounded-full shadow-sm">
                      <div class="font-bold text-sm text-slate-900">{att.name}</div>
                    </div>
                  </td>
                  <td class="px-4 py-4 truncate font-mono text-xs text-slate-600">{att.phone}</td>
                  <td class="px-4 py-4 truncate">
                    {#if att.intent === 'Comprar'}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-amber-100 text-amber-800">Comprar</span>
                    {:else if att.intent === 'Invertir'}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-blue-100 text-blue-800">Invertir</span>
                    {:else}
                      <span class="px-2.5 py-1 inline-flex text-[10px] font-bold uppercase tracking-widest rounded-full bg-slate-100 text-slate-600">{att.intent}</span>
                    {/if}
                  </td>
                  <td class="px-4 py-4 truncate">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full {att.checked_in ? 'bg-emerald-500' : 'bg-slate-300'}"></span>
                      <span class="text-xs font-bold {att.checked_in ? 'text-emerald-700' : 'text-slate-500'}">{att.checked_in ? 'Ingresó' : 'Pendiente'}</span>
                    </div>
                  </td>
                  <td class="px-8 py-4 text-right">
                    <div class="flex gap-2 justify-end">
                      {#if att.status === 'waitlist'}
                        <form method="POST" action="?/admitir" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-indigo-200">Admitir</button>
                        </form>
                      {/if}
                      {#if !att.checked_in}
                        <form method="POST" action="?/checkin" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm">Check-in</button>
                        </form>
                      {/if}
                      <a href="https://wa.me/{att.phone.replace(/\D/g, '')}?text={encodeURIComponent('Hola ' + att.name.split(' ')[0] + ', soy tu asesor de Inmublia. Te escribo sobre tu registro al Open House privado.')}" target="_blank" rel="noopener noreferrer" class="text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors border border-slate-200">
                        WP
                      </a>
                    </div>
                  </td>
                </tr>
              {/each}
              {#if attendees.length === 0}
                <tr>
                  <td colspan="5" class="text-center py-12 text-slate-400 font-medium">Ningún prospecto ha solicitado acceso.</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>

      {:else if activeTab === 'analytics'}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Conversión Comercial (Proyección)</h4>
            <div class="text-5xl font-black text-slate-900 mb-4 tracking-tight">
              {attendees.length > 0 ? ((attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length / attendees.length) * 100).toFixed(0) : 0}%
            </div>
            <p class="text-sm text-slate-500 font-medium leading-relaxed">Porcentaje total de la audiencia que cuenta con intenciones directas de compra de capital o inversión corporativa sobre el activo.</p>
          </div>
          <div class="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200">
            <h4 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Eficiencia del Evento</h4>
            <div class="flex flex-col gap-4">
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Ocupación del Aforo Máximo</span>
                <span class="text-base font-black text-slate-900">{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</span>
              </div>
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Show-Rate (Asistencia Real)</span>
                <span class="text-base font-black text-slate-900">{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</span>
              </div>
              <div class="flex justify-between items-center border-b border-slate-100 pb-3">
                <span class="text-sm text-slate-600 font-medium">Pérdida por Lista de Espera</span>
                <span class="text-base font-black text-amber-600">{attendees.filter(a => a.status === 'waitlist').length} leads</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>
{/if}

<style>
  /* --- HOJA DE ESTILO PÚBLICA INMUBLIA LUXURY THEME --- */
  :root {
    --inmublia-black: #0A0A0A;
    --inmublia-dark: #121212;
    --inmublia-gold: #B89848;
    --inmublia-slate: #1E293B;
    --inmublia-gray-bg: #F8F9FA;
    --inmublia-border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .animate-fade-in { animation: inmubliaFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes inmubliaFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .inmublia-public-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FFFFFF; min-height: 100vh; max-width: 480px; margin: 0 auto; color: var(--inmublia-black); border-left: var(--inmublia-border); border-right: var(--inmublia-border); }
  .luxury-banner { padding: 14px; font-size: 10px; font-weight: 700; text-align: center; letter-spacing: 0.18em; }
  .luxury-banner.live { background: #991B1B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .luxury-banner.today { background: var(--inmublia-gold); color: #FFFFFF; }

  .live-pulse-ring { width: 6px; height: 6px; background: white; border-radius: 50%; animation: pulseRing 1.4s infinite; }
  @keyframes pulseRing { 0% { transform: scale(0.9); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.3; } 100% { transform: scale(0.9); opacity: 1; } }

  .hero-editorial-gallery { position: relative; background: var(--inmublia-black); }
  .gallery-viewport { position: relative; height: 380px; overflow: hidden; }
  .gallery-main-asset { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gallery-vignette { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.9) 100%); }
  
  .gallery-nav-arrow { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.4); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); transition: background 0.2s; }
  .gallery-nav-arrow:hover { background: rgba(0,0,0,0.7); }
  .gallery-nav-arrow.prev { left: 16px; }
  .gallery-nav-arrow.next { right: 16px; }
  
  .gallery-bar-indicators { position: absolute; bottom: 130px; left: 24px; display: flex; gap: 4px; z-index: 10; right: 24px; }
  .indicator-bar { flex: 1; height: 2px; background: rgba(255,255,255,0.25); transition: background 0.3s; }
  .indicator-bar.active { background: var(--inmublia-gold); }

  .hero-meta-block { position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 24px; color: #FFFFFF; }
  .editorial-badge-tag { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: 0.2em; color: var(--inmublia-gold); margin-bottom: 12px; text-transform: uppercase; }
  .estate-luxury-title { font-size: 26px; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; margin: 0 0 8px 0; }
  .estate-time-schedule { font-size: 12px; color: rgba(255,255,255,0.65); margin: 0; letter-spacing: 0.02em; }

  .luxury-countdown-container { background: var(--inmublia-gray-bg); padding: 28px 24px; text-align: center; border-bottom: var(--inmublia-border); }
  .countdown-editorial-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #64748B; margin: 0 0 16px 0; }
  .inmublia-countdown-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; max-width: 26rem; margin: 0 auto; }
  .countdown-luxury-box { border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
  .countdown-digits { font-size: 32px; font-weight: 700; letter-spacing: -0.04em; color: var(--inmublia-black); font-variant-numeric: tabular-nums; }
  .countdown-unit-meta { font-size: 8px; font-weight: 600; color: #94A3B8; letter-spacing: 0.08em; margin-top: 4px; }

  .luxury-editorial-body { padding: 40px 24px; border-bottom: var(--inmublia-border); }
  .price-architecture-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 28px; flex-wrap: wrap; gap: 8px; }
  .luxury-price { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: var(--inmublia-black); }
  .currency-code { font-size: 13px; font-weight: 400; color: #64748B; margin-left: 2px; }
  .editorial-location { font-size: 13px; font-weight: 500; color: #475569; margin: 0; }
  
  .architectural-specs-row { display: flex; gap: 24px; margin-bottom: 32px; border-bottom: var(--inmublia-border); padding-bottom: 20px; }
  .spec-editorial-item { font-size: 11px; font-weight: 500; color: #475569; letter-spacing: 0.05em; }
  .spec-editorial-item strong { color: var(--inmublia-black); font-size: 14px; margin-right: 4px; }
  
  .inmublia-amenity-card { background: #FAF9F5; border: 1px solid #E6DFD3; padding: 20px; display: flex; gap: 16px; margin-bottom: 32px; position: relative; }
  .amenity-accent-line { width: 3px; background: var(--inmublia-gold); position: absolute; left: 0; top: 0; bottom: 0; }
  .amenity-card-header { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--inmublia-gold); margin: 0 0 6px 0; }
  .amenity-card-body { font-size: 12.5px; color: #5C5446; margin: 0; line-height: 1.5; font-weight: 500; }
  
  .estate-long-description { font-size: 14.5px; color: #334155; line-height: 1.7; margin: 0; text-align: justify; letter-spacing: -0.005em; }

  .inmublia-rsvp-form-anchor { padding: 40px 24px; background: var(--inmublia-gray-bg); border-bottom: var(--inmublia-border); }
  .form-header-editorial { margin-bottom: 28px; }
  .form-editorial-title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 12px 0; }
  .social-validation-strip { display: flex; align-items: center; gap: 12px; }
  .premium-avatar-stack { display: flex; }
  .luxury-mini-avatar { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--inmublia-gray-bg); margin-right: -8px; }
  .validation-strip-text { font-size: 12px; color: #475569; margin: 0; letter-spacing: 0.01em; }

  .inmublia-interactive-form { display: flex; flex-direction: column; gap: 14px; }
  .luxury-input-wrapper { position: relative; }
  .inmublia-input-ui, .inmublia-select-ui { width: 100%; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 0px; padding: 14px 16px; font-size: 13.5px; font-weight: 500; color: var(--inmublia-black); outline: none; box-sizing: border-box; appearance: none; transition: border-color 0.2s; }
  .inmublia-input-ui:focus, .inmublia-select-ui:focus { border-color: var(--inmublia-black); }
  .inmublia-select-ui { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; background-size: 16px; padding-right: 40px; }
  
  .btn-inmublia-primary { width: 100%; background: var(--inmublia-black); color: #FFFFFF; border: none; border-radius: 0px; padding: 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; transition: background 0.2s; text-decoration: none; text-align: center; box-sizing: border-box; display: inline-block; }
  .btn-inmublia-primary:hover { background: #262626; }
  .form-privacy-disclaimer { font-size: 11px; color: #94A3B8; text-align: center; margin: 12px 0 0 0; font-weight: 500; }

  .luxury-success-viewport { text-align: center; padding: 24px 0; }
  .success-gold-circle { width: 60px; height: 60px; background: #F5E1B8; color: var(--inmublia-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
  .success-luxury-title { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; letter-spacing: -0.01em; }
  .success-luxury-text { font-size: 14px; color: #475569; line-height: 1.6; margin: 0; }

  .luxury-agent-card-section { padding: 40px 24px; background: #FFFFFF; border-bottom: var(--inmublia-border); }
  .agent-profile-layout { display: flex; align-items: center; gap: 18px; margin-bottom: 24px; }
  .agent-avatar-luxury-frame { width: 56px; height: 56px; background: var(--inmublia-black); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 15px; letter-spacing: 0.05em; }
  .agent-luxury-name { font-size: 16px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: -0.01em; }
  .agent-luxury-title-label { font-size: 12px; color: #64748B; margin: 0; font-weight: 500; }
  .agent-stars-row { font-size: 11px; color: var(--inmublia-gold); margin-top: 4px; }
  .numerical-rating { color: #64748B; margin-left: 4px; font-weight: bold; }
  .agent-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  
  .btn-inmublia-secondary { background: #FFFFFF; border: 1px solid #E2E8F0; color: var(--inmublia-black); border-radius: 0px; padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; text-decoration: none; transition: all 0.2s; text-align: center; box-sizing: border-box; }
  .btn-inmublia-secondary:hover { background: var(--inmublia-gray-bg); border-color: var(--inmublia-black); }

  .physical-access-qr-section { display: flex; align-items: center; gap: 20px; padding: 32px 24px; background: var(--inmublia-gray-bg); border-bottom: var(--inmublia-border); }
  .qr-luxury-frame { padding: 14px; background: white; border: var(--inmublia-border); border-radius: 0px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .qr-section-header { font-size: 13px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: -0.01em; }
  .qr-section-body { font-size: 11.5px; color: #64748B; margin: 0; line-height: 1.5; font-weight: 500; }

  .inmublia-luxury-footer { background: var(--inmublia-black); color: #FFFFFF; text-align: center; padding: 32px 24px; font-size: 11px; letter-spacing: 0.05em; }
  .footer-brand-highlight { color: var(--inmublia-gold); font-weight: 700; }
  .footer-domain-sub { color: #475569; margin: 6px 0 0 0; font-family: monospace; font-size: 10px; }
</style>
