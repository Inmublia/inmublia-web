<script>
  import { page } from '$app/stores';
  let subdominio = $derived($page.url.searchParams.get('subdominio'));
  let urlAgencia = $derived(`https://${subdominio}.inmublia.com/login`);
</script>

<div class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    </div>
    
    <h1 class="text-2xl font-bold text-slate-800 mb-4">¡Tu plataforma está casi lista!</h1>
    
    <p class="text-slate-600 mb-6 leading-relaxed">
      Estamos configurando las rutas de alta velocidad y los certificados de seguridad para <strong class="text-slate-800">{subdominio}.inmublia.com</strong>.
    </p>

    <div class="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mb-8 text-sm text-left">
      <p class="font-semibold mb-1">Este proceso toma alrededor de 3 minutos.</p>
      <p>Guarda este enlace en tus favoritos. Una vez transcurrido este breve tiempo de propagación, podrás iniciar sesión y tomar el control de tu consola.</p>
    </div>

    <a 
      href={urlAgencia} 
      class="inline-block w-full bg-slate-900 text-white font-medium py-3 px-6 rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
    >
      Ir a mi Agencia
    </a>
  </div>
</div>
