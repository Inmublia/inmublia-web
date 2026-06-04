<script>
  import { enhance } from '$app/forms';

  let { data } = $props();
  let propiedades = $derived(data?.propiedades || []); 
  let broker = $derived(data?.broker || {});

  let isSubmitting = $state(false);

  // Motor para generar horarios Premium (intervalos de 30 mins)
  const timeOptions = [];
  for (let i = 7; i <= 21; i++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = i.toString().padStart(2, '0');
      const min = m === 0 ? '00' : '30';
      const hour12 = i % 12 === 0 ? 12 : i % 12;
      const ampm = i < 12 ? 'AM' : 'PM';
      timeOptions.push({
        value: `${hour24}:${min}`,
        label: `${hour12}:${min} ${ampm}`
      });
    }
  }
</script>

<div class="inmublia-admin-layout">
  
  <!-- Sidebar Luxury -->
  <aside class="inmublia-sidebar">
    <div class="sidebar-logo-container">
      <img src="/logo.png" alt="Inmublia" class="h-9 w-auto">
    </div>
    <nav class="sidebar-nav">
      <p class="nav-section-label">Consola Operativa</p>
      <a href="/admin" class="nav-link">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        Inventario Real
      </a>
      <a href="/admin/leads" class="nav-link">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        Prospectos (CRM)
      </a>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="inmublia-main-content">
    
    <!-- Header Operativo -->
    <header class="main-header">
      <div class="header-title-block">
        <a href="/admin" class="btn-back-icon" aria-label="Volver">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </a>
        <div>
          <h1 class="header-primary-text">Configurar Open House</h1>
          <p class="header-secondary-text">Despliegue de Evento Virtual y Físico</p>
        </div>
      </div>
      
      <button type="submit" form="form-openhouse" disabled={isSubmitting} class="btn-primary-action">
        {#if isSubmitting}
          <span class="loading-ring"></span> Procesando...
        {:else}
          Lanzar Evento Oficial
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        {/if}
      </button>
    </header>

    <!-- Zona de Formulario -->
    <div class="content-scroll-area">
      <div class="form-container-wrapper">
        
        <form id="form-openhouse" method="POST" use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            update();
          };
        }}>
          
          <!-- SECCIÓN: Identidad -->
          <div class="luxury-form-card">
            <div class="card-header-block">
              <div class="header-icon-wrap">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <div>
                <h2 class="card-title-text">Identidad del Evento</h2>
                <p class="card-subtitle-text">Seleccione el activo inmobiliario y defina su presentación.</p>
              </div>
            </div>
            
            <div class="card-body-block">
              <div class="input-grid-2col">
                <div class="col-span-full">
                  <label for="propiedad_id" class="inmublia-label">Seleccionar Propiedad Base *</label>
                  <div class="inmublia-select-wrapper">
                    <select id="propiedad_id" name="propiedad_id" required class="inmublia-select">
                      <option value="">Selecciona una propiedad del inventario...</option>
                      {#each propiedades as prop}
                        <option value={prop.id}>{prop.titulo} ({prop.operacion})</option>
                      {/each}
                      {#if propiedades.length === 0}
                        <option value="test">Casa en Col. Americana (Activo de Prueba)</option>
                      {/if}
                    </select>
                  </div>
                </div>

                <div class="col-span-full">
                  <label for="title" class="inmublia-label">Título Promocional del Evento *</label>
                  <input id="title" type="text" name="title" required placeholder="Ej. Presentación Exclusiva: Residencia en Puerta de Hierro" class="inmublia-input">
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: Horarios (Control de UI Premium) -->
          <div class="luxury-form-card">
            <div class="card-header-block">
              <div class="header-icon-wrap">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <div>
                <h2 class="card-title-text">Gestión de Horarios y Aforos</h2>
                <p class="card-subtitle-text">Establezca los parámetros de acceso y la capacidad operativa.</p>
              </div>
            </div>
            
            <div class="card-body-block">
              <div class="input-grid-3col">
                
                <!-- Date Picker Estilizado -->
                <div class="col-span-full">
                  <label for="date" class="inmublia-label">Fecha de Convocatoria *</label>
                  <div class="inmublia-date-wrapper">
                    <svg class="date-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <input id="date" type="date" name="date" required class="inmublia-input date-input">
                  </div>
                </div>

                <!-- Custom Time Selectors -->
                <div>
                  <label for="timeStart" class="inmublia-label">Apertura de Puertas *</label>
                  <div class="inmublia-select-wrapper">
                    <select id="timeStart" name="timeStart" required class="inmublia-select">
                      <option value="">Seleccionar...</option>
                      {#each timeOptions as time}
                        <option value={time.value}>{time.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <div>
                  <label for="timeEnd" class="inmublia-label">Cierre de Puertas *</label>
                  <div class="inmublia-select-wrapper">
                    <select id="timeEnd" name="timeEnd" required class="inmublia-select">
                      <option value="">Seleccionar...</option>
                      {#each timeOptions as time}
                        <option value={time.value}>{time.label}</option>
                      {/each}
                    </select>
                  </div>
                </div>

                <div>
                  <label for="maxCapacity" class="inmublia-label">Aforo Máximo *</label>
                  <input id="maxCapacity" type="number" name="maxCapacity" required min="1" max="100" placeholder="Ej. 15" class="inmublia-input">
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: Marketing -->
          <div class="luxury-form-card">
            <div class="card-header-block">
              <div class="header-icon-wrap">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
              </div>
              <div>
                <h2 class="card-title-text">Persuasión y Copywriting</h2>
                <p class="card-subtitle-text">Defina los diferenciadores que impulsarán el registro de prospectos.</p>
              </div>
            </div>
            
            <div class="card-body-block">
              <div class="input-grid-1col">
                <div>
                  <label for="benefit" class="inmublia-label">Incentivo de Asistencia (Opcional)</label>
                  <div class="inmublia-input-wrapper-icon">
                    <svg class="input-prefix-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                    <input id="benefit" type="text" name="benefit" placeholder="Ej. Asesoría financiera gratuita y valuación de mercado" class="inmublia-input with-icon">
                  </div>
                </div>

                <div>
                  <label for="description" class="inmublia-label">Sinopsis del Evento (Storytelling) *</label>
                  <textarea id="description" name="description" rows="5" required placeholder="Redacte la experiencia que vivirá el prospecto al recorrer esta propiedad..." class="inmublia-textarea"></textarea>
                </div>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  </main>
</div>

<style>
  /* --- PALETA INMUBLIA LUXURY --- */
  :root {
    --inmublia-black: #0A0A0A;
    --inmublia-gold: #B89848;
    --inmublia-slate: #1E293B;
    --inmublia-bg: #F8F9FA;
    --inmublia-border: #E2E8F0;
    --inmublia-card: #FFFFFF;
  }

  /* Estructura Base */
  .inmublia-admin-layout { display: flex; min-height: 100vh; background-color: var(--inmublia-bg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--inmublia-black); }
  
  /* Sidebar */
  .inmublia-sidebar { width: 260px; background: var(--inmublia-card); display: none; flex-direction: column; border-right: 1px solid var(--inmublia-border); flex-shrink: 0; z-index: 10; }
  @media (min-width: 768px) { .inmublia-sidebar { display: flex; } }
  .sidebar-logo-container { height: 90px; display: flex; align-items: center; padding: 0 32px; border-bottom: 1px solid var(--inmublia-border); }
  .sidebar-nav { padding: 32px 24px; display: flex; flex-direction: column; gap: 8px; }
  .nav-section-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 16px; padding-left: 12px; }
  .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: #64748B; border-radius: 8px; font-weight: 600; font-size: 13px; text-decoration: none; transition: all 0.2s ease; }
  .nav-link:hover { background: var(--inmublia-bg); color: var(--inmublia-black); }

  /* Main Content */
  .inmublia-main-content { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  
  /* Header */
  .main-header { height: 90px; background: var(--inmublia-card); border-bottom: 1px solid var(--inmublia-border); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; flex-shrink: 0; z-index: 20; }
  .header-title-block { display: flex; align-items: center; gap: 20px; }
  .btn-back-icon { color: #94A3B8; transition: color 0.2s; display: flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; }
  .btn-back-icon:hover { color: var(--inmublia-black); background: var(--inmublia-bg); }
  .header-primary-text { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; margin: 0 0 2px 0; }
  .header-secondary-text { font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
  
  .btn-primary-action { background: var(--inmublia-black); color: white; border: none; border-radius: 0px; padding: 12px 24px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
  .btn-primary-action:hover:not(:disabled) { background: #262626; }
  .btn-primary-action:disabled { opacity: 0.7; cursor: not-allowed; }
  
  .loading-ring { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 10px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Content Area */
  .content-scroll-area { flex: 1; overflow-y: auto; padding: 40px; }
  .form-container-wrapper { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; }

  /* Cards */
  .luxury-form-card { background: var(--inmublia-card); border: 1px solid var(--inmublia-border); border-radius: 0px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
  .card-header-block { padding: 28px 32px; border-bottom: 1px solid var(--inmublia-border); background: #FCFDFE; display: flex; align-items: flex-start; gap: 16px; }
  .header-icon-wrap { background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--inmublia-border); color: var(--inmublia-black); box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
  .card-title-text { font-size: 16px; font-weight: 800; margin: 0 0 4px 0; color: var(--inmublia-black); }
  .card-subtitle-text { font-size: 13px; color: #64748B; margin: 0; font-weight: 500; }
  .card-body-block { padding: 32px; }

  /* Grids */
  .input-grid-2col { display: grid; grid-template-columns: 1fr; gap: 24px; }
  .input-grid-3col { display: grid; grid-template-columns: 1fr; gap: 24px; }
  .input-grid-1col { display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media (min-width: 640px) {
    .input-grid-2col { grid-template-columns: repeat(2, 1fr); }
    .input-grid-3col { grid-template-columns: repeat(3, 1fr); }
    .col-span-full { grid-column: 1 / -1; }
  }

  /* Form Elements */
  .inmublia-label { display: block; font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
  
  .inmublia-input, .inmublia-textarea, .inmublia-select { width: 100%; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 0px; padding: 14px 16px; font-size: 14px; font-weight: 500; color: var(--inmublia-black); outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
  .inmublia-input::placeholder, .inmublia-textarea::placeholder { color: #94A3B8; font-weight: 400; }
  .inmublia-input:focus, .inmublia-textarea:focus, .inmublia-select:focus { border-color: var(--inmublia-black); box-shadow: 0 0 0 1px var(--inmublia-black); }
  
  /* Selectors Customizados */
  .inmublia-select-wrapper { position: relative; }
  .inmublia-select { appearance: none; padding-right: 40px; cursor: pointer; }
  .inmublia-select-wrapper::after { content: ""; position: absolute; right: 16px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748B' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-size: contain; background-repeat: no-repeat; pointer-events: none; }

  /* Date Customizado */
  .inmublia-date-wrapper { position: relative; }
  .date-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: #64748B; pointer-events: none; }
  .date-input { padding-left: 48px; position: relative; }
  .date-input::-webkit-calendar-picker-indicator { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
  
  /* Input con Icono Frontal */
  .inmublia-input-wrapper-icon { position: relative; }
  .input-prefix-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 20px; height: 20px; color: #64748B; pointer-events: none; }
  .inmublia-input.with-icon { padding-left: 48px; }
  
  .inmublia-textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
</style>
