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
      tokensDisponibles--; // Descontamos visualmente
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

<main class="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950 font-sans text-slate-200 p-8">
  <div class="max-w-4xl mx-auto w-full">
    
    <header class="mb-10">
      <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-3">
        <Send class="w-8 h-8 text-blue-500" /> Marketing en Redes
      </h1>
      <p class="text-sm font-medium text-slate-400 mt-2">Difunde tu inventario en Instagram con textos optimizados por Inteligencia Artificial.</p>
    </header>

    {#if !igConectado}
      <div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
        <AlertTriangle class="w-6 h-6 text-rose-500 shrink-0" />
        <div>
          <h3 class="text-rose-400 font-bold mb-1">Instagram no vinculado</h3>
          <p class="text-sm text-slate-300 mb-4">Debes conectar tu cuenta profesional de Instagram para poder publicar desde Inmublia.</p>
          <a href="/admin/configuracion/redes" class="inline-flex bg-slate-900 border border-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors">
            Ir a Configuración de Redes
          </a>
        </div>
      </div>
    {:else}

      {#if errorMsg}
        <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm p-4 rounded-xl mb-6 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4" /> {errorMsg}
        </div>
      {/if}

      {#if mensajeExito}
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl mb-6 flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4" /> {mensajeExito}
        </div>
      {/if}

      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl mb-8">
        <!-- PASO 1: Selección de Propiedad -->
        <div class="mb-8">
          <label for="propiedad" class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Selecciona una Propiedad</label>
          <select 
            id="propiedad" 
            bind:value={propiedadSeleccionadaId} 
            class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">-- Elige del inventario activo --</option>
            {#each propiedades as prop}
              <option value={prop.id}>{prop.titulo} - ${prop.precio}</option>
            {/each}
          </select>
        </div>

        {#if propiedadActiva}
          <!-- PASO 2: Selección de Imagen -->
          <div class="mb-8">
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Selecciona la Imagen a Publicar</label>
            
            {#if !propiedadActiva.imagenes || propiedadActiva.imagenes.length === 0}
              <div class="text-sm text-slate-500 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-2">
                <ImageIcon class="w-4 h-4" /> Esta propiedad no tiene imágenes cargadas.
              </div>
            {:else}
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                {#each propiedadActiva.imagenes as img}
                  <button 
                    class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all {imagenSeleccionada === img ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-transparent hover:border-slate-700'}"
                    onclick={() => imagenSeleccionada = img}
                  >
                    <img src={img} alt="Inmueble" class="w-full h-full object-cover" />
                    {#if imagenSeleccionada === img}
                      <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <CheckCircle2 class="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- PASO 3: Generación de Texto -->
          <div class="mb-8">
            <div class="flex items-center justify-between mb-3">
              <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">3. Texto de la Publicación</label>
              <div class="flex items-center gap-2 text-xs font-bold text-slate-500">
                <Sparkles class="w-4 h-4 text-purple-400" />
                {tokensDisponibles} Créditos IA
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <button 
                onclick={generarTextoIA} 
                disabled={generando || tokensDisponibles <= 0}
                class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {#if generando}
                  <Loader2 class="w-4 h-4 animate-spin" /> Redactando...
                {:else}
                  <Sparkles class="w-4 h-4" /> Autogenerar con Inteligencia Artificial (1 Crédito)
                {/if}
              </button>

              <textarea 
                bind:value={captionFinal}
                rows="5"
                placeholder="El texto de tu publicación aparecerá aquí. Puedes editarlo libremente antes de enviar..."
                class="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          <!-- PASO 4: Publicar -->
          <div class="pt-6 border-t border-slate-800">
            <button 
              onclick={publicarInstagram}
              disabled={publicando || !captionFinal || !imagenSeleccionada}
              class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
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
</main>
