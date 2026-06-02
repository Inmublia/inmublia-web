<script>
  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let broker = $derived(data.broker);
</script>

<!-- ========================================== -->
<!-- VISTA BOUTIQUE (MARCA BLANCA PARA BROKERS) -->
<!-- ========================================== -->
{#if broker}
  <!-- Globo Flotante de WhatsApp -->
  {#if broker.whatsapp}
    <a href="https://wa.me/{broker.whatsapp}" target="_blank" class="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] hover:scale-110 hover:-translate-y-1 transition-all duration-300 z-50 flex items-center justify-center group" aria-label="Contactar por WhatsApp">
      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
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
        <p class="mt-6 max-w-3xl mx-auto text-xl text-slate-300 font-medium tracking-wide">Colección exclusiva de propiedades.</p>
      </div>
    </div>
    
    <div class="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {#each propiedades as propiedad}
          <a href="/{propiedad.slug}" class="group block bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100 overflow-hidden flex flex-col h-full">
            <div class="relative h-72 overflow-hidden">
              <img class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" src={propiedad.imagen_url} alt={propiedad.titulo} />
              <div class="absolute bottom-4 left-4 right-4 text-white drop-shadow-md">
                <p class="text-3xl font-black tracking-tight">${new Intl.NumberFormat('es-MX').format(propiedad.precio)}</p>
              </div>
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{propiedad.titulo}</h3>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </main>

<!-- ========================================== -->
<!-- VISTA INMUBLIA (EL ECOSISTEMA B2B PREMIUM) -->
<!-- ========================================== -->
{:else}
  <main class="min-h-screen bg-[#050505] font-sans selection:bg-blue-500 selection:text-white text-slate-300 overflow-hidden">
    
    <!-- Navbar Premium Dark -->
    <nav class="fixed w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-20">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="Inmublia Icon" class="h-8 w-auto brightness-0 invert">
            <span class="text-2xl font-black text-white tracking-tighter">Inmublia</span>
          </div>
          <div class="hidden md:flex items-center space-x-8">
            <a href="#" class="text-sm font-bold text-slate-400 hover:text-white transition-colors">La Plataforma</a>
            <a href="#" class="text-sm font-bold text-slate-400 hover:text-white transition-colors">Beneficios</a>
            <div class="h-5 w-px bg-white/10"></div>
            <a href="/login" class="text-sm font-bold text-white hover:text-blue-400 transition-colors">Ingresar</a>
            <button class="bg-white hover:bg-slate-200 text-[#050505] text-sm font-black py-2.5 px-6 rounded-full transition-all duration-300">
              Unete a la Red
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero B2B Dark -->
    <div class="relative pt-40 pb-20 lg:pt-56 lg:pb-32">
      <!-- Luces ambientales de fondo -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 text-sm font-medium mb-8 backdrop-blur-md">
          <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          El estándar para el broker independiente
        </div>
        
        <h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.1] mb-8">
          Tu Agencia.<br>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">A Otro Nivel.</span>
        </h1>
        
        <p class="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-12 font-medium leading-relaxed">
          Deja de pagar rentas en portales saturados donde eres uno más. Inmublia te entrega una infraestructura digital de clase mundial, con tu propio dominio, bajo tu propia marca.
        </p>

        <div class="flex flex-col sm:flex-row justify-center gap-4">
          <a href="/admin" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-full transition-all duration-300 text-lg shadow-[0_0_40px_rgba(37,99,235,0.3)]">
            Comenzar Ahora
          </a>
          <button class="bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold py-4 px-10 rounded-full transition-colors text-lg">
            Ver Demo
          </button>
        </div>
      </div>
    </div>

    <!-- Features Showcase (Dark Mode) -->
    <div class="border-t border-white/5 bg-[#0a0a0a] py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-3 gap-8">
          <div class="p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-colors">
            <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Dominio Propio</h3>
            <p class="text-slate-400 leading-relaxed">Tu inventario vive en tu.agencia.com. Control total sobre tus enlaces y un SEO impecable al compartir en redes.</p>
          </div>
          <div class="p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-colors">
            <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Consola Privada</h3>
            <p class="text-slate-400 leading-relaxed">Sube tus propiedades en un panel de control intuitivo y elegante. Los cambios se reflejan en tiempo real.</p>
          </div>
          <div class="p-8 rounded-3xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-colors">
            <div class="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-white mb-3">Conexión Directa</h3>
            <p class="text-slate-400 leading-relaxed">Cero intermediarios. Cada botón de contacto y globo de chat envía a los prospectos directamente a tu WhatsApp personal.</p>
          </div>
        </div>
      </div>
    </div>
  </main>
{/if}
