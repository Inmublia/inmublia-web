<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { CheckCircle2, AlertCircle, Save, Layers, Palette, Eye, LayoutTemplate, Smartphone } from 'lucide-svelte'; 

  let { data, form } = $props();
  let broker = $state(data.broker || {});
  let planConfig = $derived(data.planConfig || { templates_autorizados: ['classic'] });
  let planSuscripcion = $derived(broker.plan_suscripcion || 'basico');
  
  let selectedTemplateId = $state(broker.template_seleccionado || 'classic');

  let savingProfile = $state(false);
  let showSuccess = $state(false);

  // --- MAPA MAESTRO DE DEMOS ---
  const demoUrls = {
    'classic': 'https://demo.inmublia.com/template-classic',
    'clean': 'https://demo.inmublia.com/template-clean',
    'modern': 'https://demo.inmublia.com/template-modern',
    'editorial': 'https://demo.inmublia.com/template-editorial',
    'luxury': 'https://demo.inmublia.com/template-luxury',
    'cinematic': 'https://demo.inmublia.com/template-cinematic',
    'prop_basic_1': 'https://demo.inmublia.com/demo-property-basic1',
    'prop_basic_2': 'https://demo.inmublia.com/demo-property-basic2',
    'prop_pro_1': 'https://demo.inmublia.com/demo-property-pro1',
    'prop_pro_2': 'https://demo.inmublia.com/demo-property-pro2',
    'prop_pro_3': 'https://demo.inmublia.com/demo-property-pro3',
    'prop_elite_1': 'https://demo.inmublia.com/demo-property-elite1',
    'prop_elite_2': 'https://demo.inmublia.com/demo-property-elite2',
    'prop_elite_3': 'https://demo.inmublia.com/demo-property-elite3',
    'prop_elite_4': 'https://demo.inmublia.com/demo-property-elite4'
  };

  // 1. CATÁLOGO GLOBAL DE AGENCIA (Las 6 originales) - ESTAS SE GUARDAN
  const catalogoGlobal = [
    { id: 'classic', nombre: 'Classic Minimalist', desc: 'Diseño limpio y tradicional.', minPlan: 'basico' },
    { id: 'clean', nombre: 'Clean Base', desc: 'Estilo corporativo de alto contraste.', minPlan: 'basico' },
    { id: 'modern', nombre: 'Modern Grid', desc: 'Estilo asimétrico con contacto fijo.', minPlan: 'pro' },
    { id: 'editorial', nombre: 'Editorial', desc: 'Enfoque en lectura y tipografía elegante.', minPlan: 'pro' },
    { id: 'luxury', nombre: 'Luxury Immersive', desc: 'Diseño premium de pantalla completa.', minPlan: 'elite' },
    { id: 'cinematic', nombre: 'Cinematic', desc: 'Video-first con navegación inmersiva.', minPlan: 'elite' }
  ];

  // 2. GALERÍA DE SMART BROCHURES (Las 9 de propiedades) - SOLO EXHIBICIÓN
  const catalogoPropiedades = [
    { id: 'prop_basic_1', nombre: 'Essential Focus', desc: 'Ficha técnica directa.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_basic_2', nombre: 'Clean Showcase', desc: 'Enfoque en la galería horizontal.', minPlan: 'basico', thumbType: 'list' },
    { id: 'prop_pro_1', nombre: 'Lead Magnet', desc: 'Formulario sticky agresivo.', minPlan: 'pro', thumbType: 'form' },
    { id: 'prop_pro_2', nombre: 'Modern Asymmetric', desc: 'Doble panel independiente vertical.', minPlan: 'pro', thumbType: 'immersive' },
    { id: 'prop_pro_3', nombre: 'Editorial Story', desc: 'Revista de arquitectura (Serif).', minPlan: 'pro', thumbType: 'immersive' },
    { id: 'prop_elite_1', nombre: 'Luxury Immersive', desc: 'Efecto Glassmorphism sobre fondo.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_2', nombre: 'Cinematic Tour', desc: 'Video hero en bucle continuo.', minPlan: 'elite', thumbType: 'video' },
    { id: 'prop_elite_3', nombre: 'Prestige Dark', desc: 'Neo-brutalismo oscuro y bronce.', minPlan: 'elite', thumbType: 'immersive' },
    { id: 'prop_elite_4', nombre: 'Panoramic 3D', desc: 'Matterport interactivo de fondo.', minPlan: 'elite', thumbType: 'video' }
  ];

  function puedeUsar(minPlan) {
    if (minPlan === 'basico') return true;
    if (minPlan === 'pro' && (planSuscripcion === 'pro' || planSuscripcion === 'elite')) return true;
    if (minPlan === 'elite' && planSuscripcion === 'elite') return true;
    return false;
  }
</script>

<style>
  .template-card.selected {
    border-color: #6366f1 !important; /* indigo-500 */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    background-color: #e0e7ff; /* indigo-50 */
  }
</style>

<main class="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
  
  <header class="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10 relative">
    <div class="flex items-center gap-4 relative z-10">
      <div class="p-3 bg-slate-900 rounded-xl text-white shadow-sm border border-slate-800">
        <Palette class="w-6 h-6 text-amber-400" />
      </div>
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">Design Studio</h1>
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
          <ShieldCheck class="w-3 h-3 text-emerald-500" /> Nivel de acceso: <span class="text-slate-800 uppercase">{planSuscripcion}</span>
        </p>
      </div>
    </div>

    <div class="relative z-10">
        <form method="POST" action="?/updateTemplate" use:enhance={() => {
            savingProfile = true;
            return async ({ update, result }) => {
                savingProfile = false;
                if (result.type === 'failure') alert("❌ Error: " + (result.data?.error || "Desconocido"));
                else if (result.type === 'success') { showSuccess = true; setTimeout(() => showSuccess = false, 4000); await invalidateAll(); }
                update({ reset: false });
            };
        }}>
            <input type="hidden" name="template_seleccionado" value={selectedTemplateId}>
            <button type="submit" disabled={savingProfile} class="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3.5 px-8 rounded-xl shadow-md flex items-center gap-2.5 transition-all text-sm active:scale-95">
                {#if savingProfile}
                    <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Guardando...
                {:else}
                    <Save class="w-4 h-4 text-amber-400" /> Guardar Portal de Agencia
                {/if}
            </button>
        </form>
    </div>
  </header>

  <div class="p-10 flex-1 overflow-auto pb-32">
    <div class="max-w-6xl mx-auto space-y-12">

      {#if form?.error}
         <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 shadow-sm" role="alert">
           <AlertCircle class="w-4 h-4" /> {form.error}
         </div>
      {/if}
      
      {#if showSuccess}
        <div class="font-medium p-4 rounded-xl text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm animate-[fadeIn_0.3s_ease-out]" role="alert">
          <CheckCircle2 class="w-4 h-4" /> Diseño global de agencia actualizado.
        </div>
      {/if}

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex items-center gap-6">
        <div class="w-20 h-20 rounded-full border-4 border-slate-100 shadow-md overflow-hidden bg-slate-50 shrink-0">
          <img src={broker.avatar_url || `https://ui-avatars.com/api/?name=${broker.nombre_comercial || 'I'}&background=0f172a&color=fff`} alt="Logo" class="w-full h-full object-cover">
        </div>
        <div>
          <h2 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Identidad de Marca</h2>
          <p class="text-xl font-black text-slate-900 mb-2">{broker.nombre_comercial || 'Mi Agencia Inmobiliaria'}</p>
          <p class="text-xs text-slate-500">Este logo y nombre se mostrarán en todos sus catálogos. (Modificable en la pestaña de Perfil).</p>
        </div>
      </div>

      <div class="bg-white p-8 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 border-l-4 border-l-amber-500">
        <div class="mb-8 border-b border-slate-100 pb-4">
          <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
            <LayoutTemplate class="w-5 h-5 text-indigo-500" />
            1. Diseño del Portal de Agencia
          </h3>
          <p class="text-xs font-medium text-slate-500 mt-1">Seleccione la interfaz principal donde los clientes verán todo su inventario público.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each catalogoGlobal as template}
            {@const autorizado = puedeUsar(template.minPlan)}
            {@const activo = selectedTemplateId === template.id}
            
            <label class="template-card relative flex flex-col bg-white border-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 {activo ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-300'} {!autorizado ? 'opacity-50 grayscale cursor-not-allowed' : ''}">
              <input type="radio" name="template_radio" bind:group={selectedTemplateId} value={template.id} disabled={!autorizado} class="hidden">
              
              <div class="h-28 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative group overflow-hidden">
                {#if template.id === 'classic' || template.id === 'clean'}
                  <div class="w-full h-full bg-slate-50 flex flex-col p-4">
