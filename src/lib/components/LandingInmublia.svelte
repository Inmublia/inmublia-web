<script>
  import { Building2, Sparkles } from 'lucide-svelte';
</script>

<main class="min-h-screen bg-slate-50 font-sans selection:bg-indigo-600 selection:text-white">
  <nav class="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
    <div class="max-w-[1400px] mx-auto px-6 sm:px-10">
      <div class="flex justify-between items-center h-20">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-zinc-950 rounded-lg flex items-center justify-center">
             <Building2 class="w-5 h-5 text-white" />
          </div>
          <span class="text-2xl font-black text-slate-900 tracking-tighter">Inmublia.</span>
        </div>
        <div class="hidden md:flex items-center space-x-8">
          <a href="#soluciones" class="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">Soluciones SaaS</a>
          <div class="h-4 w-px bg-slate-200"></div>
          <a href="/login" class="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">Ingresar a mi Consola</a>
          <a href="/login" class="bg-zinc-950 hover:bg-indigo-600 text-white text-sm font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg active:scale-95">
            Crear mi Agencia
          </a>
        </div>
      </div>
    </div>
  </nav>

  <div class="relative pt-32 pb-20 lg:pt-56 lg:pb-40 overflow-hidden">
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    
    <div class="relative max-w-[1000px] mx-auto px-6 text-center z-10">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest mb-8 shadow-sm">
        <Sparkles class="w-3.5 h-3.5" /> La infraestructura definitiva
      </div>
      
      <h1 class="text-5xl md:text-7xl lg:text-[80px] font-black text-slate-900 tracking-tighter leading-[1.05] mb-8">
        Independiza tu<br>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Negocio Inmobiliario.</span>
      </h1>
      
      <p class="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-12 font-medium leading-relaxed">
        Inmublia te proporciona tu propio ecosistema digital. Deja de publicar en portales donde compites por precio. Obtén tu propia marca, landing pages de alto impacto y una consola CRM profesional.
      </p>

      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <a href="/login" class="bg-zinc-950 hover:bg-indigo-600 text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 text-lg shadow-xl shadow-zinc-900/20 active:scale-95">
          Comenzar mi Agencia Hoy
        </a>
      </div>
    </div>
  </div>
</main>
