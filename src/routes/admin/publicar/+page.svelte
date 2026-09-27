<script>
  import { Sparkles, Send, Image as ImageIcon, AlertTriangle, CheckCircle2, Instagram, Facebook, Video, Loader2 } from 'lucide-svelte';

  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let redes = $derived(data.redes); // 🚀 FIX: Recibimos el objeto de redes completo
  let tokensDisponibles = $state(data.tokens);

  // 🚀 FIX: Estado para controlar en qué red estamos trabajando actualmente
  let plataformaSeleccionada = $state('instagram');
  let redActual = $derived(redes[plataformaSeleccionada]);

  let propiedadSeleccionadaId = $state('');
  let propiedadActiva = $derived(propiedades.find(p => p.id === propiedadSeleccionadaId));
  
  let imagenSeleccionada = $state('');
  let captionFinal = $state('');
  
  let generando = $state(false);
  let publicando = $state(false);
  let mensajeExito = $state('');
  let errorMsg = $state('');

  // 🛡️ Resetear formulario al cambiar de propiedad o de red social
  $effect(() => {
    if (propiedadSeleccionadaId || plataformaSeleccionada) {
      // Solo borramos el error y éxito al cambiar de pestaña, mantenemos los datos si cambias de red para no perder el progreso
      errorMsg = '';
      mensajeExito = '';
    }
  });

  async function generarTextoIA() {
    if (!propiedadActiva) return;
    errorMsg = '';
    generando = true;
    
    const caracteristicas = `${propiedadActiva.titulo}. Precio: $${propiedadActiva.precio}. ${propiedadActiva.recamaras} recámaras, ${propiedadActiva.banos} baños. ${propiedadActiva.descripcion || ''}`;

    try {
      const res = await fetch('/api/ai/generar-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🚀 FIX: Le decimos a la IA para qué red específica estamos redactando
        body: JSON.stringify({ 
          caracteristicas_inmueble: caracteristicas,
          plataforma: plataformaSeleccionada 
        })
      });
      const dataRes = await res.json();
      
      if (!res.ok) throw new Error(dataRes.error || 'Error al generar texto');
      
      captionFinal = dataRes.caption;
      
      if (dataRes.tokens_restantes !== undefined) {
        tokensDisponibles = dataRes.tokens_restantes; 
      }
    } catch (err) {
      errorMsg = err.message;
    } finally {
      generando = false;
    }
  }

  async function publicarEnRed() {
    if (!imagenSeleccionada || !captionFinal) {
      errorMsg = 'Selecciona una imagen y asegúrate de tener un texto.';
      return;
    }
    
    errorMsg = '';
    publicando = true;
    mensajeExito = '';

    try {
      // 🚀 FIX: Ruteo dinámico. Si es FB va a /api/facebook/publicar, si es IG va a /api/instagram/publicar
      const res = await fetch(`/api/${plataformaSeleccionada}/publicar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_url: imagenSeleccionada, 
          caption: captionFinal 
        })
      });
      const dataRes = await res.json();
      
      if (!res.ok) throw new Error(dataRes.error || 'Fallo al publicar');
      
      mensajeExito = `¡Propiedad publicada exitosamente en ${plataformaSeleccionada.toUpperCase()}!`;
      captionFinal = '';
      imagenSeleccionada = '';
      propiedadSeleccionadaId = '';
    } catch (err) {
      errorMsg = err.message;
    } finally {
      publicando = false;
    }
  }
</script>

<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
          <Send class="w-7 h-7 text-blue-400" />
          Marketing en Redes
        </h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          Difunde tu inventario en múltiples plataformas con textos optimizados por IA.
        </p>
      </div>
      
      <div class="bg-white/10 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
          <Sparkles class="w-5 h-5" />
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Créditos IA</p>
          <p class="text-lg font-black text-white">{tokensDisponibles} <span class="text-xs font-medium text-zinc-500 ml-1">disponibles</span></p>
        </div>
      </div>
    </div>
  </header>

  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">
      <div class="max-w-4xl">

        <!-- 🚀 FIX: Selector dinámico de plataformas -->
        <div class="bg-white border border-slate-200 rounded-3xl p-2 shadow-sm mb-6 flex gap-2">
          <button 
            onclick={() => plataformaSeleccionada = 'instagram'}
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all {plataformaSeleccionada === 'instagram' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}"
          >
            <Instagram class="w-5 h-5" /> Instagram
          </button>
          <button 
            onclick={() => plataformaSeleccionada = 'facebook'}
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all {plataformaSeleccionada === 'facebook' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}"
          >
            <Facebook class="w-5 h-5" /> Facebook
          </button>
          <button 
            onclick={() => plataformaSeleccionada = 'tiktok'}
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all {plataformaSeleccionada === 'tiktok' ? 'bg-zinc-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}"
          >
            <Video class="w-5 h-5" /> TikTok
          </button>
        </div>
        
        {#if !redActual}
          <div class="bg-rose-50 border border-rose-100 rounded-3xl p-6 mb-8 flex items-start gap-4 shadow-sm">
            <AlertTriangle class="w-6 h-6 text-rose-500 shrink-0" />
            <div>
              <h3 class="text-rose-600 font-bold mb-1 capitalize">{plataformaSeleccionada} no vinculado</h3>
              <p class="text-sm text-slate-600 mb-4 font-medium">Debes conectar tu cuenta profesional de {plataformaSeleccionada} para poder publicar.</p>
              <a href="/admin/configuracion/redes" class="inline-flex bg-slate-900 border border-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                Ir a Configuración de Redes
              </a>
            </div>
          </div>
        {:else}

          {#if errorMsg}
            <div class="bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm">
              <AlertTriangle class="w-5 h-5 shrink-0" /> {errorMsg}
            </div>
          {/if}

          {#if mensajeExito}
            <div class="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-semibold p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm">
              <CheckCircle2 class="w-5 h-5 shrink-0" /> {mensajeExito}
            </div>
          {/if}

          <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-8">
            
            <!-- PASO 1 -->
            <div class="mb-10">
              <label for="propiedad" class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Selecciona una Propiedad</label>
              <select 
                id="propiedad" 
                bind:value={propiedadSeleccionadaId} 
                class="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer hover:bg-slate-100"
              >
                <option value="">-- Elige del inventario activo --</option>
                {#each propiedades as prop}
                  <option value={prop.id}>{prop.titulo} - ${prop.precio}</option>
                {/each}
              </select>
            </div>

            {#if propiedadActiva}
              <!-- PASO 2 -->
              <div class="mb-10">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Selecciona la Imagen a Publicar</label>
                
                {#if !propiedadActiva.galeria_urls || propiedadActiva.galeria_urls.length === 0}
                  <div class="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <ImageIcon class="w-5 h-5 text-slate-400" /> Esta propiedad no tiene imágenes cargadas.
                  </div>
                {:else}
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {#each propiedadActiva.galeria_urls as img}
                      <button 
                        class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all group {imagenSeleccionada === img ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-100 hover:border-slate-300'}"
                        onclick={() => imagenSeleccionada = img}
                      >
                        <img src={img} alt="Inmueble" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {#if imagenSeleccionada === img}
                          <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center backdrop-blur-[2px]">
                            <CheckCircle2 class="w-10 h-10 text-white drop-shadow-md" />
                          </div>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <!-- PASO 3 -->
              <div class="mb-10">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">3. Texto de la Publicación</label>

                <div class="flex flex-col gap-4">
                  <button 
                    onclick={generarTextoIA} 
                    disabled={generando || tokensDisponibles <= 0}
                    class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {#if generando}
                      <Loader2 class="w-5 h-5 animate-spin" /> Redactando con IA para {plataformaSeleccionada}...
                    {:else}
                      <Sparkles class="w-5 h-5" /> Autogenerar texto para {plataformaSeleccionada} (1 Crédito)
                    {/if}
                  </button>

                  <textarea 
                    bind:value={captionFinal}
                    rows="5"
                    placeholder="El texto optimizado para {plataformaSeleccionada} aparecerá aquí..."
                    class="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl p-4 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
                  ></textarea>
                </div>
              </div>

              <!-- PASO 4 -->
              <div class="pt-8 border-t border-slate-100">
                <button 
                  onclick={publicarEnRed}
                  disabled={publicando || !captionFinal || !imagenSeleccionada}
                  class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {#if publicando}
                    <Loader2 class="w-5 h-5 animate-spin" /> Enviando a los servidores...
                  {:else}
                    <Send class="w-5 h-5" /> Publicar en {plataformaSeleccionada} @{redActual.username}
                  {/if}
                </button>
              </div>
            {/if}
          </div>

        {/if}
      </div>
    </div>
  </main>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
