<script>
  import { enhance } from '$app/forms';

  // Svelte 5 Runes: El estado reactivo de nueva generación
  let loading = $state(false);
  let imagePreview = $state(null);

  // Función para crear la vista previa de la imagen al instante
  function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) {
      imagePreview = URL.createObjectURL(file);
    } else {
      imagePreview = null;
    }
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <!-- Header Secundario -->
  <header class="h-20 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
    <a href="/admin" class="text-slate-400 hover:text-slate-900 transition-colors mr-4">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
    </a>
    <h1 class="text-xl font-black text-slate-900">Crear Nuevo Listado</h1>
  </header>

  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
      <div class="mb-8 border-b border-slate-100 pb-6">
        <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Detalles de la Propiedad</h2>
        <p class="text-slate-500 mt-1">Sube fotografías de alta calidad y completa la información para publicar en la red.</p>
      </div>

      <!-- El formulario se enviará al servidor con SvelteKit Actions -->
      <form method="POST" action="?/crear" enctype="multipart/form-data" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-8">
        
        <!-- Sección de Imagen con Preview Reactivo ($state) -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-3">Fotografía Principal</label>
          <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group">
            
            {#if imagePreview}
              <!-- Vista previa inyectada con Svelte 5 -->
              <img src={imagePreview} alt="Vista previa" class="absolute inset-0 w-full h-full object-cover z-10" />
              <div class="absolute inset-0 bg-slate-900/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span class="text-white font-bold">Clic para cambiar imagen</span>
              </div>
            {/if}

            <div class="space-y-1 text-center relative z-0">
              <svg class="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="flex text-sm text-slate-600 justify-center">
                <label for="imagen" class="relative cursor-pointer bg-white rounded-md font-bold text-blue-600 hover:text-blue-500 focus-within:outline-none z-30 px-2 py-1">
                  <span>Sube un archivo</span>
                  <!-- Input Oculto -->
                  <input id="imagen" name="imagen" type="file" accept="image/jpeg, image/png, image/webp" class="sr-only" required onchange={handleImageChange}>
                </label>
              </div>
              <p class="text-xs text-slate-500">PNG, JPG o WEBP hasta 5MB</p>
            </div>
          </div>
        </div>

        <!-- Campos de Texto -->
        <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="titulo" class="block text-sm font-bold text-slate-700 mb-2">Título de la Publicación</label>
            <input type="text" name="titulo" id="titulo" required placeholder="Ej. Residencia de Lujo en Zapopan" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
          </div>

          <div class="sm:col-span-2">
            <label for="precio" class="block text-sm font-bold text-slate-700 mb-2">Precio (MXN)</label>
            <div class="relative rounded-xl shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="text-slate-500 sm:text-sm font-bold">$</span>
              </div>
              <input type="number" name="precio" id="precio" required placeholder="5000000" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all">
            </div>
          </div>

          <div class="sm:col-span-2">
            <label for="descripcion" class="block text-sm font-bold text-slate-700 mb-2">Descripción Completa</label>
            <textarea id="descripcion" name="descripcion" rows="4" placeholder="Describe los acabados, ubicación y ventajas de la propiedad..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-100 flex justify-end">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 px-6 rounded-xl transition-colors mr-4">Cancelar</a>
          
          <button type="submit" disabled={loading} class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center gap-2">
            {#if loading}
              <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Publicando...
            {:else}
              Publicar Propiedad
            {/if}
          </button>
        </div>
      </form>
      
    </div>
  </main>
</div>
