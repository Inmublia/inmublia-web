<script>
  import { Shield, Scale, Database, Trash2, BrainCircuit, Mail, Building2, ChevronRight, Lock } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Privacidad y Términos Legales | Inmublia CRM</title>
  <meta name="description" content="Aviso de privacidad, términos de servicio e instrucciones de eliminación de datos para usuarios de Inmublia CRM.">
</svelte:head>

<!-- Fondo general claro -->
<div class="fixed inset-0 bg-[#F8FAFC] -z-10 pointer-events-none"></div>

<div class="w-full min-h-screen flex flex-col font-sans selection:bg-indigo-500/30">
  
  <!-- ENCABEZADO PANORÁMICO (Homologado con el CRM) -->
  <header class="w-full bg-zinc-950 text-white pt-16 pb-28 px-6 sm:px-10 relative overflow-hidden shrink-0">
    <!-- Efecto de luz de fondo -->
    <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>

    <div class="w-full max-w-[1200px] mx-auto relative z-10 flex flex-col items-center text-center">
      <div class="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
        <Scale class="w-7 h-7 text-indigo-400" />
      </div>
      <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-zinc-50 mb-3">
        Privacidad y Términos de Servicio
      </h1>
      <p class="text-zinc-400 text-sm font-medium flex items-center justify-center gap-2">
        <Lock class="w-4 h-4" /> Centro de Transparencia y Seguridad de Inmublia
      </p>
    </div>
  </header>

  <!-- CONTENIDO PRINCIPAL -->
  <main class="w-full flex-1 relative z-20 -mt-16 px-4 sm:px-10 pb-20">
    <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-8 items-start">
      
      <!-- ÍNDICE LATERAL (Estilo Dashboard Settings) -->
      <aside class="hidden md:block w-72 shrink-0 sticky top-8">
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Navegación Legal</p>
          <nav class="flex flex-col gap-1.5">
            <a href="#identidad" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group">
              <Building2 class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> Identidad y Responsabilidad
            </a>
            <a href="#datos-meta" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group">
              <Database class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> Integración con Meta
            </a>
            <a href="#inteligencia" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group">
              <BrainCircuit class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> Procesamiento IA
            </a>
            <div class="h-px w-full bg-slate-100 my-2"></div>
            <a href="#eliminacion" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors group">
              <Trash2 class="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" /> Eliminación de Datos
            </a>
            <a href="#contacto" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors group">
              <Shield class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" /> Derechos ARCO
            </a>
          </nav>
        </div>
      </aside>

      <!-- TARJETAS DE CONTENIDO LEGAL -->
      <div class="flex-1 w-full space-y-6">
        
        <!-- SECCIÓN 1 -->
        <section id="identidad" class="scroll-mt-8 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Building2 class="w-5 h-5 text-indigo-600"/>
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Identidad y Domicilio del Responsable</h2>
          </div>
          <div class="prose prose-sm prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
            <p>En estricto cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de los Estados Unidos Mexicanos y normativas internacionales de privacidad digital, la plataforma <strong>Inmublia</strong> (en adelante "El Sistema", "La Plataforma" o "Nosotros"), operada desde Guadalajara, Jalisco, México, se constituye como el responsable principal del tratamiento, uso, confidencialidad y protección de sus datos personales y comerciales.</p>
            <p>La presente política regula el uso de los servicios en la nube proporcionados por Inmublia, estableciendo los lineamientos técnicos y legales bajo los cuales procesamos la información que usted confía a nuestra infraestructura.</p>
          </div>
        </section>

        <!-- SECCIÓN 2 -->
        <section id="datos-meta" class="scroll-mt-8 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <Database class="w-5 h-5 text-blue-600"/>
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Datos Recopilados de Meta Platforms</h2>
          </div>
          <div class="prose prose-sm prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
            <p>Para habilitar el ecosistema de "Marketing en Redes", Inmublia requiere establecer una conexión segura mediante API con los servidores de Meta (Facebook e Instagram). Al autorizar esta conexión, nuestro sistema recopila y almacena <strong>estricta y exclusivamente</strong> los siguientes puntos de datos:</p>
            
            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5 my-6">
              <ul class="space-y-3 m-0 list-none pl-0">
                <li class="flex items-start gap-3">
                  <ChevronRight class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Tokens de acceso OAuth 2.0:</strong> Claves criptográficas temporales, cifradas de extremo a extremo en nuestras bases de datos, que permiten a nuestro servidor enviar instrucciones de publicación.</span>
                </li>
                <li class="flex items-start gap-3">
                  <ChevronRight class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Identificadores de Entidad (IDs):</strong> Números de identificación públicos de su Página Comercial de Facebook y/o Cuenta Profesional de Instagram.</span>
                </li>
                <li class="flex items-start gap-3">
                  <ChevronRight class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span><strong>Metadatos de Perfil:</strong> El nombre de usuario (handle) utilizado para confirmar visualmente la conexión en su panel de control.</span>
                </li>
              </ul>
            </div>

            <p class="text-sm border-l-4 border-blue-500 pl-4 py-1 bg-white"><strong>Garantía de Aislamiento:</strong> Inmublia utiliza estos tokens con el único propósito de enviar el contenido que usted genere (fotografías y textos de propiedades) hacia sus redes sociales. Inmublia <strong>NO lee, NO rastrea, NO descarga ni almacena</strong> mensajes privados (DMs), comentarios de sus clientes, listas de amigos, ni información personal ajena al estricto flujo de publicación autorizada.</p>
          </div>
        </section>

        <!-- SECCIÓN 3 -->
        <section id="inteligencia" class="scroll-mt-8 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
              <BrainCircuit class="w-5 h-5 text-purple-600"/>
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Procesamiento mediante IA</h2>
          </div>
          <div class="prose prose-sm prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
            <p>Inmublia integra capacidades avanzadas de Inteligencia Artificial (Modelos de Lenguaje Grande o LLMs) a través de proveedores de infraestructura global como Cloudflare AI para potenciar funciones como la autogeneración de <em>captions</em> o guiones de seguimiento.</p>
            <p>Al utilizar estas herramientas, usted acepta que las características de las propiedades o historiales fragmentados sean procesados temporalmente en la nube. <strong>Inmublia asegura por diseño que la información comercial o los datos de sus prospectos NO son almacenados ni utilizados por nuestros proveedores para entrenar, refinar o mejorar modelos de Inteligencia Artificial públicos.</strong> Su información operativa permanece aislada y transitoria durante este proceso.</p>
          </div>
        </section>

        <!-- SECCIÓN 4 (Eliminación - Estilo Resaltado) -->
        <section id="eliminacion" class="scroll-mt-8 bg-gradient-to-b from-white to-rose-50/30 border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-400 to-rose-600"></div>
          <div class="flex items-center gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
              <Trash2 class="w-5 h-5 text-rose-600"/>
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Eliminación de Datos (Data Deletion Policy)</h2>
          </div>
          <div class="prose prose-sm prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
            <p>En total cumplimiento con las políticas para desarrolladores de Meta Platforms, Inc. y el Reglamento General de Protección de Datos (GDPR), usted posee el control técnico y legal absoluto para revocar accesos y destruir sus registros de conexión en cualquier instante. Existen dos métodos automatizados:</p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              <!-- Vía A -->
              <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span class="bg-slate-100 text-slate-500 px-2 py-1 rounded">Vía 1</span> Desde Inmublia
                </h3>
                <ol class="space-y-2 text-sm text-slate-600 list-decimal pl-4 m-0 font-medium marker:text-slate-400 marker:font-black">
                  <li>Inicie sesión en su cuenta de Inmublia.</li>
                  <li>Navegue al panel de <strong>Configuración > Redes</strong>.</li>
                  <li>Haga clic en <strong>"Desconectar"</strong> junto a su plataforma.</li>
                  <li>Inmublia ejecutará una <strong>destrucción criptográfica y purga inmediata</strong> de sus tokens de la base de datos maestra.</li>
                </ol>
              </div>

              <!-- Vía B -->
              <div class="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm relative">
                <div class="absolute top-4 right-4"><Shield class="w-4 h-4 text-rose-300"/></div>
                <h3 class="text-xs font-black text-rose-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span class="bg-rose-100 text-rose-600 px-2 py-1 rounded">Vía 2</span> Desde Meta
                </h3>
                <ol class="space-y-2 text-sm text-slate-600 list-decimal pl-4 m-0 font-medium marker:text-rose-400 marker:font-black">
                  <li>Acceda a Configuración y Privacidad en Facebook.</li>
                  <li>Diríjase a la sección de <strong>"Apps y sitios web"</strong>.</li>
                  <li>Localice "Inmublia CRM" y seleccione <strong>"Eliminar"</strong>.</li>
                  <li>Meta invalidará los tokens en sus servidores, provocando que Inmublia pierda todo acceso de forma unilateral e irrevocable.</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 5 -->
        <section id="contacto" class="scroll-mt-8 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-center gap-4 mb-6">
            <div class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <Shield class="w-5 h-5 text-slate-600"/>
            </div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Derechos ARCO y Contacto de Privacidad</h2>
          </div>
          <div class="prose prose-sm prose-slate max-w-none text-slate-600 font-medium leading-relaxed">
            <p>Usted conserva en todo momento la titularidad sobre sus datos. Conforme a la legislación vigente, usted puede ejercer libremente sus derechos para:</p>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 mb-6 list-none pl-0">
              <li class="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100"><strong>(A) Acceder</strong> a sus registros y expedientes.</li>
              <li class="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100"><strong>(R) Rectificar</strong> información inexacta.</li>
              <li class="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100"><strong>(C) Cancelar</strong> su cuenta y destruir su entorno.</li>
              <li class="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100"><strong>(O) Oponerse</strong> al tratamiento para fines específicos.</li>
            </ul>
            
            <div class="mt-8 p-6 bg-slate-900 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p class="text-white font-bold text-sm">Oficial de Privacidad de Datos</p>
                <p class="text-slate-400 text-xs mt-0.5">Gestión de solicitudes legales y técnicas.</p>
              </div>
              <a href="mailto:enrique.alzaga@gmail.com" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                <Mail class="w-4 h-4"/> Contactar Soporte
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  </main>
</div>

<style>
  html {
    scroll-behavior: smooth;
  }
</style>
