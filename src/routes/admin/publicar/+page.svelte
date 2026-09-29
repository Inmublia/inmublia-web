<!-- src/routes/admin/publicar/+page.svelte -->
<script>
  import { Sparkles, Send, Image as ImageIcon, AlertTriangle, CheckCircle2, Instagram, Facebook, Video, Loader2 } from 'lucide-svelte';

  // 🚀 Importamos la cabecera universal
  import PageHeader from '$lib/components/PageHeader.svelte';

  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let redes = $derived(data.redes); 
  let tokensDisponibles = $state(data.tokens);

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

  $effect(() => {
    propiedadSeleccionadaId; 
    imagenSeleccionada = '';
    captionFinal = '';
    errorMsg = '';
    mensajeExito = '';
  });

  $effect(() => {
    plataformaSeleccionada; 
    errorMsg = '';
    mensajeExito = '';
  });

  async function generarTextoIA() {
    if (!propiedadActiva) return;
    errorMsg = '';
    generando = true;
    
    const precioFormateado = propiedadActiva.precio ? Number(propiedadActiva.precio).toLocaleString('es-MX') : null;
    const partes = [
      propiedadActiva.titulo,
      precioFormateado ? `Precio: $${precioFormateado}` : null,
      propiedadActiva.recamaras ? `${propiedadActiva.recamaras} recámaras` : null,
      propiedadActiva.banos ? `${propiedadActiva.banos} baños` : null,
      propiedadActiva.descripcion?.trim() || null
    ].filter(Boolean);

    const caracteristicas = partes.join('\n');

    try {
      const res = await fetch('/api/ai/generar-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    
    const PLATAFORMAS_VALIDAS = ['instagram', 'facebook'];
    if (!PLATAFORMAS_VALIDAS.includes(plataformaSeleccionada)) {
      errorMsg = 'Plataforma no disponible por el momento.';
      return;
    }

    errorMsg = '';
    publicando = true;
    mensajeExito = '';

    try {
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
      
      const NOMBRES_RED = { instagram: 'Instagram', facebook: 'Facebook' };
      mensajeExito = `¡Publicado exitosamente en ${NOMBRES_RED[plataformaSeleccionada]}!`;
      captionFinal = '';
      imagenSeleccionada = '';
    } catch (err) {
      errorMsg = err.message;
    } finally {
      publicando = false;
    }
  }
</script>

<div class="fixed inset-0 w-screen h-screen bg-slate-50 dark:bg-zinc-950 -z-10 pointer-events-none transition-colors duration-300"></div>

<!-- Arquitectura Split-Screen B2B (Bloqueamos el scroll global en Desktop) -->
<div class="w-full flex flex-col font-sans text-slate-900 dark:text-zinc-100 animate-[fadeIn_0.3s_ease-out] relative min-h-screen lg:h-screen lg:overflow-hidden">
  
  <!-- ============================================== -->
  <!-- ZONA SUPERIOR ESTÁTICA                         -->
  <!-- ============================================== -->
  <div class="w-full shrink-0 flex flex-col relative z-30 pb-2 lg:pb-4 transition-colors duration-300">
    
    <PageHeader title="Marketing en Redes" icon={Send}>
      {#snippet subtitle()}
        Difunde tu inventario en múltiples plataformas con textos optimizados por IA.
      {/snippet}

      {#snippet actions()}
        <div class="bg-white dark:bg-zinc-900/50 backdrop-blur-md border border-slate-200 dark:border-zinc-800 px-5 py-3 rounded-2xl flex items-center gap-4 transition-colors shadow-sm">
          <div class="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Créditos IA</p>
            <p class="text-lg font-black text-slate-900 dark:text-white">{tokensDisponibles} <span class="text-xs font-medium text-slate-400 dark:text-zinc-500 ml-1">disponibles</span></p>
          </div>
        </div>
      {/snippet}
    </PageHeader>
  </div>

  <!-- ============================================== -->
  <!-- ZONA INFERIOR SCROLLABLE INDEPENDIENTE         -->
  <!-- ============================================== -->
  <main class="w-full flex-1 relative z-20 pt-4 pb-12 overflow-visible lg:overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent" style="-webkit-mask-image: linear-gradient(to bottom, transparent, black 16px, black); mask-image: linear-gradient(to bottom, transparent, black 16px, black);">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">
      <div class="max-w-4xl">

        <div class="bg-white dark:bg-zinc-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-zinc-800/60 rounded-3xl p-2 shadow-sm mb-6 flex gap-2 transition-colors">
          <button 
            onclick={() => plataformaSeleccionada = 'instagram'}
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all {plataformaSeleccionada === 'instagram' ? 'bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-md dark:shadow-none' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'}"
          >
            <Instagram class="w-5 h-5" /> Instagram
          </button>
          <button 
            onclick={() => plataformaSeleccionada = 'facebook'}
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all {plataformaSeleccionada === 'facebook' ? 'bg-blue-600 text-white shadow-md dark:shadow-none' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'}"
          >
            <Facebook class="w-5 h-5" /> Facebook
          </button>
          
          <button 
            disabled
            class="flex-1 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-slate-300 dark:text-zinc-600 cursor-not-allowed relative border border-dashed border-slate-200 dark:border-zinc-700 transition-colors"
          >
            <Video class="w-5 h-5" /> TikTok
            <span class="absolute -top-2 -right-1 text-[9px] bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest transition-colors">
              Pronto
            </span>
          </button>
        </div>
        
        {#if !redActual}
          <div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-3xl p-6 mb-8 flex items-start gap-4 shadow-sm transition-colors">
            <AlertTriangle class="w-6 h-6 text-rose-500 dark:text-rose-400 shrink-0" />
            <div>
              <h3 class="text-rose-600 dark:text-rose-400 font-bold mb-1 capitalize">{plataformaSeleccionada} no vinculado</h3>
              <p class="text-sm text-slate-600 dark:text-zinc-400 mb-4 font-medium">Debes conectar tu cuenta profesional de {plataformaSeleccionada} para poder publicar.</p>
              <a href="/admin/perfil" class="inline-flex bg-slate-900 dark:bg-white border border-slate-800 dark:border-white text-white dark:text-zinc-900 text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm">
                Ir a Configuración de Redes
              </a>
            </div>
          </div>
        {:else}

          {#if errorMsg}
            <div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm transition-colors">
              <AlertTriangle class="w-5 h-5 shrink-0" /> {errorMsg}
            </div>
          {/if}

          {#if mensajeExito}
            <div class="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm transition-colors">
              <CheckCircle2 class="w-5 h-5 shrink-0" /> {mensajeExito}
            </div>
          {/if}

          <!-- Fondo sólido aquí para evitar lodo visual -->
          <div class="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm mb-8 transition-colors">
            
            <div class="mb-10">
              <label for="propiedad" class="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 transition-colors">1. Selecciona una Propiedad</label>
              <select 
                id="propiedad" 
                bind:value={propiedadSeleccionadaId} 
                class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-semibold rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-700"
              >
                <option value="">-- Elige del inventario activo --</option>
                {#each propiedades as prop}
                  <option value={prop.id}>{prop.titulo} - ${prop.precio}</option>
                {/each}
              </select>
            </div>

            {#if propiedadActiva}
              <div class="mb-10">
                <p class="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 transition-colors">2. Selecciona la Imagen a Publicar</p>
                
                {#if !propiedadActiva.galeria_urls || propiedadActiva.galeria_urls.length === 0}
                  <div class="text-sm text-slate-500 dark:text-zinc-400 font-medium bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-3 transition-colors">
                    <ImageIcon class="w-5 h-5 text-slate-400 dark:text-zinc-500" /> Esta propiedad no tiene imágenes cargadas.
                  </div>
                {:else}
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {#each propiedadActiva.galeria_urls as img}
                      <button 
                        class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all group {imagenSeleccionada === img ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600'}"
                        onclick={() => imagenSeleccionada = img}
                      >
                        <img src={img} alt="Inmueble" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        {#if imagenSeleccionada === img}
                          <div class="absolute inset-0 bg-indigo-500/20 flex items-center justify-center backdrop-blur-[2px]">
                            <CheckCircle2 class="w-10 h-10 text-white drop-shadow-md" />
                          </div>
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>

              <div class="mb-10">
                <label for="captionFinal" class="block text-xs font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3 transition-colors">3. Texto de la Publicación</label>

                <div class="flex flex-col gap-4">
                  <button 
                    onclick={generarTextoIA} 
                    disabled={generando || tokensDisponibles <= 0}
                    class="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {#if generando}
                      <Loader2 class="w-5 h-5 animate-spin" /> Redactando con IA para {plataformaSeleccionada}...
                    {:else}
                      <Sparkles class="w-5 h-5" /> Autogenerar texto para {plataformaSeleccionada} (1 Crédito)
                    {/if}
                  </button>

                  <textarea 
                    id="captionFinal"
                    bind:value={captionFinal}
                    rows="5"
                    placeholder="El texto optimizado para {plataformaSeleccionada} aparecerá aquí..."
                    class="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white font-medium rounded-xl p-4 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-zinc-500 shadow-inner"
                  ></textarea>
                </div>
              </div>

              <div class="pt-8 border-t border-slate-100 dark:border-zinc-800 transition-colors">
                <button 
                  onclick={publicarEnRed}
                  disabled={publicando || !captionFinal || !imagenSeleccionada}
                  class="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-zinc-900 font-black uppercase tracking-widest py-4 px-6 rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-zinc-800 disabled:text-slate-400 dark:disabled:text-zinc-600 disabled:border disabled:border-slate-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                >
                  {#if publicando}
                    <Loader2 class="w-5 h-5 animate-spin" /> Enviando a los servidores...
                  {:else}
                    <Send class="w-5 h-5" /> Publicar en {plataformaSeleccionada}{redActual.username ? ` @${redActual.username}` : ''}
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
