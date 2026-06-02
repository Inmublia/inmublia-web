<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  let propiedad = data.propiedad; // Los datos actuales traidos de la DB
  let loading = $state(false);
</script>

<div class="min-h-screen bg-slate-50 flex flex-col">
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-blue-600 transition-colors mr-4 bg-slate-100 hover:bg-blue-50 p-2 rounded-lg">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
      </a>
      <h1 class="text-xl font-black text-slate-900">Editando: {propiedad.titulo}</h1>
    </div>
  </header>

  <main class="flex-1 overflow-auto p-8">
    <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
      
      {#if form?.error}
        <div class="mb-8 bg-red-50 text-red-600 font-bold p-4 rounded-xl text-sm border border-red-100">{form.error}</div>
      {/if}

      <form method="POST" action="?/actualizar" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-10">
        
        <div class="space-y-6 pt-2">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Información Principal</h3>
          <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label class="block text-sm font-bold text-slate-700 mb-2">Título de la Publicación</label>
              <input type="text" name="titulo" value={propiedad.titulo} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100">
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Operación</label>
              <select name="operacion" value={propiedad.operacion} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Venta">Venta</option>
                <option value="Renta">Renta</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">Tipo de Inmueble</label>
              <select name="tipo" value={propiedad.tipo} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium">
                <option value="Casa">Casa</option>
                <option value="Departamento">Departamento</option>
                <option value="Terreno">Terreno</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-bold text-slate-700 mb-2">Precio (MXN)</label>
              <input type="number" name="precio" value={propiedad.precio} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100">
            </div>
            <div class="sm:col-span-2 flex items-center mt-2">
              <input type="checkbox" id="destacada" name="destacada" checked={propiedad.destacada} class="w-5 h-5 text-blue-600 rounded cursor-pointer">
              <label for="destacada" class="ml-3 text-sm font-bold text-slate-700 cursor-pointer">Propiedad Premium (VIP)</label>
            </div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-slate-100">
          <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-2">Ficha Técnica & Entorno</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div class="col-span-2"><label class="block text-xs font-bold text-slate-500 uppercase mb-2">M² Terreno</label><input type="number" name="m2_terreno" value={propiedad.m2_terreno} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div class="col-span-2"><label class="block text-xs font-bold text-slate-500 uppercase mb-2">M² Interiores</label><input type="number" name="m2_construccion" value={propiedad.m2_construccion} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Recámaras</label><input type="number" name="recamaras" value={propiedad.recamaras} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Baños</label><input type="number" name="banos" value={propiedad.banos} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Medios Baños</label><input type="number" name="medio_bano" value={propiedad.medio_bano} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div><label class="block text-xs font-bold text-slate-500 uppercase mb-2">Autos</label><input type="number" name="estacionamientos" value={propiedad.estacionamientos} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"></div>
            <div class="col-span-2 sm:col-span-4">
              <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Ubicación (Colonia, Ciudad)</label>
              <input type="text" name="ubicacion" value={propiedad.ubicacion} class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3">
            </div>
            <div class="col-span-2 sm:col-span-4">
              <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Descripción Editorial</label>
              <textarea name="descripcion" rows="5" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3">{propiedad.descripcion}</textarea>
            </div>
          </div>
        </div>

        <div class="pt-8 flex justify-end">
          <a href="/admin" class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3 px-6 rounded-xl mr-4">Cancelar</a>
          <button type="submit" disabled={loading} class="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl disabled:bg-slate-400">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  </main>
</div>
