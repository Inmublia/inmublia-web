<script>
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  
  let broker = $derived(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let loading = $state(false);

  // Catálogo completo de layouts visuales disponibles en la plataforma
  const catalogoTemplates = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional enfocado en texto y listados rápidos.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Mosaicos dinámicos y transiciones fluidas optimizadas para agencias medianas.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño oscuro/claro premium con cinemáticas, ideal para propiedades exclusivas.', minPlan: 'elite' }
  ];
</script>

<div class="max-w-4xl mx-auto p-8 font-sans">
  <div class="mb-8">
    <h1 class="text-2xl font-black text-slate-900 tracking-tight">Personalización de tu Portal</h1>
    <p class="text-sm text-slate-500 mt-1">Elige la identidad visual con la que tus compradores verán tus exclusivas. Tu plan actual es: <span class="font-bold text-indigo-600 uppercase">{broker.plan_suscripcion}</span></p>
  </div>

  {#if form?.success}
    <div class="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 text-sm font-bold">¡Plantilla del portal actualizada con éxito!</div>
  {/if}

  <form method="POST" action="?/guardarTemplate" use:enhance={() => { loading = true; return async ({ update }) => { loading = false; update(); }; }}>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each catalogoTemplates as template}
        {@const autorizado = planConfig.templates_autorizados.includes(template.id)}
        {@const activo = broker.template_seleccionado === template.id}
        
        <div class="relative bg-white border rounded-2xl p-5 flex flex-col justify-between transition-all shadow-sm 
          {activo ? 'border-indigo-600 ring-2 ring-indigo-50/50' : 'border-slate-200'} 
          {!autorizado ? 'opacity-60 bg-slate-50' : 'hover:border-slate-400'}">
          
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold text-slate-900 text-sm">{template.nombre}</h3>
              {#if !autorizado}
                <span class="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  🔒 {template.minPlan}
                </span>
              {/if}
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">{template.desc}</p>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100">
            {#if autorizado}
              <label class="flex items-center gap-2 cursor-pointer w-full">
                <input type="radio" name="template_id" value={template.id} checked={activo} class="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500">
                <span class="text-xs font-bold text-slate-700">{activo ? 'Activado actualmente' : 'Seleccionar layout'}</span>
              </label>
            {:else}
              <a href="/admin/planes" class="inline-block text-center w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm">
                Desbloquear con Plan {template.minPlan.toUpperCase()}
              </a>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-8 pt-6 border-t border-slate-100 flex justify-end">
      <button type="submit" disabled={loading} class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50">
        {loading ? 'Guardando configuración...' : 'Confirmar Identidad Visual'}
      </button>
    </div>
  </form>
</div>
