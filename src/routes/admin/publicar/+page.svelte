<script>
  import { Sparkles, Send, Image as ImageIcon, AlertTriangle, CheckCircle2, Instagram, Loader2 } from 'lucide-svelte';

  let { data } = $props();
  let propiedades = $derived(data.propiedades);
  let igConectado = $derived(data.igConectado);
  let tokensDisponibles = $state(data.tokens);

  let propiedadSeleccionadaId = $state('');
  let propiedadActiva = $derived(propiedades.find(p => p.id === propiedadSeleccionadaId));
  
  let imagenSeleccionada = $state('');
  let captionFinal = $state('');
  
  let generando = $state(false);
  let publicando = $state(false);
  let mensajeExito = $state('');
  let errorMsg = $state('');

  // 🛡️ UX Fix (Bug 8): Resetear formulario al cambiar de propiedad para evitar cruces
  $effect(() => {
    if (propiedadSeleccionadaId) {
      imagenSeleccionada = '';
      captionFinal = '';
      errorMsg = '';
      mensajeExito = '';
    }
  });

  async function generarTextoIA() {
    if (!propiedadActiva) return;
    errorMsg = '';
    generando = true;
    
    // Armamos un resumen rápido para la IA
    const caracteristicas = `${propiedadActiva.titulo}. Precio: $${propiedadActiva.precio}. ${propiedadActiva.recamaras} recámaras, ${propiedadActiva.banos} baños. ${propiedadActiva.descripcion || ''}`;

    try {
      const res = await fetch('/api/ai/generar-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caracteristicas_inmueble: caracteristicas })
      });
      const dataRes = await res.json();
      
      if (!res.ok) throw new Error(dataRes.error || 'Error al generar texto');
      
      captionFinal = dataRes.caption;
      
      // 🛡️ FIX (Bug 4): Sincronizar el saldo descontado real desde el servidor
      if (dataRes.tokens_restantes !== undefined) {
        tokensDisponibles = dataRes.tokens_restantes; 
      }
    } catch (err) {
      errorMsg = err.message;
    } finally {
      generando = false;
    }
  }

  async function publicarInstagram() {
    if (!imagenSeleccionada || !captionFinal) {
      errorMsg = 'Selecciona una imagen y asegúrate de tener un texto.';
      return;
    }
    
    errorMsg = '';
    publicando = true;
    mensajeExito = '';

    try {
      // 🛡️ FIX (Bug 1): Se asegura que el endpoint no busque la carpeta /auth/
      const res = await fetch('/api/instagram/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image_url: imagenSeleccionada, 
          caption: captionFinal 
        })
      });
      const dataRes = await res.json();
      
      if (!res.ok) throw new Error(dataRes.error || 'Fallo al publicar');
      
      mensajeExito = '¡Propiedad publicada exitosamente en Instagram!';
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

<!-- Fondo general claro (Homologado con Reportes) -->
<div class="fixed inset-0 bg-slate-50 -z-10 pointer-events-none"></div>

<div class="w-full h-screen overflow-y-auto flex-1 flex flex-col font-sans pb-12 animate-[fadeIn_0.3s_ease-out]">
  
  <!-- ENCABEZADO PANORÁMICO -->
  <header class="w-full bg-zinc-950 text-white pt-8 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1400px] mx-auto relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-50 flex items-center gap-3">
          <Send class="w-7 h-7 text-blue-400" />
          Marketing en Redes
        </h1>
        <p class="text-sm font-medium text-zinc-400 mt-1 flex items-center gap-2">
          Difunde tu inventario en Instagram con textos optimizados por Inteligencia Artificial.
        </p>
      </div>
      
      <!-- WIDGET SUPERIOR DERECHO (Créditos IA) -->
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

  <!-- CONTENIDO PRINCIPAL -->
  <main class="w-full flex-1 flex flex-col relative z-20 -mt-16">
    <div class="w-full max-w-[1400px] mx-auto px-4 sm:px-10 space-y-6">
      
      <!-- Contenedor centrado para que el formulario no se estire demasiado -->
      <div class="max-w-4xl">
        
        {#if !igConectado}
          <div class="bg-rose-50 border border-rose-100 rounded-3xl p-6 mb-8 flex items-start gap-4 shadow-sm">
            <AlertTriangle class="w-6 h-6 text-rose-500 shrink-0" />
            <div>
              <h3 class="text-rose-600 font-bold mb-1">Instagram no vinculado</h3>
              <p class="text-sm text-slate-600 mb-4 font-medium">Debes conectar tu cuenta profesional de Instagram para poder publicar desde Inmublia.</p>
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

          <!-- TARJETA DEL FORMULARIO (Estilo claro homologado) -->
          <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-8">
            
            <!-- PASO 1: Selección de Propiedad -->
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
              <!-- PASO 2: Selección de Imagen -->
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

              <!-- PASO 3: Generación de Texto -->
              <div class="mb-10">
                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">3. Texto de la Publicación</label>

                <div class="flex flex-col gap-4">
                  <button 
                    onclick={generarTextoIA} 
                    disabled={generando || tokensDisponibles <= 0}
                    class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {#if generando}
                      <Loader2 class="w-5 h-5 animate-spin" /> Redactando con IA...
                    {:else}
                      <Sparkles class="w-5 h-5" /> Autogenerar con Inteligencia Artificial (1 Crédito)
                    {/if}
                  </button>

                  <textarea 
                    bind:value={captionFinal}
                    rows="5"
                    placeholder="El texto de tu publicación aparecerá aquí. Puedes editarlo libremente antes de enviar..."
                    class="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl p-4 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 resize-none transition-colors"
                  ></textarea>
                </div>
              </div>

              <!-- PASO 4: Publicar -->
              <div class="pt-8 border-t border-slate-100">
                <button 
                  onclick={publicarInstagram}
                  disabled={publicando || !captionFinal || !imagenSeleccionada}
                  class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4.5 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {#if publicando}
                    <Loader2 class="w-5 h-5 animate-spin" /> Enviando a los servidores de Meta...
                  {:else}
                    <Instagram class="w-5 h-5" /> Publicar en Instagram @{data.igUsername}
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
