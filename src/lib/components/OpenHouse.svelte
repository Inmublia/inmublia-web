<script>
  /**
   * INMUBLIA — Open House Digital (Edición Premium 2026)
   * Svelte 5 · Runes syntax
   */
  import { onMount, onDestroy } from 'svelte';
  import { enhance } from '$app/forms';

  // ----- PROPS DINÁMICAS DESDE EL SERVIDOR -----
  let {
    event = {},
    attendeesDb = [],
    agentMode = false,
  } = $props();

  // ----- STATE REACTIVO -----
  let countdown = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  let eventStatus = $state('upcoming'); // upcoming | today | live | ended
  let currentPhoto = $state(0);
  let showSuccess = $state(false);
  let showCheckin = $state(false);
  let activeTab = $state('overview'); // overview | attendees | analytics

  // Sincronizamos los asistentes locales con la Base de Datos
  let attendees = $derived(attendeesDb);
  let spotsLeft = $derived(event.maxCapacity - attendees.length);
  let isFull = $derived(spotsLeft <= 0);

  // ----- FORM STATE LOCAL -----
  let form = $state({ name: '', phone: '', intent: '', budget: '' });
  let formErrors = $state({});
  let submitting = $state(false);

  // ----- LOGIC DEL CONTADOR -----
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

  // ----- FORMATOS EDITORIALES -----
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
      `Hola ${event.agent?.name}, me interesa asistir al Open House de la propiedad "${event.title}".`
    )
  );

  let shareMsg = $derived(
    encodeURIComponent(
      `🏡 Lanzamiento Exclusivo · Open House: ${event.title}\n📅 ${formattedDate}\n👥 Cupo limitado. Asegura tu acceso privado aquí: https://${event.agent?.url}/open-house/${event.id}`
    )
  );

  function nextPhoto() {
    currentPhoto = (currentPhoto + 1) % event.photos.length;
  }

  function prevPhoto() {
    currentPhoto = (currentPhoto - 1 + event.photos.length) % event.photos.length;
  }

  // Paleta de avatares minimalistas
  const avatarColors = ['#09090b', '#1e293b', '#475569', '#0f766e', '#b89848'];
</script>

{#if !agentMode}
<div class="oh-public animate-fade-in">

  {#if eventStatus === 'live'}
    <div class="status-banner live">
      <span class="live-pulse"></span> TRANSMISIÓN EN VIVO AHORA MISMO · {event.timeStart} – {event.timeEnd}
    </div>
  {:else if eventStatus === 'today'}
    <div class="status-banner today">LLEGÓ EL DÍA · ACCESO EXCLUSIVO HOY</div>
  {/if}

  <div class="oh-hero">
    <div class="oh-gallery">
      {#if event.photos && event.photos.length > 0}
        <img src={event.photos[currentPhoto]} alt="Propiedad Premium" class="oh-photo" />
      {/if}
      <div class="oh-gallery-overlay"></div>
      
      {#if event.photos && event.photos.length > 1}
        <button class="gallery-btn left" onclick={prevPhoto} aria-label="Anterior">‹</button>
        <button class="gallery-btn right" onclick={nextPhoto} aria-label="Siguiente">›</button>
        <div class="gallery-indicators">
          {#each event.photos as _, i}
            <span class="indicator-dot {i === currentPhoto ? 'active' : ''}"></span>
          {/each}
        </div>
      {/if}
    </div>

    <div class="oh-hero-content">
      <div class="oh-event-tag">
        LAUNCH PRIVADO · {formattedDate}
      </div>
      <h1 class="oh-title">{event.title}</h1>
      <p class="oh-time-row">⏰ {event.timeStart} a {event.timeEnd} · Convocatoria Exclusiva</p>
    </div>
  </div>

  {#if eventStatus === 'upcoming' || eventStatus === 'today'}
    <div class="oh-section-countdown">
      <p class="countdown-heading">El acceso se habilitará en</p>
      <div class="oh-countdown">
        {#each [
          { val: countdown.days, label: 'DÍAS' },
          { val: countdown.hours, label: 'HRS' },
          { val: countdown.minutes, label: 'MIN' },
          { val: countdown.seconds, label: 'SEG' }
        ] as unit}
          <div class="cd-box">
            <div class="cd-num">{String(unit.val).padStart(2, '0')}</div>
            <div class="cd-label">{unit.label}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="oh-section spec-sheet">
    <div class="price-tag">{formattedPrice} <span class="currency">MXN</span></div>
    <p class="location-tag">📍 {event.address}</p>
    
    <div class="oh-feats-grid">
      <div class="feat-pill"><strong>{event.bedrooms}</strong> Recámaras</div>
      <div class="feat-pill"><strong>{event.bathrooms}</strong> Baños</div>
      <div class="feat-pill"><strong>{event.sqm}</strong> M² Construcción</div>
    </div>

    {#if event.benefit}
      <div class="benefit-card">
        <span class="benefit-icon">🎁</span>
        <div>
          <h4 class="benefit-title">Cortesía de Asistencia</h4>
          <p class="benefit-text">{event.benefit}</p>
        </div>
      </div>
    {/if}

    <p class="editorial-description">{event.description}</p>
  </div>

  {#if eventStatus !== 'ended'}
    <div class="oh-form-section">
      {#if showSuccess}
        <div class="success-screen">
          <div class="success-ring">
            <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h3 class="success-title">Lugar Asegurado</h3>
          <p class="success-text">Hemos registrado tu invitación exclusiva. El asesor se pondrá en contacto contigo vía WhatsApp para enviarte las instrucciones de acceso.</p>
          <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" rel="noopener noreferrer" class="btn-primary-obsidian mt-6">
            Abrir WhatsApp de Soporte
          </a>
        </div>
      {:else}
        <div class="form-card-header">
          <h3 class="form-card-title">{isFull ? 'Lista de Espera Exclusiva' : 'Confirmar Asistencia Privada'}</h3>
          
          <div class="social-proof-row">
            <div class="avatar-stack">
              {#each [0, 1, 2, 3] as i}
                <div class="mini-avatar" style="background: {avatarColors[i]}; z-index: {4 - i}"></div>
              {/each}
            </div>
            <p class="proof-text">
              <strong>{attendees.length} registrados</strong> · 
              <span class={spotsLeft <= 3 ? 'text-danger-vibrant font-bold' : ''}>
                {isFull ? 'Cupo lleno' : `${spotsLeft} accesos disponibles`}
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
        }} class="editorial-form">
          
          <input type="hidden" name="status" value={isFull ? 'waitlist' : 'confirmed'}>

          <div class="input-field">
            <input type="text" name="name" required placeholder="Nombre completo *" class="native-input" />
          </div>

          <div class="input-field">
            <input type="tel" name="phone" required placeholder="Teléfono / WhatsApp *" class="native-input" />
          </div>

          <div class="input-field">
            <select name="intent" required class="native-select">
              <option value="">¿Cuál es tu objetivo? *</option>
              <option value="Comprar">Quiero comprar la propiedad</option>
              <option value="Invertir">Busco inversión inmobiliaria</option>
              <option value="Rentar">Me interesa rentar</option>
              <option value="Solo conocer">Conocer el entorno / Broker</option>
            </select>
          </div>

          <div class="input-field">
            <select name="budget" class="native-select">
              <option value="">Presupuesto aproximado (Opcional)</option>
              <option value="Menos de $5M">Menos de $5M MXN</option>
              <option value="$5M–$10M">$5M – $10M MXN</option>
              <option value="Más de $10M">Más de $10M MXN</option>
            </select>
          </div>

          <button type="submit" disabled={submitting} class="btn-primary-obsidian">
            {#if submitting}
              <span class="loading-spinner"></span> Sincronizando acceso...
            {:else if isFull}
              Unirme a la lista de espera
            {:else}
              Solicitar Invitación Digital ✅
            {/if}
          </button>

          <p class="privacy-notice">🔒 Acceso estrictamente resguardado por la agencia.</p>
        </form>
      {/if}
    </div>
  {/if}

  <div class="oh-section agent-editorial-card">
    <div class="agent-profile-row">
      <div class="editorial-avatar">{event.agent?.avatar}</div>
      <div>
        <h4 class="agent-profile-name">{event.agent?.name}</h4>
        <p class="agent-profile-specialty">{event.agent?.specialty}</p>
        <div class="agent-rating-stars">★★★★★ <span class="rating-number">{event.agent?.rating}</span></div>
      </div>
    </div>
    
    <div class="agent-action-buttons">
      <a href="https://wa.me/{event.agent?.whatsapp}?text={whatsappMsg}" target="_blank" rel="noopener noreferrer" class="btn-secondary-outline text-xs">
        Contactar Asesor
      </a>
      <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="btn-secondary-outline text-xs text-center flex items-center justify-center">
        Compartir Evento
      </a>
    </div>
  </div>

  <div class="oh-section checkin-qr-box">
    <div class="qr-code-graphic">
      <svg viewBox="0 0 100 100" class="w-10 h-10 text-slate-900">
        <rect width="24" height="24" fill="currentColor"/>
        <rect x="76" width="24" height="24" fill="currentColor"/>
        <rect y="76" width="24" height="24" fill="currentColor"/>
        <rect x="38" y="38" width="24" height="24" fill="currentColor"/>
      </svg>
    </div>
    <div>
      <h4 class="qr-box-title">Registro de Llegada Físico</h4>
      <p class="qr-box-subtitle">Al asistir a la propiedad, muestra el QR o solicita tu check-in digital con el asesor en la entrada.</p>
    </div>
  </div>

  <footer class="public-footer">
    <p>Powered by <span class="brand-highlight">Inmublia</span> SaaS</p>
    <p class="footer-sub">{event.agent?.url}</p>
  </footer>

</div>

{:else}
<div class="oh-agent-dashboard animate-fade-in">

  <div class="dashboard-header-block">
    <div>
      <p class="dashboard-pretitle">Consola Operativa · Monitoreo en Tiempo Real</p>
      <h2 class="dashboard-title">{event.title}</h2>
      <p class="dashboard-subtitle">📍 Propiedad Relacionada: {event.address}</p>
    </div>
    <span class="status-pill-badge {eventStatus}">
      {eventStatus === 'upcoming' ? '⏳ Próximo' : ''}
      {eventStatus === 'today' ? '📅 Sucede Hoy' : ''}
      {eventStatus === 'live' ? '🔴 En Vivo' : ''}
      {eventStatus === 'ended' ? '✅ Concluido' : ''}
    </span>
  </div>

  <div class="metrics-grid-row">
    <div class="kpi-metric-card">
      <span class="kpi-num">{attendees.length}</span>
      <span class="kpi-title">Prospectos Registrados</span>
      <span class="kpi-subtext">Límite establecido: {event.maxCapacity}</span>
    </div>
    <div class="kpi-metric-card">
      <span class="kpi-num text-emerald-700">{attendees.filter(a => a.checked_in).length}</span>
      <span class="kpi-title">Asistencias Confirmadas</span>
      <span class="kpi-subtext">Check-in físico completado</span>
    </div>
    <div class="kpi-metric-card">
      <span class="kpi-num text-amber-600">{attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length}</span>
      <span class="kpi-title">Leads de Alta Intención</span>
      <span class="kpi-subtext">Clasificados como Comprar/Invertir</span>
    </div>
    <div class="kpi-metric-card">
      <span class="kpi-num text-slate-500">{attendees.filter(a => a.status === 'waitlist').length}</span>
      <span class="kpi-title">En Lista de Espera</span>
      <span class="kpi-subtext">A la espera de liberación de cupo</span>
    </div>
  </div>

  <div class="dashboard-tabs-row">
    <button class="tab-pill-btn {activeTab === 'overview' ? 'active' : ''}" onclick={() => activeTab = 'overview'}>Resumen de Difusión</button>
    <button class="tab-pill-btn {activeTab === 'attendees' ? 'active' : ''}" onclick={() => activeTab = 'attendees'}>Listado de Interesados ({attendees.length})</button>
    <button class="tab-pill-btn {activeTab === 'analytics' ? 'active' : ''}" onclick={() => activeTab = 'analytics'}>Métricas Avanzadas</button>
  </div>

  {#if activeTab === 'overview'}
    <div class="dashboard-tab-content grid-two-columns">
      <div class="control-box-white">
        <h3 class="panel-box-title">Canales de Difusión Directa</h3>
        <p class="panel-box-subtitle">Utiliza estos enlaces estandarizados para promover el lanzamiento exclusivo en tus redes y bases de datos.</p>
        
        <div class="action-buttons-stack">
          <a href="https://wa.me/?text={shareMsg}" target="_blank" rel="noopener noreferrer" class="btn-primary-obsidian flex justify-center items-center text-xs">
            Compartir Lanzamiento en WhatsApp
          </a>
          <button class="btn-secondary-outline text-xs font-bold" onclick={() => {
            navigator.clipboard.writeText(`https://${event.agent?.url}/open-house/${event.id}`);
            alert('Enlace del Open House copiado al portapapeles.');
          }}>
            Copiar Enlace de la Landing Pública
          </button>
          <button class="btn-secondary-outline text-xs font-bold" onclick={() => showCheckin = !showCheckin}>
            {showCheckin ? 'Ocultar material de acceso' : 'Ver código QR de acceso físico'}
          </button>
        </div>
      </div>

      {#if showCheckin}
        <div class="control-box-white text-center flex flex-col items-center justify-center animate-fade-in">
          <h4 class="panel-box-title">Código de Acceso de Puerta</h4>
          <p class="panel-box-subtitle max-w-sm mx-auto">Coloca este identificador en la entrada del inmueble. Al escanearlo, tus prospectos abrirán el portal de check-in automático.</p>
          <div class="qr-box-container shadow-md">
            <svg viewBox="0 0 100 100" class="w-32 h-32 text-slate-900">
              <rect width="25" height="25"/>
              <rect x="75" width="25" height="25"/>
              <rect y="75" width="25" height="25"/>
              <rect x="35" y="35" width="30" height="30"/>
            </svg>
          </div>
          <span class="text-[10px] font-mono tracking-widest text-slate-400 uppercase mt-4">ID: open-house/{event.id}/checkin</span>
        </div>
      {/if}
    </div>

  {:else if activeTab === 'attendees'}
    <div class="dashboard-tab-content">
      <div class="table-container-white">
        <div class="table-header-action flex justify-between items-center mb-6">
          <h3 class="panel-box-title">Prospectos Registrados desde la Landing</h3>
          <button class="btn-secondary-outline text-xs font-bold" onclick={() => {
            const rows = [['Nombre', 'WhatsApp', 'Objetivo', 'Presupuesto', 'Confirmado', 'Estatus']];
            attendees.forEach(a => rows.push([a.name, a.phone, a.intent, a.budget || 'N/A', a.checked_in ? 'SÍ' : 'NO', a.status]));
            const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
            window.open(encodeURI(csvContent));
          }}>Descargar Reporte CSV</button>
        </div>

        <div class="editorial-table-wrapper">
          <table class="editorial-table">
            <thead>
              <tr>
                <th>Nombre del interesado</th>
                <th>Contacto</th>
                <th>Objetivo comercial</th>
                <th>Presupuesto</th>
                <th>Asistencia</th>
                <th class="text-right">Acciones operativas</th>
              </tr>
            </thead>
            <tbody>
              {#each attendees as att}
                <tr class="{att.intent === 'Comprar' || att.intent === 'Invertir' ? 'row-highlight-warm' : ''} {att.checked_in ? 'row-checked' : ''}">
                  <td class="font-bold text-slate-900">{att.name}</td>
                  <td class="font-mono text-xs">{att.phone}</td>
                  <td>
                    <span class="badge-intent {att.intent}">
                      {att.intent}
                    </span>
                  </td>
                  <td class="font-medium text-slate-600">{att.budget || 'No especificado'}</td>
                  <td>
                    <span class="attendance-status-dot {att.checked_in ? 'checked' : ''}"></span>
                    <span class="text-xs font-bold text-slate-700">{att.checked_in ? 'Llegó al inmueble' : 'No ha ingresado'}</span>
                  </td>
                  <td class="text-right">
                    <div class="flex gap-2 justify-end">
                      {#if att.status === 'waitlist'}
                        <form method="POST" action="?/admitir" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="btn-table-action green">Admitir Cupo</button>
                        </form>
                      {/if}
                      
                      {#if !att.checked_in}
                        <form method="POST" action="?/checkin" use:enhance>
                          <input type="hidden" name="attendee_id" value={att.id}>
                          <button type="submit" class="btn-table-action black">Completar Check-In</button>
                        </form>
                      {/if}

                      <a href="https://wa.me/{att.phone.replace(/\D/g, '')}?text={encodeURIComponent('Hola ' + att.name.split(' ')[0] + ', soy tu asesor de Inmublia. Gracias por registrarte al Open House de ' + event.title + '.')}" target="_blank" rel="noopener noreferrer" class="btn-table-action border">
                        WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              {/each}

              {#if attendees.length === 0}
                <tr>
                  <td colspan="6" class="text-center py-12 text-slate-400 font-medium">Aún no se registran prospectos para este evento.</td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  {:else if activeTab === 'analytics'}
    <div class="dashboard-tab-content">
      <div class="grid-two-columns">
        <div class="control-box-white">
          <h4 class="panel-box-title">Conversión Comercial Proyectada</h4>
          <div class="analytics-big-number">
            {attendees.length > 0 ? ((attendees.filter(a => a.intent === 'Comprar' || a.intent === 'Invertir').length / attendees.length) * 100).toFixed(0) : 0}%
          </div>
          <p class="panel-box-subtitle">De tus interesados registrados tienen un objetivo directo de adquisición o inversión de capital sobre el catálogo.</p>
        </div>
        
        <div class="control-box-white">
          <h4 class="panel-box-title">Métricas de Convocatoria</h4>
          <div class="summary-list-editorial">
            <div class="summary-row-item">
              <span>Porcentaje de Ocupación del Cupo</span>
              <strong>{((attendees.length / event.maxCapacity) * 100).toFixed(0)}%</strong>
            </div>
            <div class="summary-row-item">
              <span>Tasa de Asistencia Física Real</span>
              <strong>{attendees.length > 0 ? ((attendees.filter(a => a.checked_in).length / attendees.length) * 100).toFixed(0) : 0}%</strong>
            </div>
            <div class="summary-row-item">
              <span>Prospectos en Lista de Espera</span>
              <strong>{attendees.filter(a => a.status === 'waitlist').length}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

</div>
{/if}

<style>
  /* --- PALETA DE DISEÑO LUXURY REAL ESTATE --- */
  :root {
    --obsidian: #09090b;
    --slate-deep: #1e293b;
    --slate-light: #f8fafc;
    --gold-accent: #b89848;
    --emerald-vibrant: #059669;
    --danger-vibrant: #dc2626;
    --border-thin: 1px solid rgba(0, 0, 0, 0.06);
    --border-thin-dark: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* --- TRANSICIONES Y ANIMACIONES --- */
  .animate-fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ==========================================
     ESTILOS VISTA PÚBLICA (MÓVIL EDITORIAL)
     ========================================== */
  .oh-public {
    font-family: system-ui, -apple-system, sans-serif;
    background: #ffffff;
    min-height: 100vh;
    max-width: 450px;
    margin: 0 auto;
    color: var(--obsidian);
    border-left: var(--border-thin);
    border-right: var(--border-thin);
  }

  .status-banner {
    padding: 12px;
    font-size: 11px;
    font-weight: 900;
    text-align: center;
    letter-spacing: 0.15em;
  }
  .status-banner.live { background: var(--danger-vibrant); color: #ffffff; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .status-banner.today { background: var(--gold-accent); color: #ffffff; }

  .live-pulse { width: 8px; height: 8px; background: white; border-radius: 50%; animation: pulse-glow 1.5s infinite; }
  @keyframes pulse-glow { 0% { transform: scale(0.9); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.4; } 100% { transform: scale(0.9); opacity: 1; } }

  .oh-hero { position: relative; background: var(--obsidian); }
  .oh-gallery { position: relative; height: 320px; overflow: hidden; }
  .oh-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
  .oh-gallery-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(0,0,0,0.85) 100%); }
  
  .gallery-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 20px; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; z-index: 10; backdrop-filter: blur(4px); }
  .gallery-btn.left { left: 16px; }
  .gallery-btn.right { right: 16px; }
  .gallery-indicators { position: absolute; bottom: 120px; left: 24px; display: flex; gap: 6px; z-index: 10; }
  .indicator-dot { width: 16px; height: 2px; background: rgba(255,255,255,0.3); transition: background 0.3s; }
  .indicator-dot.active { background: #ffffff; }

  .oh-hero-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; color: #ffffff; }
  .oh-event-tag { display: inline-block; font-size: 9px; font-weight: 900; letter-spacing: 0.12em; color: var(--gold-accent); margin-bottom: 8px; }
  .oh-title { font-size: 24px; font-weight: 900; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 6px 0; }
  .oh-time-row { font-size: 12px; color: rgba(255,255,255,0.7); margin: 0; }

  .oh-section-countdown { background: var(--slate-light); padding: 24px; text-align: center; border-bottom: var(--border-thin); }
  .countdown-heading { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 12px 0; }
  .oh-countdown { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 24rem; margin-left: auto; margin-right: auto; }
  .cd-box { border-bottom: 2px solid var(--obsidian); padding-bottom: 4px; }
  .cd-num { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; color: var(--obsidian); }
  .cd-label { font-size: 8px; font-weight: 700; color: #64748b; margin-top: 2px; }

  .oh-section { padding: 32px 24px; border-bottom: var(--border-thin); }
  .price-tag { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; color: var(--obsidian); }
  .price-tag .currency { font-size: 14px; font-weight: 500; color: #64748b; margin-left: 4px; }
  .location-tag { font-size: 13px; font-weight: 500; color: #475569; margin: 6px 0 20px 0; }
  
  .oh-feats-grid { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .feat-pill { font-size: 12px; font-weight: 500; color: var(--slate-deep); background: var(--slate-light); padding: 6px 14px; border-radius: 6px; border: var(--border-thin); }
  
  .benefit-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; display: flex; gap: 12px; margin-bottom: 24px; border-radius: 12px; }
  .benefit-icon { font-size: 20px; }
  .benefit-title { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #166534; margin: 0 0 2px 0; }
  .benefit-text { font-size: 12px; color: #166534; margin: 0; font-weight: 500; }
  
  .editorial-description { font-size: 14px; color: #334155; line-height: 1.6; margin: 0; text-align: justify; }

  .oh-form-section { padding: 32px 24px; background: var(--slate-light); border-bottom: var(--border-thin); }
  .form-card-header { margin-bottom: 24px; }
  .form-card-title { font-size: 16px; font-weight: 900; letter-spacing: -0.01em; margin: 0 0 10px 0; }
  .social-proof-row { display: flex; align-items: center; gap: 12px; }
  .avatar-stack { display: flex; }
  .mini-avatar { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--slate-light); margin-right: -6px; }
  .proof-text { font-size: 12px; color: #475569; margin: 0; }

  .editorial-form { display: flex; flex-direction: column; gap: 12px; }
  .native-input, .native-select { width: 100%; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; font-size: 13px; font-weight: 500; color: var(--obsidian); outline: none; box-sizing: border-box; }
  .native-input:focus, .native-select:focus { border-color: var(--obsidian); }
  
  .btn-primary-obsidian { width: 100%; background: var(--obsidian); color: #ffffff; border: none; border-radius: 8px; padding: 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: opacity 0.2s; text-decoration: none; text-align: center; box-sizing: border-box; display: inline-block; }
  .btn-primary-obsidian:hover { opacity: 0.9; }
  .privacy-notice { font-size: 10px; color: #94a3b8; text-align: center; margin: 8px 0 0 0; font-weight: 500; }

  .success-screen { text-align: center; padding: 16px 0; }
  .success-ring { width: 56px; height: 56px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; }
  .success-title { font-size: 20px; font-weight: 900; margin: 0 0 8px 0; }
  .success-text { font-size: 13px; color: #475569; line-height: 1.5; margin: 0; }

  .agent-editorial-card { background: #ffffff; }
  .agent-profile-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
  .editorial-avatar { width: 52px; height: 52px; background: var(--obsidian); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 16px; }
  .agent-profile-name { font-size: 15px; font-weight: 900; margin: 0 0 2px 0; }
  .agent-profile-specialty { font-size: 11px; color: #64748b; margin: 0; font-weight: 500; }
  .agent-rating-stars { font-size: 11px; color: var(--gold-accent); margin-top: 4px; }
  .rating-number { color: #64748b; margin-left: 4px; }
  .agent-action-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  
  .btn-secondary-outline { background: #ffffff; border: 1px solid #e2e8f0; color: var(--obsidian); border-radius: 8px; padding: 10px 16px; font-weight: 700; cursor: pointer; text-decoration: none; transition: background 0.2s; text-align: center; }
  .btn-secondary-outline:hover { background: var(--slate-light); }

  .checkin-qr-box { display: flex; align-items: center; gap: 16px; background: var(--slate-light); }
  .qr-code-graphic { padding: 12px; background: white; border: var(--border-thin); border-radius: 8px; flex-shrink: 0; }
  .qr-box-title { font-size: 13px; font-weight: 900; margin: 0 0 2px 0; }
  .qr-box-subtitle { font-size: 11px; color: #64748b; margin: 0; line-height: 1.4; }

  .public-footer { background: var(--obsidian); color: #ffffff; text-align: center; padding: 24px; font-size: 12px; }
  .public-footer .brand-highlight { color: var(--gold-accent); font-weight: 900; }
  .footer-sub { color: #475569; margin: 4px 0 0 0; font-family: monospace; font-size: 10px; }

  /* ==========================================
     ESTILOS VISTA AGENTE (DASHBOARD ANALÍTICO)
     ========================================== */
  .oh-agent-dashboard { padding: 0; font-family: system-ui, -apple-system, sans-serif; color: var(--obsidian); }
  
  .dashboard-header-block { background: var(--obsidian); padding: 32px; color: white; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-radius: 24px 24px 0 0; }
  .dashboard-pretitle { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--gold-accent); margin-bottom: 6px; }
  .dashboard-title { font-size: 22px; font-weight: 900; margin: 0 0 4px 0; letter-spacing: -0.01em; }
  .dashboard-subtitle { font-size: 12px; color: #94a3b8; margin: 0; font-weight: 500; }
  
  .status-pill-badge { font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; }
  .status-pill-badge.upcoming { background: rgba(255,255,255,0.1); color: #ffffff; }
  .status-pill-badge.today { background: var(--gold-accent); color: white; }
  .status-pill-badge.live { background: var(--danger-vibrant); color: white; }
  .status-pill-badge.ended { background: var(--emerald-vibrant); color: white; }

  .metrics-grid-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px; }
  .kpi-metric-card { background: #ffffff; border: var(--border-thin); border-radius: 16px; padding: 24px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
  .kpi-num { font-size: 36px; font-weight: 900; letter-spacing: -0.03em; display: block; line-height: 1; margin-bottom: 6px; }
  .kpi-title { font-size: 12px; font-weight: 800; color: #475569; display: block; }
  .kpi-subtext { font-size: 10px; color: #94a3b8; display: block; margin-top: 2px; font-weight: 500; }

  .dashboard-tabs-row { display: flex; gap: 6px; background: #e2e8f0; padding: 6px; border-radius: 12px; margin-top: 24px; max-width: 28rem; }
  .tab-pill-btn { flex: 1; background: transparent; border: none; padding: 10px; font-size: 12px; font-weight: 800; color: #475569; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
  .tab-pill-btn.active { background: #ffffff; color: var(--obsidian); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

  .dashboard-tab-content { margin-top: 24px; }
  .grid-two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  
  .control-box-white { background: #ffffff; border: var(--border-thin); border-radius: 20px; padding: 32px; }
  .panel-box-title { font-size: 16px; font-weight: 900; margin: 0 0 4px 0; }
  .panel-box-subtitle { font-size: 12px; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; font-weight: 500; }
  
  .action-buttons-stack { display: flex; flex-direction: column; gap: 10px; max-width: 20rem; }
  .qr-box-container { padding: 16px; background: white; border: var(--border-thin); border-radius: 16px; display: inline-block; margin-top: 12px; }

  .table-container-white { background: #ffffff; border: var(--border-thin); border-radius: 24px; padding: 32px; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .table-header-action { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .editorial-table-wrapper { overflow-x: auto; }
  .editorial-table { width: 100%; border-collapse: collapse; text-align: left; }
  .editorial-table th { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding: 14px 16px; border-bottom: 2px solid #f1f5f9; }
  .editorial-table td { padding: 16px; font-size: 13px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  
  .row-highlight-warm { background: rgba(245, 241, 234, 0.3); }
  .row-checked { background: rgba(240, 253, 244, 0.4); opacity: 0.85; }

  .badge-intent { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; padding: 4px 10px; border-radius: 6px; }
  .badge-intent.Comprar { background: #fef3c7; color: #92600a; }
  .badge-intent.Invertir { background: #ecfeff; color: #0891b2; }
  .badge-intent.Rentar { background: #e0f2fe; color: #0369a1; }
  
  .attendance-status-dot { display: inline-block; width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%; margin-right: 6px; }
  .attendance-status-dot.checked { background: var(--emerald-vibrant); }

  .btn-table-action { background: transparent; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; text-decoration: none; color: var(--obsidian); display: inline-block; }
  .btn-table-action.green { background: #e1f5ee; border-color: #a7f3d0; color: var(--success); }
  .btn-table-action.black { background: var(--obsidian); border-color: var(--obsidian); color: white; }
  .btn-table-action:hover { opacity: 0.9; }

  .analytics-big-number { font-size: 64px; font-weight: 900; letter-spacing: -0.04em; color: var(--obsidian); line-height: 1; margin-bottom: 12px; }
  .summary-list-editorial { display: flex; flex-direction: column; gap: 14px; }
  .summary-row-item { display: flex; justify-content: space-between; font-size: 13px; color: #475569; border-bottom: var(--border-thin); padding-bottom: 8px; }
  .summary-row-item strong { color: var(--obsidian); font-size: 14px; }

  @media (max-width: 768px) {
    .metrics-grid-row { grid-template-columns: 1fr 1fr; }
    .grid-two-columns { grid-template-columns: 1fr; }
  }
</style>
