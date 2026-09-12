<script>
  import { enhance } from '$app/forms';
  import { MapPin, BedDouble, Bath, Maximize, User, Loader2, CheckCircle2 } from 'lucide-svelte';

  let { data, form } = $props();
  let propiedad = $derived(data.propiedad);
  let broker = $derived(propiedad?.broker);
  
  let sendingForm = $state(false);
</script>

<!-- Mensaje de error 404 temprano -->
{#if data.status === 404}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <h1 class="text-4xl font-black text-slate-900 mb-2">Propiedad no encontrada</h1>
      <p class="text-slate-500">Es posible que haya sido vendida o retirada del mercado.</p>
    </div>
  </div>
{:else}
  <main class="min-h-screen bg-[#F8FAFC] pb-24">
    
    <!-- Hero Image de la Propiedad -->
    <div class="w-full h-[50vh] min-h-[400px] bg-slate-900 relative">
      {#if propiedad?.imagenes && propiedad.imagenes.length > 0}
        <img src={propiedad.imagenes[0]} alt={propiedad.titulo} class="w-full h-full object-cover opacity-80" />
      {:else}
        <div class="w-full h-full bg-slate-800 flex items-center justify-center">
          <span class="text-slate-500 font-medium">Sin imagen</span>
        </div>
      {/if}
      <div class="absolute inset-0 bg-gradient-to-t from-[#F8FAFC] via-transparent to-transparent"></div>
    </div>

    <div class="max-w-7xl mx-auto px-6 md:px-10 -mt-24 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <!-- Columna Izquierda: Detalles del Inmueble -->
        <div class="lg:col-span-8">
          <div class="bg-white rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100">
            <div class="flex items-center gap-2 text-indigo-600 font-bold text-sm tracking-widest uppercase mb-3">
              <span class="px-3 py-1 bg-indigo-50 rounded-lg">{propiedad.tipo_operacion || 'Venta'}</span>
              <span class="text-slate-400">•</span>
              <span>{propiedad.tipo_inmueble || 'Casa'}</span>
            </div>
            
            <h1 class="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">{propiedad.titulo}</h1>
            
            <p class="flex items-center gap-2 text-slate-500 font-medium mb-8">
              <MapPin class="w-5 h-5" /> {propiedad.ubicacion_texto || 'Ubicación no especificada'}
            </p>

            <div class="text-3xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-8">
              ${propiedad.precio?.toLocaleString('es-MX')} <span class="text-lg text-slate-400 font-bold">{propiedad.moneda || 'MXN'}</span>
            </div>

            <div class="grid grid-cols-3 gap-6 mb-10 text-slate-700">
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-widest font-bold text-slate-400 flex items-center gap-2"><BedDouble class="w-4 h-4"/> Recámaras</span>
                <span class="text-xl font-black">{propiedad.recamaras || '-'}</span>
              </div>
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-widest font-bold text-slate-400 flex items-center gap-2"><Bath class="w-4 h-4"/> Baños</span>
                <span class="text-xl font-black">{propiedad.banos || '-'}</span>
              </div>
              <div class="flex flex-col gap-2">
                <span class="text-xs uppercase tracking-widest font-bold text-slate-400 flex items-center gap-2"><Maximize class="w-4 h-4"/> Terreno</span>
                <span class="text-xl font-black">{propiedad.terreno_m2 || '-'} m²</span>
              </div>
            </div>

            <div>
              <h3 class="text-lg font-black text-slate-900 mb-4">Descripción</h3>
              <p class="text-slate-600 leading-relaxed whitespace-pre-wrap">{propiedad.descripcion}</p>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Tarjeta del Bróker y Formulario Lead -->
        <div class="lg:col-span-4">
          <div class="sticky top-8">
            <div class="bg-white rounded-3xl p-8 shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100">
              
              <!-- Info de la Agencia/Broker -->
              <div class="flex items-center gap-4 mb-8">
                {#if broker?.avatar_url}
                  <img src={broker.avatar_url} alt={broker.nombre_comercial} class="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm">
                {:else}
                  <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User class="w-8 h-8" />
                  </div>
                {/if}
                <div>
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Agencia Inmobiliaria</p>
                  <h4 class="text-lg font-black text-slate-900 leading-tight">{broker?.nombre_comercial || 'Agente Independiente'}</h4>
                </div>
              </div>

              <hr class="border-slate-100 mb-8">
              
              <!-- Formulario para capturar el Lead -->
              <h4 class="font-black text-slate-900 mb-6 text-xl">Solicitar Información</h4>
              
              {#if form?.formId === 'contacto' && form?.success}
                <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-6 text-center animate-[fadeIn_0.3s_ease-out]">
                  <CheckCircle2 class="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h5 class="font-black text-lg mb-1">¡Mensaje Enviado!</h5>
                  <p class="text-sm font-medium text-emerald-700">El agente se pondrá en contacto contigo muy pronto.</p>
                </div>
              {:else}
                <form 
                  method="POST" 
                  action="?/contactar" 
                  use:enhance={() => {
                    sendingForm = true;
                    return async ({ update }) => {
                      sendingForm = false;
                      await update({ reset: true });
                    };
                  }}
                  class="space-y-4"
                >
                  <input type="hidden" name="agency_id" value={broker?.id}>
                  
                  <div>
                    <input type="text" name="nombre" required placeholder="Tu Nombre Completo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400">
                  </div>
                  
                  <div>
                    <input type="email" name="email" required placeholder="tu@correo.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400">
                  </div>
                  
                  <div>
                    <input type="tel" name="telefono" required placeholder="Número de Celular" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400">
                  </div>

                  <div>
                    <textarea name="mensaje" rows="3" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400 resize-none">Hola, estoy interesado en {propiedad.titulo}. Me gustaría más información.</textarea>
                  </div>

                  {#if form?.formId === 'contacto' && form?.error}
                    <p class="text-red-500 text-xs font-bold text-center mt-2">{form.error}</p>
                  {/if}

                  <button type="submit" disabled={sendingForm} class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2">
                    {#if sendingForm}
                      <Loader2 class="w-5 h-5 animate-spin" /> Procesando...
                    {:else}
                      Enviar Mensaje
                    {/if}
                  </button>
                  <p class="text-[10px] text-slate-400 text-center font-medium mt-4">Tus datos están seguros y no serán compartidos con terceros.</p>
                </form>
              {/if}

            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
{/if}
