<script module>
  export const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  export const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa y optimizada.', minPlan: 'basico' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque limpio en la galería de imágenes.', minPlan: 'basico' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky optimizado para captura.', minPlan: 'pro' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel vertical contemporáneo.', minPlan: 'pro' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Revista de arquitectura (Serif).', minPlan: 'pro' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism premium sobre fondo.', minPlan: 'elite' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video de fondo con interfaz limpia integrada.', minPlan: 'elite' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Estética neo-brutalista en negro y bronce.', minPlan: 'elite' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Integración fluida para recorridos virtuales.', minPlan: 'elite' }
  ];
</script>

<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Palette, LayoutTemplate, Smartphone, ShieldCheck, Lock } from 'lucide-svelte'; 
  import TemplateCard from '$lib/components/admin/TemplateCard.svelte';

  let { data, form } = $props();
  
  let broker = $derived(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplate = $state('classic');
  let selectedLanding = $state('prop_basic_1');

  $effect(() => {
    if (broker && broker.id) {
      selectedTemplate = broker.template_seleccionado || 'classic';
      selectedLanding = broker.template_id_catalog || 'prop_basic_1';
    }
  });

  let subdominio = $derived(broker.subdominio || 'demo');
  let previewSlug = $derived(data.previewSlug || 'propiedad-demo');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<main class="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4">
      <div class="p-2.5 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <Palette class="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h1 class="text-xl font-black tracking-tight text-slate-900">Design Studio</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Cuenta: <span class="text-slate-800 uppercase">{planSuscripcion}</span>
        </p>
      </div>
    </div>

    <div>
      <form method="POST" action="?/updateTemplate" use:enhance={() => {
        savingProfile = true;
        return async ({ update, result }) => {
          savingProfile = false;
          if (result.type === 'failure') alert("❌ Error: " + (result.data?.error || "Desconocido"));
          else if (result.type === 'success') { showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll(); }
          update({ reset: false });
        };
      }}>
        <input type="hidden" name="template_seleccionado" value={selectedTemplate}>
        <input type="hidden" name="template_id_catalog" value={selectedLanding}>
        
        <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center gap-2 transition-all text-sm cursor-pointer active:scale-95">
          {#if savingProfile}
            <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
          {:else}
            <Save class="w-4 h-4 text-amber-400" /> Guardar Configuración Global
          {/if}
        </button>
      </form>
    </div>
  </header>

  <div class="p-6 md:p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-6xl mx-auto space-y-8">

      {#if form?.error}
        <div class="p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 shadow-sm">
          <AlertCircle class="w-4 h-4" /> {form.error}
        </div>
      {/if}
      
      {#if showSuccess}
        <div class="p-3.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <CheckCircle2 class="w-4 h-4" /> Configuración visual actualizada y sincronizada en todo el inventario.
        </div>
      {/if}

      <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
        <div class="w-14 h-14 rounded-full border-2 border-slate-100 shadow-sm overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Identidad Corporativa</h2>
          <p class="text-base font-black text-slate-900 leading-tight">{broker.nombre_comercial || 'Inmublia Showcase'}</p>
        </div>
      </div>

      <!-- SECCIÓN 1: CATÁLOGO GLOBAL -->
      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
        <div class="mb-6 flex flex-col gap-1">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-4 h-4 text-amber-500" />
            1. Interfaz Base de la Agencia
          </h3>
          <p class="text-[11px] font-medium text-slate-500 leading-relaxed">Determine la maqueta global para desplegar el catálogo general con todas sus propiedades públicas.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = puedeUsar(template.minPlan)}
            {@const activo = selectedTemplate === template.id}
            
            <div 
              role="button"
              tabindex="0"
              onclick={() => { if(autorizado) selectedTemplate = template.id; }}
              onkeydown={(e) => { if(e.key === 'Enter' && autorizado) selectedTemplate = template.id; }}
              class="relative cursor-pointer transition-all duration-200 {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}"
            >
              <TemplateCard 
                id={template.id}
                nombre={template.nombre}
                descripcion={template.desc}
                plan={template.minPlan}
                activo={activo}
                urlPreview={`https://${subdominio}.inmublia.com/?preview=${template.id}&sandbox=true`}
                urlFullDemo={autorizado ? `https://${subdominio}.inmublia.com/?preview=${template.id}` : ''}
              />
              {#if !autorizado}
                <div class="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
                  <span class="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <Lock class="w-3.5 h-3.5" /> Requiere Plan {template.minPlan}
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- SECCIÓN 2: LANDING PAGES DE PROPIEDADES -->
      <div class="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-slate-900 relative overflow-hidden">
        
        <div class="mb-6 flex flex-col gap-1 relative z-10">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <Smartphone class="w-4 h-4 text-slate-900" />
            2. Diseños Base de Landing Pages para Propiedades
          </h3>
          <p class="text-[11px] font-medium text-slate-500 leading-relaxed">Seleccione la plantilla que se aplicará inmediatamente a <strong class="text-slate-800 font-bold">todo su inventario público</strong>.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {#each catalogoPropiedades as propTemplate}
            {@const autorizado = puedeUsar(propTemplate.minPlan)}
            {@const activoLanding = selectedLanding === propTemplate.id}
            
            <div 
              role="button"
              tabindex="0"
              onclick={() => { if(autorizado) selectedLanding = propTemplate.id; }}
              onkeydown={(e) => { if(e.key === 'Enter' && autorizado) selectedLanding = propTemplate.id; }}
              class="relative cursor-pointer transition-all duration-200 {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}"
            >
              <TemplateCard 
                id={propTemplate.id}
                nombre={propTemplate.nombre}
                descripcion={propTemplate.desc}
                plan={propTemplate.minPlan}
                activo={activoLanding}
                urlPreview={`https://${subdominio}.inmublia.com/${previewSlug}?template=${propTemplate.id}&sandbox=true`}
                urlFullDemo={autorizado ? (previewSlug ? `https://${subdominio}.inmublia.com/${previewSlug}?template=${propTemplate.id}` : `https://${subdominio}.inmublia.com/`) : ''}
              />
              {#if !autorizado}
                <div class="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[1px] rounded-2xl flex items-center justify-center pointer-events-none">
                  <span class="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <Lock class="w-3.5 h-3.5" /> Requiere Plan {propTemplate.minPlan}
                  </span>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>
</main>
