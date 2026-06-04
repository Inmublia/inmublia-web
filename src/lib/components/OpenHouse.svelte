<script>
  /**
   * INMUBLIA — Open House Digital
   * Svelte 5 · Runes syntax
   *
   * Props:
   * event    {Object}  - Datos del evento (ver ejemplo abajo)
   * agentMode {boolean} - true = vista del agente (dashboard), false = vista pública (RSVP)
   *
   * Ejemplo de uso:
   * <OpenHouse event={myEvent} agentMode={false} />
   */

  import { onMount, onDestroy } from 'svelte';

  // ----- PROPS -----
  let {
    event = {
      id: 'oh-001',
      title: 'Casa en Col. Americana',
      address: 'Calle Libertad #420, Col. Americana',
      city: 'Guadalajara, Jalisco',
      price: 6800000,
      bedrooms: 4,
      bathrooms: 3,
      sqm: 240,
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 días desde ahora
      timeStart: '11:00 AM',
      timeEnd: '2:00 PM',
      maxCapacity: 15,
      benefit: 'Valuación gratuita de tu propiedad actual',
      description: 'Residencia contemporánea en una de las colonias más cotizadas de Guadalajara. Amplios espacios, acabados de lujo y jardín privado.',
      photos: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
      ],
      agent: {
        name: 'Enrique Vargas',
        phone: '33-1234-5678',
        specialty: 'Asesor Inmobiliario Certificado · AMPI',
        rating: 4.9,
        reviews: 87,
        avatar: 'EV',
        whatsapp: '523312345678',
        url: 'enrique.vargas.inmublia.com',
      },
    },
    agentMode = false,
  } = $props();

  // ----- STATE -----
  let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let eventStatus = $state('upcoming'); // upcoming | today | live | ended
  let attendees = $state([
    { initials: 'MR', color: '#185FA5', name: 'María R.', intent: 'Comprar', hot: true },
    { initials: 'JG', color: '#0F6E56', name: 'José G.', intent: 'Invertir', hot: true },
    { initials: 'AL', color: '#92600A', name: 'Ana L.', intent: 'Comprar', hot: false },
    { initials: 'CP', color: '#533AB7', name: 'Carlos P.', intent: 'Solo viendo', hot: false },
  ]);
  let waitlist = $state([]);
  let spotsLeft = $derived(event.maxCapacity - attendees.length);
  let isFull = $derived(spotsLeft <= 0);
  let currentPhoto = $state(0);
  let showSuccess = $state(false);
  let showCheckin = $state(false);
  let activeTab = $state('overview'); // overview | attendees | analytics

  // ----- FORM STATE -----
  let form = $state({ name: '', phone: '', intent: '', budget: '' });
  let formErrors = $state({});
  let submitting = $state(false);

  // ----- COUNTDOWN LOGIC -----
  let timer;

  function updateCountdown() {
    const now = new Date();
    const eventDate = new Date(event.date);
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

  // ----- DERIVED -----
  let formattedDate = $derived(
    new Date(event.date).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  );

  let formattedPrice = $derived(
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(event.price)
  );

  let whatsappMsg = $derived(
    encodeURIComponent(
      `Hola ${event.agent.name}, vi el Open House del ${formattedDate} en ${event.title}. Me interesa más información.`
    )
  );

  let shareMsg = $derived(
    encodeURIComponent(
      `🏡 Open House · ${event.title}\n📅 ${formattedDate} · ${event.timeStart}–${event.timeEnd}\n📍 ${event.address}\n💰 ${formattedPrice}\n👥 Cupo limitado: ${spotsLeft} lugares restantes\n\nAquí el link: https://${event.agent.url}/open-house/${event.id}`
    )
  );

  // ----- HANDLERS -----
  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Tu nombre es requerido';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10)
      errors.phone = 'Ingresa un WhatsApp de 10 dígitos';
    if (!form.intent) errors.intent = 'Selecciona qué buscas';
    return errors;
  }

  async function handleRSVP() {
    formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) return;

    submitting = true;
    await new Promise((r) => setTimeout(r, 1200)); // Simula llamada a API

    const newAttendee = {
      initials: form.name.slice(0, 2).toUpperCase(),
      color: `hsl(${Math.random() * 360}, 60%, 40%)`,
      name: form.name,
      phone: form.phone,
      intent: form.intent,
      budget: form.budget,
      hot: form.intent === 'Comprar' || form.intent === 'Invertir',
      timestamp: new Date(),
      checkedIn: false,
    };

    if (isFull) {
      waitlist = [...waitlist, newAttendee];
    } else {
      attendees = [...attendees, newAttendee];
    }

    showSuccess = true;
    submitting = false;
    form = { name: '', phone: '', intent: '', budget: '' };
  }

  function handleCheckin(attendeeIndex) {
    attendees = attendees.map((a, i) =>
      i === attendeeIndex ? { ...a, checkedIn: true } : a
    );
  }

  function nextPhoto() {
    currentPhoto = (currentPhoto + 1) % event.photos.length;
  }

  function prevPhoto() {
    currentPhoto = (currentPhoto - 1 + event.photos.length) % event.photos.length;
  }

  async function downloadAttendees() {
    const rows = [
      ['Nombre', 'WhatsApp', 'Intención', 'Presupuesto', 'Check-in', 'Hora registro'],
      ...attendees.map((a) => [
        a.name,
        a.phone || '—',
        a.intent,
        a.budget || '—',
        a.checkedIn ? 'Sí' : 'No',
        a.timestamp ? new Date(a.timestamp).toLocaleTimeString('es-MX') : '—',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `open-house-asistentes-${event.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Número de color según posición
  const avatarColors = ['#185FA5', '#0F6E56', '#92600A', '#533AB7', '#C0392B'];
</script>

{#if !agentMode}
<div class="oh-public">

  {#if eventStatus === 'live'}
    <div class="status-banner live">🔴 Open House EN VIVO ahora mismo · {event.timeStart}–{event.timeEnd}</div>
  {:else if eventStatus === 'today'}
    <div class="status-banner today">⚡ ¡Es hoy! {event.timeStart} – {event.timeEnd}</div>
  {:else if eventStatus === 'ended'}
    <div class="status-banner ended">Este Open House ya terminó</div>
  {/if}

  <div class="oh-hero">
    <div class="oh-gallery">
      <img src={event.photos[currentPhoto]} alt="Propiedad" class="oh-photo" />
      <div class="oh-gallery-overlay"></div>
      {#if event.photos.length > 1}
        <button class="gallery-btn left" onclick={prevPhoto} aria-label="Foto anterior">‹</button>
        <button class="gallery-btn right" onclick={nextPhoto} aria-label="Foto siguiente">›</button>
        <div class="gallery-dots">
          {#each event.photos as _, i}
            <button
              class="gallery-dot {i === currentPhoto ? 'active' : ''}"
              onclick={() => currentPhoto = i}
              aria-label="Foto {i + 1}"
            ></button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="oh-hero-content">
      <div class="oh-event-tag">
        <span class="oh-dot {eventStatus === 'live' ? 'pulse' : ''}"></span>
        Open House · {formattedDate}
      </div>

      <div class="oh-agent-row">
        <div class="oh-avatar">{event.agent.avatar}</div>
        <div>
          <div class="oh-agent-name">{event.agent.name}</div>
          <div class="oh-agent-role">{event.agent.specialty}</div>
          <div class="oh-stars">
            {'★'.repeat(5)} <span class="oh-rating">{event.agent.rating} · {event.agent.reviews} reseñas</span>
          </div>
        </div>
      </div>

      <h1 class="oh-title">{event.title}</h1>
      <div class="oh-time-row">⏰ {event.timeStart} – {event.timeEnd} · {event.city}</div>

      {#if eventStatus === 'upcoming' || eventStatus === 'today'}
        <div class="oh-countdown">
          {#each [
            { val: countdown.days, label: 'días' },
            { val: countdown.hours, label: 'horas' },
            { val: countdown.minutes, label: 'min' },
            { val: countdown.seconds, label: 'seg' },
          ] as unit}
            <div class="cd-box">
              <div class="cd-num">{String(unit.val).padStart(2, '0')}</div>
              <div class="cd-label">{unit.label}</div>
            </div>
          {/each}
        </div>
      {/if}

      {#if eventStatus !== 'ended'}
        <div class="oh-ctas">
          {#if !isFull}
            <div class="oh-spots-badge">
              🎟️ {spotsLeft} {spotsLeft === 1 ? 'lugar restante' : 'lugares restantes'}
            </div>
          {:else}
            <div class="oh-spots-badge full">⚠️ Cupo lleno · Lista de espera disponible</div>
          {/if}
          <a
            href="https://wa.me/{event.agent.whatsapp}?text={whatsappMsg}"
            target="_blank"
            rel="noopener"
            class="btn-wa"
          >
            <span>💬</span> Escribir a {event.agent.name}
          </a>
          <a
            href="https://wa.me/?text={shareMsg}"
            target="_blank"
            rel="noopener"
            class="btn-share"
          >
            🔗 Compartir con un amigo
          </a>
        </div>
      {/if}
    </div>
  </div>

  <div class="oh-section">
    <div class="oh-price">{formattedPrice} MXN</div>
    <div class="oh-location">📍 {event.address}, {event.city}</div>
    <div class="oh-feats">
      <div class="oh-feat"><strong>{event.bedrooms}</strong> rec.</div>
      <div class="oh-feat"><strong>{event.bathrooms}</strong> baños</div>
      <div class="oh-feat"><strong>{event.sqm}</strong> m²</div>
    </div>
    {#if event.benefit}
      <div class="oh-benefit">🎁 {event.benefit}</div>
    {/if}
    <div class="oh-description">{event.description}</div>
  </div>

  {#if eventStatus !== 'ended'}
    <div class="oh-form-section">
      {#if showSuccess}
        <div class="oh-success">
          <div class="success-icon">✅</div>
          <div class="success-title">¡Tu lugar está reservado!</div>
          <div class="success-body">
            {event.agent.name} recibirá tu información y te enviará la confirmación por WhatsApp.
            Recibirás un recordatorio 24h antes del evento.
          </div>
          <a
            href="https://wa.me/{event.agent.whatsapp}?text={whatsappMsg}"
            target="_blank"
            rel="noopener"
            class="btn-wa"
            style="margin-top: 1rem;"
          >
            💬 Escribir a {event.agent.name}
          </a>
        </div>
      {:else}
        <div class="oh-form-header">
          <div class="oh-form-title">{isFull ? 'Únete a la lista de espera' : 'Reserva tu lugar'}</div>
          <div class="oh-attendees-row">
            <div class="oh-avatar-stack">
              {#each attendees.slice(0, 4) as a, i}
                <div
                  class="oh-mini-avatar"
                  style="background:{avatarColors[i % avatarColors.length]};z-index:{4 - i}"
                >
                  {a.initials}
                </div>
              {/each}
            </div>
            <div class="oh-attendees-count">
              {attendees.length} confirmado{attendees.length !== 1 ? 's' : ''} ·
              <span class="{spotsLeft <= 3 ? 'text-urgent' : ''}">{spotsLeft} lugar{spotsLeft !== 1 ? 'es' : ''} libre{spotsLeft !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div class="oh-form">
          <div class="form-group">
            <input
              type="text"
              bind:value={form.name}
              placeholder="Tu nombre completo *"
              class="form-input {formErrors.name ? 'error' : ''}"
            />
            {#if formErrors.name}<div class="form-error">{formErrors.name}</div>{/if}
          </div>

          <div class="form-group">
            <input
              type="tel"
              bind:value={form.phone}
              placeholder="WhatsApp (10 dígitos) *"
              class="form-input {formErrors.phone ? 'error' : ''}"
            />
            {#if formErrors.phone}<div class="form-error">{formErrors.phone}</div>{/if}
          </div>

          <div class="form-group">
            <select
              bind:value={form.intent}
              class="form-input {formErrors.intent ? 'error' : ''}"
            >
              <option value="">¿Qué buscas? *</option>
              <option value="Comprar">Comprar</option>
              <option value="Invertir">Invertir</option>
              <option value="Rentar">Rentar</option>
              <option value="Solo quiero conocer">Solo quiero conocer</option>
            </select>
            {#if formErrors.intent}<div class="form-error">{formErrors.intent}</div>{/if}
          </div>

          <div class="form-group">
            <select bind:value={form.budget} class="form-input">
              <option value="">Presupuesto aproximado (opcional)</option>
              <option value="Menos de $2M">Menos de $2M MXN</option>
              <option value="$2M–$5M">$2M – $5M MXN</option>
              <option value="$5M–$10M">$5M – $10M MXN</option>
              <option value="Más de $10M">Más de $10M MXN</option>
            </select>
          </div>

          <button
            class="btn-rsvp"
            onclick={handleRSVP}
            disabled={submitting}
          >
            {#if submitting}
              <span class="spinner"></span> Reservando...
            {:else if isFull}
              Unirme a la lista de espera
            {:else}
              Confirmar mi asistencia ✅
            {/if}
          </button>

          <div class="form-privacy">🔒 Tu información es privada y solo la ve {event.agent.name}</div>
        </div>
      {/if}
    </div>
  {/if}

  <div class="oh-qr-section">
    <div class="oh-qr-box">
      <svg viewBox="0 0 100 100" width="52" height="52" aria-label="QR de check-in">
        <rect width="100" height="100" fill="none"/>
        {#each [0,1,2,3,4,5,6] as r}
          {#each [0,1,2,3,4,5,6] as c}
            {#if (r < 3 && c < 3) || (r < 3 && c > 3) || (r > 3 && c < 3) || (r===3&&c===3) || (r===5&&c===5) || (r===2&&c===5) || (r===5&&c===2)}
              <rect
                x={c * 14 + 1}
                y={r * 14 + 1}
                width="12"
                height="12"
                fill="currentColor"
                rx="1"
              />
            {/if}
          {/each}
        {/each}
      </svg>
    </div>
    <div>
      <div class="oh-qr-title">Check-in el día del evento</div>
      <div class="oh-qr-sub">Escanea este QR en la entrada para confirmar tu asistencia. El agente sabrá en tiempo real quién llegó.</div>
    </div>
  </div>

  <div class="oh-footer">
    <span>Powered by <strong>Inmublia</strong></span>
    <span>· {event.agent.url}</span>
  </div>

</div>

{:else}
<div class="oh-agent">

  <div class="agent-header">
    <div>
      <div class="agent-title">Open House · {event.title}</div>
      <div class="agent-subtitle">{formattedDate} · {event.timeStart}–{event.timeEnd} · {event.address}</div>
    </div>
    <div class="agent-status-badge {eventStatus}">{
      eventStatus === 'upcoming' ? '⏳ Próximo' :
      eventStatus === 'today' ? '📅 Hoy' :
      eventStatus === 'live' ? '🔴 En vivo' : '✅ Finalizado'
    }</div>
  </div>

  <div class="agent-kpis">
    <div class="kpi-card">
      <div class="kpi-val">{attendees.length}</div>
      <div class="kpi-label">Confirmados</div>
      <div class="kpi-sub">de {event.maxCapacity} cupo</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:var(--success)">{attendees.filter(a => a.checkedIn).length}</div>
      <div class="kpi-label">Asistentes reales</div>
      <div class="kpi-sub">check-in escaneado</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:var(--amber)">{attendees.filter(a => a.hot).length}</div>
      <div class="kpi-label">Leads calientes</div>
      <div class="kpi-sub">comprar / invertir</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:var(--info)">{waitlist.length}</div>
      <div class="kpi-label">Lista de espera</div>
      <div class="kpi-sub">sin lugar asignado</div>
    </div>
  </div>

  <div class="agent-tabs">
    {#each [
      { id: 'overview', label: 'Resumen' },
      { id: 'attendees', label: `Asistentes (${attendees.length})` },
      { id: 'analytics', label: 'Analytics' },
    ] as tab}
      <button
        class="agent-tab {activeTab === tab.id ? 'active' : ''}"
        onclick={() => activeTab = tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'overview'}
    <div class="agent-section">
      <div class="agent-share-tools">
        <div class="share-title">Herramientas de difusión</div>
        <a
          href="https://wa.me/?text={shareMsg}"
          target="_blank"
          rel="noopener"
          class="share-btn wa"
        >💬 Compartir en WhatsApp</a>
        <button class="share-btn copy" onclick={() => {
          navigator.clipboard.writeText(`https://${event.agent.url}/open-house/${event.id}`);
        }}>🔗 Copiar link del evento</button>
        <button class="share-btn qr" onclick={() => showCheckin = !showCheckin}>
          📱 Ver QR de check-in
        </button>
      </div>

      {#if showCheckin}
        <div class="checkin-modal">
          <div class="checkin-title">QR de check-in para la entrada</div>
          <div class="checkin-sub">Imprime esto y ponlo en la puerta. Los asistentes escanean para registrar su llegada.</div>
          <div class="checkin-qr">
            <svg viewBox="0 0 80 80" width="100" height="100" style="color:#0D1B2A">
              {#each [0,1,2,3,4] as r}
                {#each [0,1,2,3,4] as c}
                  {#if Math.random() > 0.4 || r < 2 || c < 2}
                    <rect x={c*16} y={r*16} width="14" height="14" fill="currentColor" rx="1"/>
                  {/if}
                {/each}
              {/each}
            </svg>
          </div>
          <div class="checkin-url">open-house/{event.id}/checkin</div>
        </div>
      {/if}

      <div class="countdown-agent">
        {#each [
          { val: countdown.days, label: 'días' },
          { val: countdown.hours, label: 'horas' },
          { val: countdown.minutes, label: 'min' },
          { val: countdown.seconds, label: 'seg' },
        ] as unit}
          <div class="cd-agent-box">
            <div class="cd-agent-num">{String(unit.val).padStart(2, '0')}</div>
            <div class="cd-agent-label">{unit.label}</div>
          </div>
        {/each}
      </div>
    </div>

  {:else if activeTab === 'attendees'}
    <div class="agent-section">
      <div class="attendees-header">
        <span class="attendees-count">{attendees.length} confirmados</span>
        <button class="download-btn" onclick={downloadAttendees}>
          ⬇ Descargar CSV
        </button>
      </div>

      {#each attendees as a, i}
        <div class="attendee-row {a.hot ? 'hot' : ''} {a.checkedIn ? 'checked' : ''}">
          <div class="att-avatar" style="background:{avatarColors[i % avatarColors.length]}">{a.initials}</div>
          <div class="att-info">
            <div class="att-name">{a.name}</div>
            <div class="att-meta">
              {a.intent}
              {#if a.budget} · {a.budget}{/if}
              {#if a.phone} · {a.phone}{/if}
            </div>
          </div>
          <div class="att-actions">
            {#if a.hot}
              <span class="att-badge hot">🔥 Caliente</span>
            {/if}
            {#if a.checkedIn}
              <span class="att-badge checked">✅ Llegó</span>
            {:else if eventStatus === 'live'}
              <button class="att-checkin-btn" onclick={() => handleCheckin(i)}>
                Check-in
              </button>
            {/if}
            {#if a.phone}
              <a
                href="https://wa.me/52{a.phone.replace(/\D/g,'')}?text={encodeURIComponent(`Hola ${a.name}, gracias por asistir al Open House de ${event.title}. ¿Tienes alguna pregunta sobre la propiedad?`)}"
                target="_blank"
                rel="noopener"
                class="att-wa-btn"
                title="Escribir por WhatsApp"
              >💬</a>
            {/if}
          </div>
        </div>
      {/each}

      {#if waitlist.length > 0}
        <div class="waitlist-section">
          <div class="waitlist-title">Lista de espera ({waitlist.length})</div>
          {#each waitlist as a, i}
            <div class="attendee-row waitlist">
              <div class="att-avatar" style="background:#888">{a.initials}</div>
              <div class="att-info">
                <div class="att-name">{a.name}</div>
                <div class="att-meta">{a.intent} {a.phone ? `· ${a.phone}` : ''}</div>
              </div>
              <button class="att-admit-btn" onclick={() => {
                attendees = [...attendees, { ...waitlist[i], checkedIn: false }];
                waitlist = waitlist.filter((_, wi) => wi !== i);
              }}>Admitir</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'analytics'}
    <div class="agent-section">
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-title">Conversión de la landing</div>
          <div class="analytics-big">6.1%</div>
          <div class="analytics-sub">247 visitas → 15 RSVPs</div>
        </div>
        <div class="analytics-card">
          <div class="analytics-title">Intención de compra</div>
          <div class="analytics-big" style="color:var(--success)">73%</div>
          <div class="analytics-sub">Comprar o Invertir</div>
        </div>
      </div>
      <div class="analytics-list">
        <div class="analytics-row">
          <span>Fuente principal de tráfico</span>
          <span class="analytics-val">WhatsApp (68%)</span>
        </div>
        <div class="analytics-row">
          <span>Visitantes únicos a la landing</span>
          <span class="analytics-val">247</span>
        </div>
        <div class="analytics-row">
          <span>Escaneos del QR físico (letrero)</span>
          <span class="analytics-val">31</span>
        </div>
        <div class="analytics-row">
          <span>Leads calientes (3+ visitas)</span>
          <span class="analytics-val">3</span>
        </div>
        <div class="analytics-row">
          <span>Tasa no-show proyectada</span>
          <span class="analytics-val" style="color:var(--amber)">27% (con recordatorio)</span>
        </div>
      </div>
    </div>
  {/if}

</div>
{/if}


<style>
  /* ===================== VARIABLES ===================== */
  :root {
    --navy: #0D1B2A;
    --navy-mid: #162534;
    --gold: #C9A84C;
    --cream: #F5F1EA;
    --success: #0F6E56;
    --info: #185FA5;
    --amber: #92600A;
    --danger: #C0392B;
    --wa: #25D366;
    --border: rgba(255,255,255,0.12);
    --text-muted: rgba(255,255,255,0.55);
  }

  /* ===================== PUBLIC VIEW ===================== */
  .oh-public {
    font-family: 'Inter', system-ui, sans-serif;
    background: #f5f4f0;
    min-height: 100vh;
    max-width: 480px;
    margin: 0 auto;
  }

  /* Status banner */
  .status-banner {
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 600;
    text-align: center;
  }
  .status-banner.live { background: #dc2626; color: #fff; }
  .status-banner.today { background: #d97706; color: #fff; }
  .status-banner.ended { background: #374151; color: #fff; }

  /* Hero */
  .oh-hero { position: relative; }
  .oh-gallery { position: relative; height: 280px; overflow: hidden; }
  .oh-photo { width: 100%; height: 100%; object-fit: cover; display: block; transition: opacity .3s; }
  .oh-gallery-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(13,27,42,.1) 0%, rgba(13,27,42,.85) 100%);
  }
  .gallery-btn {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(255,255,255,.2); border: none; color: #fff;
    font-size: 22px; width: 36px; height: 36px; border-radius: 50%;
    cursor: pointer; z-index: 2;
  }
  .gallery-btn.left { left: 12px; }
  .gallery-btn.right { right: 12px; }
  .gallery-dots { position: absolute; bottom: 140px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px; z-index: 2; }
  .gallery-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.4); border: none; cursor: pointer; }
  .gallery-dot.active { background: #fff; }
  .oh-hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; }

  .oh-event-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,.1); border: .5px solid rgba(255,255,255,.2);
    border-radius: 20px; padding: 3px 10px; font-size: 11px;
    color: rgba(255,255,255,.85); margin-bottom: 12px;
  }
  .oh-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--wa); flex-shrink: 0; }
  .oh-dot.pulse { animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:.4 } }

  .oh-agent-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .oh-avatar {
    width: 48px; height: 48px; border-radius: 50%;
    background: linear-gradient(135deg, var(--info), #4FC3F7);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 600; color: #fff;
    border: 2px solid rgba(255,255,255,.3); flex-shrink: 0;
  }
  .oh-agent-name { font-size: 15px; font-weight: 600; color: #fff; }
  .oh-agent-role { font-size: 11px; color: var(--text-muted); }
  .oh-stars { font-size: 11px; color: #F0C040; margin-top: 2px; }
  .oh-rating { color: var(--text-muted); }

  .oh-title { font-size: 20px; font-weight: 700; color: #fff; line-height: 1.25; margin-bottom: 6px; }
  .oh-time-row { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }

  .oh-countdown { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 16px; }
  .cd-box { background: rgba(0,0,0,.3); border-radius: 7px; padding: 8px 4px; text-align: center; }
  .cd-num { font-size: 22px; font-weight: 700; color: #fff; line-height: 1; }
  .cd-label { font-size: 9px; color: var(--text-muted); margin-top: 2px; }

  .oh-ctas { display: flex; flex-direction: column; gap: 8px; }
  .oh-spots-badge {
    background: rgba(255,255,255,.1); border: .5px solid rgba(255,255,255,.2);
    border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600;
    color: #fff; text-align: center;
  }
  .oh-spots-badge.full { background: rgba(192,57,43,.2); border-color: rgba(192,57,43,.4); }

  .btn-wa {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    background: var(--wa); border: none; border-radius: 8px;
    padding: 12px; font-size: 13px; font-weight: 600;
    color: #fff; cursor: pointer; text-decoration: none; font-family: inherit;
    transition: opacity .15s;
  }
  .btn-wa:hover { opacity: .9; }
  .btn-share {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,.08); border: .5px solid rgba(255,255,255,.2);
    border-radius: 8px; padding: 10px; font-size: 12px;
    color: rgba(255,255,255,.8); cursor: pointer; text-decoration: none; font-family: inherit;
  }

  /* Sections */
  .oh-section { background: #fff; padding: 20px; border-bottom: 1px solid #ede9e3; }
  .oh-price { font-size: 22px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
  .oh-location { font-size: 13px; color: #777; margin-bottom: 12px; }
  .oh-feats { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
  .oh-feat { font-size: 13px; color: #444; background: #f5f4f0; padding: 5px 12px; border-radius: 20px; }
  .oh-benefit {
    background: #e1f5ee; border: 1px solid #a7f3d0; border-radius: 8px;
    padding: 8px 12px; font-size: 12.5px; color: var(--success); margin-bottom: 10px;
  }
  .oh-description { font-size: 13px; color: #555; line-height: 1.6; }

  /* Form */
  .oh-form-section { background: #f5f4f0; padding: 20px; }
  .oh-form-header { margin-bottom: 16px; }
  .oh-form-title { font-size: 16px; font-weight: 600; color: var(--navy); margin-bottom: 10px; }
  .oh-attendees-row { display: flex; align-items: center; gap: 8px; }
  .oh-avatar-stack { display: flex; }
  .oh-mini-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 600; color: #fff;
    border: 2px solid #f5f4f0; margin-right: -7px; position: relative;
  }
  .oh-attendees-count { font-size: 12px; color: #666; margin-left: 12px; }
  .text-urgent { color: #dc2626; font-weight: 600; }

  .oh-form { display: flex; flex-direction: column; gap: 10px; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-input {
    width: 100%; background: #fff; border: 1px solid #e0ddd6;
    border-radius: 8px; padding: 11px 14px; font-size: 13px;
    color: #1a1a2e; font-family: inherit;
    transition: border-color .15s;
  }
  .form-input:focus { outline: none; border-color: var(--navy); }
  .form-input.error { border-color: #dc2626; }
  .form-error { font-size: 11px; color: #dc2626; }
  .btn-rsvp {
    background: var(--navy); border: none; border-radius: 8px;
    padding: 13px; font-size: 14px; font-weight: 600;
    color: #fff; cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity .15s;
  }
  .btn-rsvp:disabled { opacity: .6; cursor: not-allowed; }
  .spinner {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .form-privacy { font-size: 11px; color: #888; text-align: center; }

  /* Success */
  .oh-success { text-align: center; padding: 20px 0; }
  .success-icon { font-size: 40px; margin-bottom: 10px; }
  .success-title { font-size: 18px; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
  .success-body { font-size: 13px; color: #555; line-height: 1.6; }

  /* QR Section */
  .oh-qr-section {
    background: #fff; padding: 16px 20px;
    display: flex; align-items: center; gap: 14px;
    border-top: 1px solid #ede9e3;
  }
  .oh-qr-box {
    width: 58px; height: 58px; background: #f5f4f0;
    border: 1px solid #e0ddd6; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .oh-qr-title { font-size: 13px; font-weight: 600; color: var(--navy); margin-bottom: 2px; }
  .oh-qr-sub { font-size: 11px; color: #777; line-height: 1.4; }

  /* Footer */
  .oh-footer {
    background: var(--navy); color: rgba(255,255,255,.35);
    padding: 14px 20px; font-size: 12px; text-align: center;
  }
  .oh-footer strong { color: rgba(255,255,255,.7); }

  /* ===================== AGENT DASHBOARD ===================== */
  .oh-agent { font-family: 'Inter', system-ui, sans-serif; padding: 0; }

  .agent-header {
    background: var(--navy); padding: 20px 24px;
    display: flex; justify-content: space-between;
    align-items: flex-start; gap: 12px; flex-wrap: wrap;
  }
  .agent-title { font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 3px; }
  .agent-subtitle { font-size: 12px; color: rgba(255,255,255,.5); }
  .agent-status-badge {
    font-size: 12px; font-weight: 600; padding: 4px 12px;
    border-radius: 20px; flex-shrink: 0;
  }
  .agent-status-badge.upcoming { background: rgba(255,255,255,.1); color: rgba(255,255,255,.7); }
  .agent-status-badge.today { background: #d97706; color: #fff; }
  .agent-status-badge.live { background: #dc2626; color: #fff; }
  .agent-status-badge.ended { background: #0F6E56; color: #fff; }

  .agent-kpis {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: #e0ddd6; border-bottom: 1px solid #e0ddd6;
  }
  .kpi-card {
    background: #fff; padding: 16px; text-align: center;
  }
  .kpi-val { font-size: 26px; font-weight: 700; color: var(--navy); }
  .kpi-label { font-size: 11px; font-weight: 600; color: #555; margin-top: 2px; }
  .kpi-sub { font-size: 10px; color: #888; margin-top: 1px; }

  .agent-tabs {
    display: flex; background: #f5f4f0;
    border-bottom: 1px solid #e0ddd6;
  }
  .agent-tab {
    flex: 1; padding: 12px 8px; font-size: 13px; font-weight: 500;
    color: #777; background: transparent; border: none; cursor: pointer;
    border-bottom: 2px solid transparent; font-family: inherit; transition: all .15s;
  }
  .agent-tab.active { color: var(--navy); border-bottom-color: var(--navy); background: #fff; }

  .agent-section { padding: 20px; background: #fff; }

  .agent-share-tools { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .share-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; }
  .share-btn {
    display: flex; align-items: center; justify-content: center;
    padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 500;
    cursor: pointer; text-decoration: none; font-family: inherit; border: 1px solid #e0ddd6;
    background: #f5f4f0; color: var(--navy); transition: opacity .15s;
  }
  .share-btn.wa { background: #dcfce7; border-color: #86efac; color: #15803d; }

  .checkin-modal {
    background: #f5f4f0; border: 1px solid #e0ddd6;
    border-radius: 10px; padding: 16px; margin-bottom: 16px; text-align: center;
  }
  .checkin-title { font-size: 14px; font-weight: 600; color: var(--navy); margin-bottom: 4px; }
  .checkin-sub { font-size: 12px; color: #666; margin-bottom: 12px; line-height: 1.4; }
  .checkin-qr {
    display: inline-flex; background: #fff; border-radius: 8px;
    padding: 12px; border: 1px solid #e0ddd6; margin-bottom: 8px;
  }
  .checkin-url { font-size: 11px; color: #888; font-family: monospace; }

  .countdown-agent { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
  .cd-agent-box { background: var(--navy); border-radius: 8px; padding: 12px; text-align: center; }
  .cd-agent-num { font-size: 24px; font-weight: 700; color: #fff; }
  .cd-agent-label { font-size: 10px; color: rgba(255,255,255,.4); margin-top: 2px; }

  .attendees-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .attendees-count { font-size: 14px; font-weight: 600; color: var(--navy); }
  .download-btn {
    background: #e1f5ee; border: 1px solid #a7f3d0; color: var(--success);
    border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: inherit;
  }

  .attendee-row {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid #f0ede8;
  }
  .attendee-row:last-child { border-bottom: none; }
  .attendee-row.hot { background: linear-gradient(to right, rgba(252,211,77,.05), transparent); }
  .attendee-row.checked { opacity: .7; }
  .att-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; color: #fff; flex-shrink: 0;
  }
  .att-info { flex: 1; min-width: 0; }
  .att-name { font-size: 13px; font-weight: 500; color: var(--navy); }
  .att-meta { font-size: 11px; color: #777; margin-top: 1px; }
  .att-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .att-badge { font-size: 10px; padding: 2px 7px; border-radius: 99px; font-weight: 600; }
  .att-badge.hot { background: #fef3c7; color: #92600A; }
  .att-badge.checked { background: #dcfce7; color: #15803d; }
  .att-checkin-btn {
    background: var(--navy); color: #fff; border: none;
    border-radius: 5px; padding: 4px 10px; font-size: 11px;
    font-weight: 600; cursor: pointer; font-family: inherit;
  }
  .att-wa-btn {
    background: #dcfce7; border: 1px solid #86efac;
    border-radius: 5px; padding: 4px 8px; font-size: 14px;
    cursor: pointer; text-decoration: none;
  }
  .att-admit-btn {
    background: var(--info); color: #fff; border: none;
    border-radius: 5px; padding: 4px 10px; font-size: 11px;
    font-weight: 600; cursor: pointer; font-family: inherit;
  }

  .waitlist-section { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e0ddd6; }
  .waitlist-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 10px; }
  .attendee-row.waitlist { opacity: .75; }

  .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .analytics-card { background: #f5f4f0; border-radius: 10px; padding: 16px; text-align: center; }
  .analytics-title { font-size: 11px; color: #888; margin-bottom: 6px; }
  .analytics-big { font-size: 28px; font-weight: 700; color: var(--navy); }
  .analytics-sub { font-size: 11px; color: #888; margin-top: 2px; }

  .analytics-list { display: flex; flex-direction: column; }
  .analytics-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f0ede8; font-size: 13px; color: #555; }
  .analytics-row:last-child { border-bottom: none; }
  .analytics-val { font-weight: 600; color: var(--navy); }

  @media (max-width: 400px) {
    .agent-kpis { grid-template-columns: 1fr 1fr; }
  }
</style>
