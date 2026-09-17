<script>
  import { MessageSquare, X, Send, Loader2 } from 'lucide-svelte';

  let isOpen = $state(false);
  let inputMensaje = $state('');
  let isLoading = $state(false);
  let mensajes = $state([
    { role: 'agent', content: 'Hola, soy tu Agente de Soporte Inmublia Nivel 1. ¿En qué te puedo ayudar hoy?' }
  ]);
  let chatContainer = $state(null);

  function toggleWidget() {
    isOpen = !isOpen;
  }

  async function enviarMensaje() {
    if (!inputMensaje.trim() || isLoading) return;

    const textoUsuario = inputMensaje.trim();
    mensajes = [...mensajes, { role: 'user', content: textoUsuario }];
    inputMensaje = '';
    isLoading = true;

    // Auto-scroll simple al enviar
    setTimeout(() => {
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: textoUsuario })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error desconocido');

      mensajes = [...mensajes, { role: 'agent', content: data.respuesta }];
    } catch (error) {
      mensajes = [...mensajes, { role: 'agent', content: `🚨 Error: ${error.message}` }];
    } finally {
      isLoading = false;
      // Auto-scroll al recibir respuesta
      setTimeout(() => {
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 50);
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      enviarMensaje();
    }
  }
</script>

<div class="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
  {#if isOpen}
    <div class="bg-white border border-slate-200 rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[500px] flex flex-col mb-4 overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      
      <!-- Cabecera del Chat -->
      <div class="bg-slate-900 px-5 py-4 flex justify-between items-center text-white">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm shadow-inner">IA</div>
          <div>
            <h3 class="font-bold text-sm">Soporte Inmublia</h3>
            <p class="text-[10px] text-slate-400 uppercase tracking-widest">Agente RAG Activo</p>
          </div>
        </div>
        <button aria-label="Cerrar chat" class="text-slate-400 hover:text-white transition-colors" onclick={toggleWidget}>
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Historial de Mensajes -->
      <div bind:this={chatContainer} class="flex-1 p-5 overflow-y-auto bg-slate-50 flex flex-col gap-4">
        {#each mensajes as msg}
          <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed {msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-md' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}">
              {msg.content}
            </div>
          </div>
        {/each}
        
        {#if isLoading}
          <div class="flex justify-start">
            <div class="bg-white border border-slate-200 text-slate-400 rounded-xl rounded-bl-none px-4 py-3 shadow-sm flex gap-2 items-center">
              <Loader2 class="w-4 h-4 animate-spin text-indigo-500" />
              <span class="text-xs font-medium">Buscando en el manual...</span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Zona de Input -->
      <div class="p-3 bg-white border-t border-slate-100">
        <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl pr-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <input 
            type="text" 
            bind:value={inputMensaje} 
            onkeydown={handleKeydown}
            placeholder="Ej. ¿Cuál es el límite de fotos?" 
            class="flex-1 bg-transparent border-none px-4 py-3 text-sm text-slate-700 focus:ring-0 outline-none placeholder:text-slate-400"
            disabled={isLoading}
          />
          <button 
            aria-label="Enviar mensaje" 
            onclick={enviarMensaje} 
            disabled={!inputMensaje.trim() || isLoading}
            class="p-2 rounded-lg bg-indigo-600 text-white disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm cursor-pointer"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  {/if}

  <!-- Botón Flotante Disparador -->
  <button 
    aria-label="Abrir soporte" 
    onclick={toggleWidget} 
    class="w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
  >
    {#if isOpen}
      <X class="w-6 h-6" />
    {:else}
      <MessageSquare class="w-6 h-6" />
    {/if}
  </button>
</div>
