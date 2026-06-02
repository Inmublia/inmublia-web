<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
  let loading = $state(false);
  let imagePreview = $state(null);

  function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) imagePreview = URL.createObjectURL(file);
    else imagePreview = null;
  }
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-blue-600 transition-colors mr-4 bg-slate-100 hover:bg-blue-50 p-2 rounded-lg">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900">Crear Nueva Propiedad</h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100 flex items-center gap-3">
          <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          {form.error}
        </div>
      {/if}

      <form method="POST" action="?/crear" enctype="multipart/form-data" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-8">
        
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-3">Fotografía Principal (Portada)</label>
          <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors relative overflow-hidden group">
            {#if imagePreview}
              <img src={imagePreview} alt="Preview" class="absolute inset-0 w-full h-full object-cover z-10" />
            {/if}
            <div class="space-y-1 text-center relative z-20 bg-white/80 backdrop-blur-sm p-4 rounded-lg">
              <svg class="mx-auto h-12 w-12 text-blue-600" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="flex text-sm text-slate-600 justify-center">
                <label for="imagen" class="relative cursor-pointer font-bold text-blue-600 hover:text-blue-500">
                  <span>Sube un archivo de imagen</span>
                  <input id="imagen" name="imagen" type="file" accept="image/*" class="sr-only" required onchange={handleImageChange}>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="titulo" class="block text-sm font-bold text-slate-700 mb-2">Título de la Publicación</label>
            <input type="text" name="titulo" id="titulo" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 transition-all">
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">Operación</label>
            <select name="operacion" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
              <option value="Venta">Venta</option>
              <option value="Renta">Renta</option>
              <option value="Preventa">Preventa</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
            <select name="tipo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
              <option value="Casa">Casa</option>
              <option value="Departamento">Departamento</option>
              <option value="Terreno">Terreno</option>
              <option value="Oficina">Oficina</option>
            </select>
          </div>

          <div>
            <label for="precio" class="block text-sm font-bold text-slate-700 mb-2">Precio (MXN)</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span class="text-slate-500 font-bold">$</span></div>
              <input type="number" name="precio" id="precio" required class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 focus:ring-2 focus:ring-blue-100 transition-all">
            </div>
          </div>

          <div class="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mt-7">
            <input type="checkbox" id="destacada" name="destacada" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer">
            <label for="destacada" class="ml-3 block text-sm font-bold text-slate-700 cursor-pointer">Marcar como Propiedad Destacada (VIP)</label>
          </div>

          <div class="sm:col-span-2">
            <label for="descripcion" class="block text-sm font-bold text-slate-700 mb-2">Descripción Completa</label>
            <textarea id="descripcion" name="descripcion" rows="4" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 transition-all"></textarea>
          </div>
        </div>

        <div class="pt-6 border-t border-slate-100 flex justify-end">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 px-6 rounded-xl mr-4 transition-colors">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-md disabled:bg-slate-400 transition-colors">
            {loading ? 'Publicando...' : 'Publicar Propiedad'}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
