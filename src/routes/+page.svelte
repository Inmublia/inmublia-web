<script>
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

<!-- ========================================== -->
<!-- VISTA BOUTIQUE (MARCA BLANCA PARA BROKERS) -->
<!-- ========================================== -->
{#if broker}
  <!-- Globo Flotante de WhatsApp Oficial -->
  {#if broker.whatsapp}
    <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group" aria-label="Contactar por WhatsApp">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      <span class="absolute right-full mr-4 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">Chatea conmigo</span>
    </a>
  {/if}

  <main class="min-h-screen bg-slate-50 font-sans">
    <div class="relative bg-slate-900 overflow-hidden">
      <div class="absolute inset-0">
        <img class="w-full h-full object-cover opacity-40" src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2000&auto=format&fit=crop" alt="Real Estate Background">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90"></div>
      </div>
      <div class="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl font-black text-white tracking-tight sm:text-6xl md:text-7xl uppercase drop-shadow-lg">{broker.nombre_comercial}</h1>
        <p class="mt-6 max-w-3xl mx-auto text-xl text-slate-300 font-medium tracking-wide">Encuentra la propiedad que define tu estilo de vida.</p>
        <div class="mt-10 max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-2 sm:p-4 flex flex-col sm:flex-row gap-2">
          <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ubicación</label>
            <input type="text" placeholder="¿Dónde quieres vivir?" class="w-full focus:outline-none text-slate-900 font-medium bg-transparent">
          </div>
          <div class="flex-1 px-4 py-2 text-left border-b sm:border-b-0 sm:border-r border-slate-200">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tipo</label>
            <select class="w-full focus:outline-none text-slate-900 font-medium bg-transparent appearance-none cursor-pointer"><option>Casa</option><option>Departamento</option></select>
          </div>
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-colors sm:w-auto w-full mt-2 sm:mt-0 flex items-center justify-center gap-2">Buscar</button>
        </div>
      </div>
    </div>
    
    <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-8">Colección Exclusiva</h2>
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div class="relative h-72 overflow-hidden">
              <div class="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">En Venta</div>
              <img class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" src={propiedad.imagen_url} alt={propiedad.titulo} />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <div class="absolute bottom-4 left-4 right-4 text-white">
                <p class="text-3xl font-black tracking-tight">${new Intl.NumberFormat('es-MX').format(propiedad.precio)} <span class="text-sm font-medium uppercase opacity-80">MXN</span></p>
              </div>
            </div>
            <div class="p-6 flex flex-col flex-1">
              <h3 class="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{propiedad.titulo}</h3>
              <p class="text-sm text-slate-500 mb-6">Jalisco, México</p>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </main>

<!-- ========================================== -->
<!-- VISTA GLOBAL INMUVIA (SAAS CORPORATIVO) -->
<!-- ========================================== -->
{:else}
  <main class="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
    
    <!-- Navbar Corporativo Glassmorphism -->
    <nav class="fixed w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="Inmuvia Icon" class="h-10 w-auto">
            <span class="text-2xl font-black text-slate-900 tracking-tighter">Inmuvia</span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Propiedades</a>
            <a href="#" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Directorio de Agencias</a>
            <a href="#" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Soluciones SaaS</a>
            <div class="h-6 w-px bg-slate-200"></div>
            <a href="#" class="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">Iniciar Sesión</a>
            <button class="bg-slate-900 hover:bg-blue-600 text-white text-sm font-bold py-2.5 px-6 rounded-full transition-all duration-300 shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30">
              Crear mi Agencia
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section SAAS B2B/B2C -->
    <div class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute inset-0 bg-slate-50"></div>
      <div class="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
        <div class="w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
      </div>
      <div class="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
        <div class="w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl"></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold text-sm mb-8 animate-fade-in-up">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          La red inmobiliaria de más rápido crecimiento
        </div>
        
        <h1 class="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight mb-8">
          El Sistema Operativo para <br class="hidden md:block">
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Bienes Raíces.</span>
        </h1>
        
        <p class="max-w-2xl mx-auto text-xl text-slate-600 mb-12 font-medium">
          Encuentra la propiedad de tus sueños en nuestro directorio global, o <b>potencia tu agencia</b> con un sitio web de marca blanca de clase mundial en segundos.
        </p>

        <!-- Buscador Global Flotante -->
        <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 p-3 flex flex-col md:flex-row gap-3">
          <div class="flex-1 px-5 py-3 text-left border-b md:border-b-0 md:border-r border-slate-100 hover:bg-slate-50 rounded-2xl transition-colors cursor-text">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ubicación o Agencia</label>
            <input type="text" placeholder="Ej. Guadalajara, Zapopan..." class="w-full focus:outline-none text-slate-900 font-bold bg-transparent placeholder:font-normal">
          </div>
          <div class="flex-1 px-5 py-3 text-left hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Categoría</label>
            <select class="w-full focus:outline-none text-slate-900 font-bold bg-transparent appearance-none cursor-pointer">
              <option>Comprar</option>
              <option>Rentar</option>
              <option>Preventas</option>
            </select>
          </div>
          <button class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-10 rounded-2xl transition-colors md:w-auto w-full flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            Explorar
          </button>
        </div>
      </div>
    </div>

    <!-- Sección de Pitch SaaS para Brokers (Cascarón) -->
    <div class="bg-slate-900 py-24 text-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Escala tu agencia con <span class="text-blue-400">tecnología Edge.</span>
            </h2>
            <p class="text-lg text-slate-400 mb-8 leading-relaxed">
              No contrates programadores. Con Inmuvia, obtienes tu propio dominio, un panel de control avanzado, y tus propiedades se publican automáticamente en nuestra red global. Rendimiento SEO perfecto, costo de inicio cero.
            </p>
            <ul class="space-y-4 mb-10">
              <li class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="font-medium text-slate-300">Sitio web Marca Blanca automatizado</span>
              </li>
              <li class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="font-medium text-slate-300">Integración con WhatsApp y CRM</span>
              </li>
              <li class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <span class="font-medium text-slate-300">Infraestructura global ultra rápida</span>
              </li>
            </ul>
            <button class="bg-white text-slate-900 hover:bg-blue-50 font-bold py-4 px-8 rounded-full transition-colors flex items-center gap-2">
              Ver Planes y Precios &rarr;
            </button>
          </div>
          
          <!-- Mockup Visual del SaaS -->
          <div class="relative">
            <div class="absolute inset-0 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-3xl transform rotate-3 scale-105 opacity-50 blur-lg"></div>
            <div class="relative bg-slate-800 border border-slate-700 rounded-3xl p-4 shadow-2xl">
              <div class="flex items-center gap-2 mb-4 px-2">
                <div class="w-3 h-3 rounded-full bg-red-500"></div>
                <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <div class="ml-4 text-xs text-slate-400 font-mono">agencia.inmuvia.com</div>
              </div>
              <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop" alt="Dashboard Mockup" class="rounded-xl opacity-90">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Novedades de la Red (Propiedades Globales) -->
    <div class="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Agregadas Recientemente</h2>
        <p class="mt-4 text-lg text-slate-500">Explora el inventario de las mejores agencias del país.</p>
      </div>

      {#if propiedades.length === 0}
        <div class="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
          <p class="text-lg text-slate-400 font-medium">Cargando la red de propiedades...</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {#each propiedades as propiedad}
            <a href="/{propiedad.slug}" class="group block">
              <div class="relative bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 border border-slate-100 overflow-hidden flex flex-col h-full transform hover:-translate-y-2">
                <div class="relative h-72 overflow-hidden">
                  <img class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src={propiedad.imagen_url} alt={propiedad.titulo} />
                  <div class="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                  
                  <!-- Etiqueta de Agencia Certificada -->
                  <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                    <span class="text-xs font-bold text-slate-800">Agencia Verificada</span>
                  </div>

                  <div class="absolute bottom-4 left-4 right-4 text-white">
                    <p class="text-3xl font-black tracking-tight">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
                  </div>
                </div>
                
                <div class="p-6">
                  <h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">{propiedad.titulo}</h3>
                  <p class="text-sm text-slate-500 mb-4 line-clamp-2">{propiedad.descripcion || 'Propiedad de alto nivel disponible en la red Inmuvia.'}</p>
                  
                  <div class="pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-bold text-blue-600">
                    <span>Ver detalles completos</span>
                    <svg class="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                  </div>
                </div>
              </div>
            </a>
          {/each}
        </div>
        <div class="mt-16 text-center">
          <button class="bg-white border-2 border-slate-200 text-slate-900 hover:border-slate-900 font-bold py-3 px-8 rounded-full transition-colors">
            Cargar más propiedades
          </button>
        </div>
      {/if}
    </div>

    <!-- Footer Simple -->
    <footer class="bg-white border-t border-slate-200 py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div class="flex items-center gap-2">
          <img src="/logo.png" alt="Inmuvia" class="h-6 w-auto grayscale opacity-60">
          <span class="text-slate-400 font-bold tracking-tight">© 2026 Inmuvia Global</span>
        </div>
        <div class="flex gap-6 text-sm font-medium text-slate-500">
          <a href="#" class="hover:text-slate-900">Términos</a>
          <a href="#" class="hover:text-slate-900">Privacidad</a>
          <a href="#" class="hover:text-slate-900">Soporte</a>
        </div>
      </div>
    </footer>
  </main>
{/if}
