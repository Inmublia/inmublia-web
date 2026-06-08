<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
  let loading = $state(false);
  
  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);
  let isOculta = $state(false); // Estado para el interruptor de pre-mercado

  // Preview de Foto Principal
  function handleImageChange(event) {
    const file = event.target.files[0];
    imagePreview = file ? URL.createObjectURL(file) : null;
  }

  // Preview de Galería Múltiple
  function handleGaleriaChange(event) {
    const files = event.target.files;
    galeriaPreviews = Array.from(files).map(file => URL.createObjectURL(file));
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-blue-600 transition-colors mr-4 bg-slate-100 hover:bg-blue-50 p-2 rounded-lg" aria-label="Volver al inicio">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900">Crear Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100">{form.error}</div>
      {/if}

      <form method="POST" action="?/crear" enctype="multipart/form-data" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-10">
        
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-black text-indigo-900 mb-1 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              Visibilidad en el Catálogo
            </h3>
            <p class="text-[11px] text-indigo-700 font-medium">Si la ocultas, quedará en "Pre-Mercado". Ideal para lanzarla en un Open House antes de hacerla pública.</p>
          </div>
          
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0" for="is_oculta">
            <input type="checkbox" id="is_oculta" name="is_oculta" class="sr-only peer" bind:checked={isOculta}>
            <div class="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            <span class="ml-3 text-xs font-bold {isOculta ? 'text-indigo-600' : 'text-slate-500 uppercase tracking-widest'}">
              {isOculta ? 'Oculta (Pre-Mercado)' : 'Pública'}
            </span>
          </label>
        </div>

        <div class="space-y-6">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Material Visual</h3>
          
          <div>
            <label for="imagen_principal" class="block text-sm font-bold text-slate-700 mb-2">Fotografía Principal (Hero)</label>
            <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group h-48">
              {#if imagePreview}
                <img src={imagePreview} alt="Vista previa de portada" class="absolute inset-0 w-full h-full object-cover z-10" />
              {/if}
              <div class="relative z-20 bg-white/80 backdrop-blur-sm p-4 rounded-lg text-center">
                <span class="text-blue-600 font-bold cursor-pointer">Subir portada (1 foto)</span>
                <input id="imagen_principal" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onchange={handleImageChange}>
              </div>
            </div>
          </div>

          <div>
            <label for="galeria_input" class="block text-sm font-bold text-slate-700 mb-2">Galería Secundaria (Mosaico)</label>
            <div class="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative">
              <div class="text-center">
                <span class="text-blue-600 font-bold cursor-pointer">Seleccionar 3 a 5 fotos adicionales</span>
                <input id="galeria_input" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleGaleriaChange}>
              </div>
              {#if galeriaPreviews.length > 0}
                <div class="mt-4 grid grid-cols-4 gap-2 w-full">
                  {#each galeriaPreviews as preview, index}
                    <div class="aspect-square rounded-lg overflow-hidden bg-slate-100"><img src={preview} alt="Miniatura de la galería {index + 1}" class="w-full h-full object-cover"/></div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-slate-100">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Información Principal</h3>
          
          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="titulo" class="block text-sm font-bold text-slate-700 mb-2">Título de la Publicación</label>
              <input id="titulo" type="text" name="titulo" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100">
            </div>

            <div>
              <label for="operacion" class="block text-sm font-bold text-slate-700 mb-2">Operación</label>
              <select id="operacion" name="operacion" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label for="tipo" class="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
              <select id="tipo" name="tipo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>

            <div class="sm:col-span-2">
              <label for="precio" class="block text-sm font-bold text-slate-700 mb-2">Precio (MXN)</label>
              <input id="precio" type="number" name="precio" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100">
            </div>

            <div class="sm:col-span-2 flex items-center mt-2">
              <input type="checkbox" id="destacada" name="destacada" class="w-5 h-5 text-blue-600 rounded cursor-pointer">
              <label for="destacada" class="ml-3 text-sm font-bold text-slate-700 cursor-pointer">Propiedad Premium (VIP)</label>
            </div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-slate-100">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Ficha Técnica & Entorno</h3>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div class="col-span-2"><label for="m2_terreno" class="block text-xs font-bold text-slate-500 uppercase mb-2">M² Terreno</label><input id="m2_terreno" type="number" name="m2_terreno" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div class="col-span-2"><label for="m2_construccion" class="block text-xs font-bold text-slate-500 uppercase mb-2">M² Interiores</label><input id="m2_construccion" type="number" name="m2_construccion" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            
            <div><label for="recamaras" class="block text-xs font-bold text-slate-500 uppercase mb-2">Recámaras</label><input id="recamaras" type="number" name="recamaras" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="banos" class="block text-xs font-bold text-slate-500 uppercase mb-2">Baños</label><input id="banos" type="number" name="banos" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="medio_bano" class="block text-xs font-bold text-slate-500 uppercase mb-2">Medios Baños</label><input id="medio_bano" type="number" name="medio_bano" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label for="estacionamientos" class="block text-xs font-bold text-slate-500 uppercase mb-2">Autos</label><input id="estacionamientos" type="number" name="estacionamientos" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            
            <div class="col-span-2 sm:col-span-4">
              <label for="ubicacion" class="block text-xs font-bold text-slate-500 uppercase mb-2">Ubicación (Colonia, Ciudad)</label>
              <input id="ubicacion" type="text" name="ubicacion" placeholder="Ej. Puerta de Hierro, Zapopan" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3">
            </div>
            
            <div class="col-span-2 sm:col-span-4">
              <label for="descripcion" class="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción Editorial</label>
              <textarea id="descripcion" name="descripcion" rows="5" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></textarea>
            </div>

            <div class="col-span-2 sm:col-span-2">
              <label for="video_url" class="block text-xs font-bold text-slate-500 uppercase mb-2">Enlace de Video Recorrido (YouTube / Vimeo)</label>
              <input id="video_url" type="url" name="video_url" placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-100">
            </div>

            <div class="col-span-2 sm:col-span-2">
              <label for="recorrido_3d_url" class="block text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Enlace Recorrido 3D (Matterport)</label>
              <input id="recorrido_3d_url" type="url" name="recorrido_3d_url" placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-indigo-50/30 border border-indigo-100 rounded-lg p-3 focus:ring-2 focus:ring-indigo-300">
            </div>

          </div>
        </div>

        <div class="pt-8 flex justify-end">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 px-6 rounded-xl mr-4">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl disabled:bg-slate-400">
            {#if loading}
               Subiendo datos...
            {:else}
               {isOculta ? 'Guardar en Pre-Mercado' : 'Publicar Propiedad'}
            {/if}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
