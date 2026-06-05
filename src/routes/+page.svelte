<script>
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

<!-- ========================================== -->
<!-- VISTA BOUTIQUE (MARCA BLANCA PARA BROKERS) -->
<!-- ========================================== -->
{#if broker}
  {#if broker.whatsapp}
    <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group" aria-label="Contactar por WhatsApp">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
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
            <select class="w-full focus:outline-none text-slate-900 font-medium bg-transparent appearance-none cursor-pointer">
              <option>Casa</option><option>Departamento</option><option>Terreno</option>
            </select>
          </div>
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-colors sm:w-auto w-full mt-2 sm:mt-0 flex items-center justify-center gap-2">
            Buscar
          </button>
        </div>
      </div>
    </div>

    <!-- Categorías -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each ['Casas', 'Departamentos', 'Terrenos', 'Preventas'] as cat}
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center hover:border-blue-500 hover:shadow-md cursor-pointer transition-all">
            <h3 class="font-bold text-slate-800">{cat}</h3>
          </div>
        {/each}
      </div>
    </div>

    <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h2 class="text-3xl font-black text-slate-900 tracking-tight mb-8">Propiedades Destacadas</h2>
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
            </div>
          </a>
        {/each}
      </div>
    </div>

    <!-- TARJETA DEL ASESOR ACTUALIZADA -->
    <div class="bg-slate-900 text-white mt-12 py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="flex items-center gap-6">
          
          <!-- Avatar dinámico -->
          <div class="w-24 h-24 rounded-full bg-slate-700 border-4 border-slate-600 overflow-hidden shrink-0 shadow-lg">
            {#if broker.avatar_url}
              <img src={broker.avatar_url} alt="Foto del Asesor" class="w-full h-full object-cover">
            {:else}
              <img src="https://ui-avatars.com/api/?name={broker.nombre_comercial}&background=1e293b&color=fff&size=150" alt="Avatar Genérico" class="w-full h-full object-cover">
            {/if}
          </div>
          
          <!-- Info del Asesor -->
          <div>
            <h3 class="text-2xl font-bold">{broker.nombre_comercial}</h3>
            <p class="text-blue-400 font-medium mb-2">{broker.bio || 'Especialista en Bienes Raíces'}</p>
            
            <!-- Redes Sociales si están configuradas -->
            <div class="flex gap-4 mt-2">
              {#if broker.instagram}
                <a href={broker.instagram} target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white transition-colors text-sm font-medium">Instagram</a>
              {/if}
              {#if broker.linkedin}
                <a href={broker.linkedin} target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white transition-colors text-sm font-medium">LinkedIn</a>
              {/if}
            </div>
          </div>

        </div>
      </div>
    </div>
  </main>

<!-- ========================================== -->
<!-- VISTA INMUBLIA (EL ECOSISTEMA B2B PREMIUM) -->
<!-- ========================================== -->
{:else}
  <main class="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white">
    
    <!-- Navbar Premium Clara -->
    <nav class="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center gap-3">
            <!-- Logo original sin filtros raros -->
            <img src="/logo.png" alt="Inmublia Icon" class="h-10 w-auto">
            <span class="text-2xl font-black text-slate-900 tracking-tighter">Inmublia</span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#soluciones" class="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Soluciones para Brokers</a>
            <div class="h-5 w-px bg-slate-200"></div>
            <!-- Acceso claro al panel de Admin / Login -->
            <a href="/login" class="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">Ingresar a mi Consola</a>
            <button class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 px-6 rounded-full transition-all duration-300 shadow-lg shadow-blue-600/30">
              Crear mi Agencia
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero B2B Luminoso -->
    <div class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div class="absolute inset-0 bg-slate-50/50"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-sm font-bold mb-8">
          La infraestructura definitiva para profesionales
        </div>
        
        <h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[1.1] mb-8">
          Independiza tu<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Negocio Inmobiliario.</span>
        </h1>
        
        <p class="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-12 font-medium leading-relaxed">
          Inmublia te proporciona tu propio ecosistema digital. Deja de publicar en portales donde compites contra miles. Obtén tu propia marca, landing pages de alto impacto y una consola de gestión profesional.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#planes" class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg shadow-xl shadow-slate-900/20">
            Comenzar mi Agencia
          </a>
        </div>
      </div>
    </div>

    <!-- Productos y Soluciones -->
    <div id="soluciones" class="bg-white py-24 border-t border-slate-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Todo lo que tu agencia necesita para escalar</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <!-- Producto 1 -->
          <div class="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all">
            <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-slate-100">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-3">Tu Marca y Dominio</h3>
            <p class="text-slate-600 leading-relaxed">Conecta tu propio dominio (ej. tuagencia.com). Protegemos tu marca con certificados de seguridad SSL automáticos y un diseño premium exclusivo para ti.</p>
          </div>

          <!-- Producto 2 -->
          <div class="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all">
            <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-slate-100">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-3">Consola Administrativa</h3>
            <p class="text-slate-600 leading-relaxed">Un panel de control privado y fácil de usar. Gestiona tu inventario, sube fotografías de alta calidad y actualiza precios en tiempo real sin tocar código.</p>
          </div>

          <!-- Producto 3 -->
          <div class="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all">
            <div class="w-14 h-14 bg-white rounded-xl flex items-center justify-center text-blue-600 mb-6 shadow-sm border border-slate-100">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-3">Landing Pages por Propiedad</h3>
            <p class="text-slate-600 leading-relaxed">Cada casa que subes genera automáticamente una página optimizada para ventas y SEO. Perfectas para compartir en WhatsApp o lanzar campañas en Facebook.</p>
          </div>
        </div>
      </div>
    </div>
  </main>
{/if}
