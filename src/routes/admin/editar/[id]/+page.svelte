<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  
  // SOLUCIÓN: Hacemos la propiedad reactiva y aseguramos que no rompa si falta
  let propiedad = $derived(data.propiedad || {}); 
  let loading = $state(false);
</script>

<div class="min-h-screen bg-zinc-50 flex flex-col font-sans">
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
    <div class="flex items-center">
      <a href="/admin" class="text-slate-400 hover:text-slate-900 transition-colors mr-6 bg-slate-50 hover:bg-slate-100 p-2.5 rounded-xl border border-slate-200">
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

        <form method="POST" action="?/actualizar" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }} class="space-y-10">
          
          <div class="space-y-8">
            <h3 class="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">Información Principal</h3>
            <div class="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Título de la Publicación</label>
                <input type="text" name="titulo" value={propiedad.titulo} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operación</label>
                <select name="operacion" value={propiedad.operacion} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900">
                  <option value="Venta">Venta</option>
                  <option value="Renta">Renta</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo de Inmueble</label>
                <select name="tipo" value={propiedad.tipo} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-900">
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Terreno">Terreno</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Precio (MXN)</label>
                <input type="number" name="precio" value={propiedad.precio} required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 text-slate-900 font-medium">
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
              <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Terreno</label><input type="number" name="m2_terreno" value={propiedad.m2_terreno} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div class="col-span-2"><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">M² Interiores</label><input type="number" name="m2_construccion" value={propiedad.m2_construccion} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recámaras</label><input type="number" name="recamaras" value={propiedad.recamaras} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Baños</label><input type="number" name="banos" value={propiedad.banos} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Medios Baños</label><input type="number" name="medio_bano" value={propiedad.medio_bano} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div><label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Autos</label><input type="number" name="estacionamientos" value={propiedad.estacionamientos} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium"></div>
              <div class="col-span-2 sm:col-span-4">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ubicación (Colonia, Ciudad)</label>
                <input type="text" name="ubicacion" value={propiedad.ubicacion} class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium">
              </div>
              <div class="col-span-2 sm:col-span-4">
                <label class="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descripción Editorial</label>
                <textarea name="descripcion" rows="6" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium leading-relaxed">{propiedad.descripcion}</textarea>
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
