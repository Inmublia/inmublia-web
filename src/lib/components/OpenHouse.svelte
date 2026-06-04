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
        <div class="form-header-editorial">
          <h3 class="form-editorial-title">{isFull ? 'Lista de Espera de Alta Prioridad' : 'Confirmar Registro Privado'}</h3>
          <div class="social-validation-strip">
            <div class="premium-avatar-stack">
              {#each [0, 1, 2, 3] as i}
                <div class="luxury-mini-avatar" style="background: {avatarColors[i]}; z-index: {4 - i}"></div>
              {/each}
            </div>
            <p class="validation-strip-text">
              <strong>{attendees.length} Miembros Registrados</strong> · 
              <span class={spotsLeft <= 3 ? 'text-gold-accent font-bold' : ''}>
                {isFull ? 'Cupo Completo' : `${spotsLeft} Invitaciones Disponibles`}
              </span>
            </p>
          </div>
        </div>

        <form method="POST" action="?/rsvp" use:enhance={() => {
          submitting = true;
          return async ({ result }) => {
            submitting = false;
            if (result.type === 'success') showSuccess = true;
          };
        }} class="inmublia-interactive-form">
          <input type="hidden" name="status" value={isFull ? 'waitlist' : 'confirmed'}>
          <div class="luxury-input-wrapper"><input type="text" name="name" required placeholder="Nombre Completo *" class="inmublia-input-ui" /></div>
          <div class="luxury-input-wrapper"><input type="tel" name="phone" required placeholder="Teléfono / WhatsApp Instantáneo *" class="inmublia-input-ui" /></div>
          <div class="luxury-input-wrapper">
            <select name="intent" required class="inmublia-select-ui">
              <option value="">¿Cuál es tu objetivo de adquisición? *</option>
              <option value="Comprar">Adquisición Inmediata Patrimonial</option>
              <option value="Invertir">Inversión de Alta Rentabilidad / Portafolio</option>
              <option value="Rentar">Arrendamiento Corporativo / Residencial</option>
              <option value="Solo conocer">Bróker Autorizado / Alianza Comercial</option>
            </select>
          </div>
          <div class="luxury-input-wrapper">
            <select name="budget" class="inmublia-select-ui">
              <option value="">Rango de Presupuesto (Opcional)</option>
              <option value="Menos de $5M">Menos de $5,000,000 MXN</option>
              <option value="$5M–$10M">$5,000,000 a $10,000,000 MXN</option>
              <option value="Más de $10M">Más de $10,000,000 MXN</option>
            </select>
          </div>
          <button type="submit" disabled={submitting} class="btn-inmublia-primary">
            {#if submitting}
              <span class="luxury-loading-bar"></span> Cifrando credenciales...
            {:else if isFull}
              Solicitar Entrada en Lista de Espera
            {:else}
              Emitir Invitación Digital Exclusiva
            {/if}
          </button>
          <p class="form-privacy-disclaimer">🔒 Sus datos están protegidos bajo protocolos de estricta confidencialidad de la agencia.</p>
        </form>
      {/if}
    </div>
  {/if}

  <div class="luxury-agent-card-section">
    <div class="agent-profile-layout">
      <div class="agent-avatar-luxury-frame">{event.agent?.avatar || 'IN'}</div>
      <div>
        <h4 class="agent-luxury-name">{event.agent?.name}</h4>
        <p class="agent-luxury-title-label">{event.agent?.specialty || 'Private Client Advisor'}</p>
        <div class="agent-stars-row"><span>★★★★★</span> <span class="numerical-rating">{event.agent?.rating || '5.0'}</span></div>
      </div>
    </div>
    <div class="agent-actions-grid">
      <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" rel="noopener noreferrer" class="btn-inmublia-secondary">Contactar Asesor</a>
      <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="btn-inmublia-secondary">Compartir Lanzamiento</a>
    </div>
  </div>

  <div class="physical-access-qr-section">
    <div class="qr-luxury-frame">
      <svg viewBox="0 0 100 100" class="w-8 h-8 text-black" aria-label="QR Code">
        <rect width="24" height="24" fill="currentColor"/><rect x="76" width="24" height="24" fill="currentColor"/><rect y="76" width="24" height="24" fill="currentColor"/><rect x="38" y="38" width="24" height="24" fill="currentColor"/>
      </svg>
    </div>
    <div>
      <h4 class="qr-section-header">Pase de Acceso Físico Automatizado</h4>
      <p class="qr-section-body">Al arribar a la residencia, presente este identificador digital o realice su Check-In automático con el concierge en puerta.</p>
    </div>
  </div>

  <footer class="inmublia-luxury-footer">
    <p>Powered by <span class="footer-brand-highlight">Inmublia</span> Technology Systems</p>
    <p class="footer-domain-sub">{event.agent?.url}</p>
  </footer>
</div>

{:else}
<div class="inmublia-dashboard-wrapper animate-fade-in">
  <div class="dashboard-luxury-header">
    <div>
      <p class="dashboard-pretitle-label">Consola de Control de Activos · Monitoreo Digital de Alta Prioridad</p>
      <h2 class="dashboard-luxury-title">{event.title}</h2>
      <p class="dashboard-luxury-subtitle">📍 Ubicación del Activo: {event.address}</p>
    </div>
    <span class="luxury-badge-status {eventStatus}">
      {eventStatus === 'upcoming' ? '⏳ Próximo' : ''}
      {eventStatus === 'today' ? '📅 Programado Hoy' : ''}
      {eventStatus === 'live' ? '🔴 En Vivo / Puertas Abiertas' : ''}
      {eventStatus === 'ended' ? '✅ Concluido' : ''}
    </span>
  </div>

  <div class="metrics-luxury-row">
    <div class="metric-luxury-card"><span class="metric-large-digit">{attendees.length}</span><span class="metric-card-title">Prospectos Registrados</span><span class="metric-card-sub text-slate-400">Capacidad Total Reservada: {event.maxCapacity}</span></div>
    <div class="metric-luxury-card"><span class="metric-large-digit text-emerald-600">{attendees.filter(a => a.checked_in).length}</span><span class="metric-card-title">Accesos en Propiedad</span><span class="metric-card-sub text-emerald-200">Check-In físico validado</span></div>
    <div class="metric-luxury-card"><span class="metric-large-digit text-amber-500">{attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length}</span><span class="metric-card-title">Leads de Alta Intención</span><span class="metric-card-sub text-amber-200">Clasificación Patrimonial/Inversor</span></div>
    <div class="metric-luxury-card"><span class="metric-large-digit text-slate-400">{attendees.filter(a => a.status === 'waitlist').length}</span><span class="metric-card-title">Lista de Espera</span><span class="metric-card-sub text-slate-500">Pendientes de liberación de cupo</span></div>
  </div>

  <div class="dashboard-navigation-tabs">
    <button class="dashboard-tab-btn {activeTab === 'overview' ? 'active' : ''}" onclick={() => activeTab = 'overview'}>Canales de Difusión</button>
    <button class="dashboard-tab-btn {activeTab === 'attendees' ? 'active' : ''}" onclick={() => activeTab = 'attendees'}>Listado de Interesados ({attendees.length})</button>
    <button class="dashboard-tab-btn {activeTab === 'analytics' ? 'active' : ''}" onclick={() => activeTab = 'analytics'}>Métricas Avanzadas</button>
  </div>

  {#if activeTab === 'overview'}
    <div class="dashboard-tab-content grid-split-layout">
      <div class="luxury-control-panel-box">
        <h3 class="panel-box-header-title">Enlaces Oficiales de Difusión Premium</h3>
        <p class="panel-box-header-sub">Gestione el embudo de marketing de alta gama compartiendo los accesos directos validados.</p>
        <div class="panel-actions-vertical-stack">
          <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="btn-inmublia-primary text-xs tracking-wider">Distribuir Lanzamiento Privado en WhatsApp</a>
          <button class="btn-inmublia-secondary text-xs tracking-wider font-bold" onclick={() => { navigator.clipboard.writeText(`https://${event.agent?.url}/open-house/${event.id}`); alert('Enlace cifrado de la Landing Pública copiado al portapapeles.'); }}>Copiar Enlace de la Landing Pública</button>
          <button class="btn-inmublia-secondary text-xs tracking-wider font-bold" onclick={() => showCheckin = !showCheckin}>{showCheckin ? 'Ocultar Código de Puerta' : 'Desplegar Código QR de Acceso Físico'}</button>
        </div>
      </div>
      {#if showCheckin}
        <div class="luxury-control-panel-box flex flex-col items-center justify-center text-center animate-fade-in">
          <h4 class="panel-box-header-title">Código QR Oficial para Entrada de Inmueble</h4>
          <p class="panel-box-header-sub max-w-sm mx-auto">Imprima o coloque este gráfico en el acceso exterior del inmueble para permitir el check-in autónomo de los invitados.</p>
          <div class="qr-display-container">
            <svg viewBox="0 0 100 100" class="w-32 h-32 text-black" aria-label="Código QR Físico"><rect width="25" height="25"/><rect x="75" width="25" height="25"/><rect y="75" width="25" height="25"/><rect x="35" y="35" width="30" height="30"/></svg>
          </div>
          <span class="qr-system-token">ID: open-house/{event.id}/checkin</span>
        </div>
      {/if}
    </div>
  {:else if activeTab === 'attendees'}
    <div class="dashboard-tab-content">
      <div class="luxury-table-container">
        <div class="table-actions-header">
          <h3 class="panel-box-header-title">Inversores y Prospectos Registrados</h3>
          <button class="btn-inmublia-secondary text-xs tracking-wider font-bold px-4 py-2" onclick={() => {
            const rows = [['Nombre', 'WhatsApp', 'Objetivo Comercial', 'Presupuesto', 'Check-In Físico', 'Estatus Base']];
            attendees.forEach(a => rows.push([a.name, a.phone, a.intent, a.budget || 'N/A', a.checked_in ? 'SÍ' : 'NO', a.status]));
            const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
            window.open(encodeURI(csvContent));
          }}>Exportar Base de Datos (CSV)</button>
        </div>
        <div class="luxury-table-overflow-frame">
          <table class="inmublia-editorial-table">
            <thead>
              <tr><th>Nombre del Candidato</th><th>Línea de Contacto</th><th>Perfil Comercial</th><th>Capacidad Presupuestaria</th><th>Estatus de Acceso</th><th class="text-right">Acciones Operativas</th></tr>
            </thead>
            <tbody>
              {#each attendees as att}
                <tr class="{att.intent === 'Comprar' || att.intent === 'Invertir' ? 'luxury-row-vip' : ''} {att.checked_in ? 'luxury-row-checked' : ''}">
                  <td class="font-bold text-black">{att.name}</td>
                  <td class="font-mono text-xs tracking-wider">{att.phone}</td>
                  <td><span class="luxury-intent-badge {att.intent}">{att.intent}</span></td>
                  <td class="font-medium text-slate-600">{att.budget || 'No Declarado'}</td>
                  <td><div class="flex items-center gap-2"><span class="status-dot-indicator {att.checked_in ? 'checked' : ''}"></span><span class="text-xs font-bold text-slate-800">{att.checked_in ? 'Dentro de la Propiedad' : 'No ha Ingresado'}</span></div></td>
                  <td class="text-right">
                    <div class="flex gap-2 justify-end">
                      {#if att.status === 'waitlist'}<form method="POST" action="?/admitir" use:enhance><input type="hidden" name="attendee_id" value={att.id}><button type="submit" class="btn-table-luxury green">Liberar Cupo</button></form>{/if}
                      {#if !att.checked_in}<form method="POST" action="?/checkin" use:enhance><input type="hidden" name="attendee_id" value={att.id}><button type="submit" class="btn-table-luxury black">Validar Entrada</button></form>{/if}
                      <a href="https://wa.me/{att.phone.replace(/\D/g, '')}?text={encodeURIComponent('Estimado ' + att.name.split(' ')[0] + ', soy su Private Client Advisor de Inmublia. Le escribo para coordinar detalles de su visita a ' + event.title + '.')}" target="_blank" rel="noopener noreferrer" class="btn-table-luxury border">Concierge</a>
                    </div>
                  </td>
                </tr>
              {/each}
              {#if attendees.length === 0}
                <tr><td colspan="6" class="text-center py-16 text-slate-400 font-medium tracking-wide">Ningún prospecto ha solicitado acceso exclusivo a este evento hasta el momento.</td></tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  {:else if activeTab === 'analytics'}
    <div class="dashboard-tab-content">
      <div class="grid-split-layout">
        <div class="luxury-control-panel-box">
          <h4 class="panel-box-header-title">Índice de Conversión Patrimonial Proyectado</h4>
          <div class="luxury-analytics-giant-number">{attendees.length > 0 ? ((attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length / attendees.length) * 100).toFixed(0) : 0}%</div>
          <p class="panel-box-header-sub">Porcentaje de la audiencia registrada con intenciones directas de compra de capital o inversión corporativa.</p>
        </div>
        <div class="luxury-control-panel-box">
          <h4 class="panel-box-header-title">Métricas de Convocatoria y Eficiencia</h4>
          <div class="luxury-summary-list">
            <div class="summary-luxury-row"><span>Porcentaje de Ocupación de Invitaciones</span><strong>{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</strong></div>
            <div class="summary-luxury-row"><span>Ratio de Asistencia Física Real (Show-Rate)</span><strong>{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</strong></div>
            <div class="summary-luxury-row"><span>Miembros Retenidos en Lista de Espera</span><strong>{attendees.filter(a => a.status === 'waitlist').length}</strong></div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
{/if}
<style>
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

  /* --- CONSOLA DE AGENTE (OPERATIVE DASHBOARD) --- */
  .inmublia-dashboard-wrapper { padding: 24px; background: #F1F5F9; min-height: 100vh; font-family: -apple-system, sans-serif; }
  
  .dashboard-luxury-header { background: var(--inmublia-black); padding: 40px; color: white; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-radius: 0px; }
  .dashboard-pretitle-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: var(--inmublia-gold); margin-bottom: 8px; }
  .dashboard-luxury-title { font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.02em; }
  .dashboard-luxury-subtitle { font-size: 13px; color: #94A3B8; margin: 0; font-weight: 500; }
  
  .luxury-badge-status { font-size: 10px; font-weight: 700; padding: 8px 18px; border-radius: 0px; text-transform: uppercase; letter-spacing: 0.08em; display: inline-block; }
  .luxury-badge-status.upcoming { background: rgba(255,255,255,0.1); color: #FFFFFF; }
  .luxury-badge-status.today { background: var(--inmublia-gold); color: white; }
  .luxury-badge-status.live { background: #991B1B; color: white; }
  .luxury-badge-status.ended { background: #059669; color: white; }

  .metrics-luxury-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px; }
  .metric-luxury-card { background: #FFFFFF; border: var(--inmublia-border); border-radius: 0px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .metric-large-digit { font-size: 40px; font-weight: 800; letter-spacing: -0.04em; display: block; line-height: 1; margin-bottom: 8px; color: var(--inmublia-black); }
  .metric-card-title { font-size: 12px; font-weight: 700; color: #475569; display: block; letter-spacing: 0.02em; }
  .metric-card-sub { font-size: 10px; display: block; margin-top: 4px; font-weight: 500; }

  .dashboard-navigation-tabs { display: flex; gap: 4px; background: #E2E8F0; padding: 4px; border-radius: 0px; margin-top: 32px; max-width: 32rem; }
  .dashboard-tab-btn { flex: 1; background: transparent; border: none; padding: 12px; font-size: 11px; font-weight: 700; color: #475569; border-radius: 0px; cursor: pointer; transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.05em; }
  .dashboard-tab-btn.active { background: #FFFFFF; color: var(--inmublia-black); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

  .dashboard-tab-content { margin-top: 24px; }
  .grid-split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  
  .luxury-control-panel-box { background: #FFFFFF; border: var(--inmublia-border); border-radius: 0px; padding: 36px; }
  .panel-box-header-title { font-size: 17px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.01em; }
  .panel-box-header-sub { font-size: 12.5px; color: #64748B; margin: 0 0 28px 0; line-height: 1.6; font-weight: 500; }
  
  .panel-actions-vertical-stack { display: flex; flex-direction: column; gap: 12px; max-width: 22rem; }
  .qr-display-container { padding: 20px; background: white; border: var(--inmublia-border); border-radius: 0px; display: inline-block; margin-top: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
  .qr-system-token { font-size: 10px; font-family: monospace; letter-spacing: 0.1em; color: #94A3B8; text-transform: uppercase; margin-top: 16px; display: block; }

  .luxury-table-container { background: #FFFFFF; border: var(--inmublia-border); border-radius: 0px; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .table-actions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
  .luxury-table-overflow-frame { overflow-x: auto; }
  .inmublia-editorial-table { width: 100%; border-collapse: collapse; text-align: left; }
  .inmublia-editorial-table th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; padding: 16px; border-bottom: 2px solid #F1F5F9; }
  .inmublia-editorial-table td { padding: 18px 16px; font-size: 13.5px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  
  .luxury-row-vip { background: #FAF8F5; }
  .luxury-row-checked { background: #F0FDF4; opacity: 0.9; }

  .luxury-intent-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 0px; display: inline-block; }
  .luxury-intent-badge.Comprar { background: #FEF3C7; color: #92600A; }
  .luxury-intent-badge.Invertir { background: #ECFEFF; color: #0891B2; }
  .luxury-intent-badge.Rentar { background: #E0F2FE; color: #0369A1; }
  
  .status-dot-indicator { display: inline-block; width: 6px; height: 6px; background: #CBD5E1; border-radius: 50%; margin-right: 6px; }
  .status-dot-indicator.checked { background: #059669; }

  .btn-table-luxury { background: transparent; border: 1px solid #E2E8F0; border-radius: 0px; padding: 6px 14px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-decoration: none; color: var(--inmublia-black); display: inline-block; text-transform: uppercase; letter-spacing: 0.02em; }
  .btn-table-luxury.green { background: #E1F5EE; border-color: #A7F3D0; color: #047857; }
  .btn-table-luxury.black { background: var(--inmublia-black); border-color: var(--inmublia-black); color: white; }
  .btn-table-luxury:hover { opacity: 0.85; }

  .luxury-analytics-giant-number { font-size: 72px; font-weight: 800; letter-spacing: -0.05em; color: var(--inmublia-black); line-height: 1; margin-bottom: 16px; }
  .luxury-summary-list { display: flex; flex-direction: column; gap: 16px; }
  .summary-luxury-row { display: flex; justify-content: space-between; font-size: 13.5px; color: #475569; border-bottom: var(--inmublia-border); padding-bottom: 10px; }
  .summary-luxury-row strong { color: var(--inmublia-black); font-size: 15px; }

  @media (max-width: 1024px) {
    .metrics-luxury-row { grid-template-columns: 1fr 1fr; }
    .grid-split-layout { grid-template-columns: 1fr; }
  }
</style>
