<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  
  let propiedad = $derived(data.propiedad || {}); 
  let loading = $state(false);

  let imagePreview = $state(null);
  let galeriaPreviews = $state([]);

  function handleImageChange(event) {
    const file = event.target.files[0];
    imagePreview = file ? URL.createObjectURL(file) : null;
  }

  function handleGaleriaChange(event) {
    const files = event.target.files;
    galeriaPreviews = Array.from(files).map(file => URL.createObjectURL(file));
  }
</script>

<div class="min-h-screen bg-zinc-50 flex flex-col font-sans">
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
    <div class="flex items-center">
      <a href="/admin" aria-label="Volver a la consola de administración" class="text-slate-400 hover:text-slate-900 transition-colors mr-6 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900 tracking-tight">Editando: <span class="text-slate-400 font-medium ml-2">{propiedad.titulo}</span></h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-10">
    {#if propiedad.id}
      <div class="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
        
        {#if form?.error}
          <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100">{form.error}</div>
        {/if}

        <form method="POST" action="?/actualizar" enctype="multipart/form-data" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-10">
          
          <div class="space-y-6">
            <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">Material Visual Actual</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label for="imagen" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fotografía Principal</label>
                <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-500 transition-colors relative overflow-hidden group h-48 bg-slate-50">
                  <img src={imagePreview || propiedad.imagen_url} alt="Portada de la propiedad" class="absolute inset-0 w-full h-full object-cover z-10" />
                  <div class="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span class="text-white font-bold text-sm tracking-widest uppercase cursor-pointer">Cambiar Portada</span>
                  </div>
                  <input id="imagen" name="imagen" type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleImageChange}>
                </div>
              </div>

              <div>
                <label for="galeria" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Galería Secundaria</label>
                <div class="flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-500 transition-colors relative h-48 bg-slate-50 overflow-hidden group">
                  
                  {#if galeriaPreviews.length > 0}
                    <div class="absolute inset-0 grid grid-cols-2 gap-1 z-10 p-1">
                      {#each galeriaPreviews.slice(0, 4) as preview, index}
                        <img src={preview} alt="Vista previa de galería {index + 1}" class="w-full h-full object-cover rounded-md"/>
                      {/each}
                    </div>
                  {:else if propiedad.galeria_urls && propiedad.galeria_urls.length > 0}
                    <div class="absolute inset-0 grid grid-cols-2 gap-1 z-10 p-1">
                      {#each propiedad.galeria_urls.slice(0, 4) as url, index}
                        <img src={url} alt="Foto de galería {index + 1}" class="w-full h-full object-cover rounded-md opacity-70"/>
                      {/each}
                    </div>
                  {:else}
                    <div class="text-center z-10 relative">
                      <svg class="mx-auto h-8 w-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                  {/if}

                  <div class="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                    <span class="text-white font-bold text-sm tracking-widest uppercase cursor-pointer">Reemplazar Todas</span>
                    <span class="text-white/70 text-[10px] mt-1">Selecciona 15-25 fotos nuevas</span>
                  </div>
                  <input id="galeria" name="galeria" type="file" multiple accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" onchange={handleGaleriaChange}>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-8 pt-6">
            <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">Información Principal</h3>
            <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="titulo" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Publicación</label>
                <input type="text" id="titulo" name="titulo" value={propiedad.titulo} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium">
              </div>
              <div>
                <label for="operacion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operación</label>
                <select id="operacion" name="operacion" value={propiedad.operacion} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900">
                  <option value="Venta">Venta</option>
                  <option value="Renta">Renta</option>
                </select>
              </div>
              <div>
                <label for="tipo" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Inmueble</label>
                <select id="tipo" name="tipo" value={propiedad.tipo} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900">
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label for="precio" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Precio (MXN)</label>
                <input type="number" id="precio" name="precio" value={propiedad.precio || ''} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium">
              </div>
              <div class="sm:col-span-2 flex items-center mt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <input type="checkbox" id="destacada" name="destacada" checked={propiedad.destacada} class="w-5 h-5 text-blue-600 rounded cursor-pointer border-slate-300">
                <label for="destacada" class="ml-3 text-sm font-bold text-slate-700 cursor-pointer">Marcar como Propiedad Premium (VIP)</label>
              </div>
            </div>
          </div>

          <div class="space-y-8 pt-8 border-t border-slate-100">
            <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">Ficha Técnica & Entorno</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div class="col-span-2"><label for="m2_terreno" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Terreno</label><input type="number" id="m2_terreno" name="m2_terreno" value={propiedad.m2_terreno || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div class="col-span-2"><label for="m2_construccion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Interiores</label><input type="number" id="m2_construccion" name="m2_construccion" value={propiedad.m2_construccion || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label for="recamaras" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recámaras</label><input type="number" id="recamaras" name="recamaras" value={propiedad.recamaras || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label for="banos" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Baños</label><input type="number" id="banos" name="banos" value={propiedad.banos || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label for="medio_bano" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Medios Baños</label><input type="number" id="medio_bano" name="medio_bano" value={propiedad.medio_bano || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label for="estacionamientos" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Autos</label><input type="number" id="estacionamientos" name="estacionamientos" value={propiedad.estacionamientos || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              
              <div class="col-span-2 sm:col-span-4">
                <label for="ubicacion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación (Colonia, Ciudad)</label>
                <input type="text" id="ubicacion" name="ubicacion" value={propiedad.ubicacion || ''} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium">
              </div>
              
              <div class="col-span-2 sm:col-span-4">
                <label for="descripcion" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción Editorial</label>
                <textarea id="descripcion" name="descripcion" rows="6" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium leading-relaxed">{propiedad.descripcion}</textarea>
              </div>
              
              <div class="col-span-2 sm:col-span-2">
                <label for="video_url" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Enlace de Video Recorrido (YouTube / Vimeo)</label>
                <input type="url" id="video_url" name="video_url" value={propiedad.video_url || ''} placeholder="Ej. https://www.youtube.com/watch?v=..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-100">
              </div>

              <div class="col-span-2 sm:col-span-2">
                <label for="recorrido_3d_url" class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-indigo-600">Enlace Recorrido 3D (Matterport)</label>
                <input type="url" id="recorrido_3d_url" name="recorrido_3d_url" value={propiedad.recorrido_3d_url || ''} placeholder="Ej. https://my.matterport.com/show/?m=..." class="w-full bg-indigo-50/30 border border-indigo-100 rounded-xl px-4 py-3 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-300">
              </div>
            </div>
          </div>

          <div class="pt-8 mt-8 border-t border-slate-100 flex justify-end items-center gap-4">
            <a href="/admin" class="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors px-6">Cancelar</a>
            <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-3.5 px-8 rounded-full disabled:bg-slate-400 hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/20 text-sm">
              {loading ? 'Actualizando datos...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    {/if}
  </main>
</div>
