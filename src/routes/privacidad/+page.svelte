<script>
  import { Shield, Scale, Database, Trash2, BrainCircuit, Mail, Building2, ChevronRight } from 'lucide-svelte';
</script>

<svelte:head>
  <title>Privacidad y Términos Legales | Inmublia CRM</title>
  <meta name="description" content="Aviso de privacidad, términos de servicio e instrucciones de eliminación de datos para usuarios de Inmublia CRM.">
</svelte:head>

<div class="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-500/30">
  <!-- ENCABEZADO LEGAL -->
  <header class="bg-zinc-950 text-white pt-16 pb-12 px-6 border-b border-zinc-800">
    <div class="max-w-4xl mx-auto">
      <div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/30">
        <Scale class="w-6 h-6 text-indigo-400" />
      </div>
      <h1 class="text-3xl font-black tracking-tight mb-3">Aviso de Privacidad y Términos de Servicio</h1>
      <p class="text-zinc-400 text-sm font-medium">Última actualización: Septiembre de 2026 | Inmublia CRM</p>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-10">
    
    <!-- ÍNDICE LATERAL (Sticky) -->
    <aside class="hidden md:block w-64 shrink-0">
      <div class="sticky top-8 flex flex-col gap-2">
        <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Contenido Legal</p>
        <a href="#identidad" class="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-2 py-1"><ChevronRight class="w-3 h-3"/> Identidad y Domicilio</a>
        <a href="#datos-meta" class="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-2 py-1"><ChevronRight class="w-3 h-3"/> Datos de Meta e Instagram</a>
        <a href="#inteligencia" class="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-2 py-1"><ChevronRight class="w-3 h-3"/> Procesamiento con IA</a>
        <a href="#eliminacion" class="text-xs font-black text-rose-600 hover:text-rose-700 flex items-center gap-2 py-1 mt-2 bg-rose-50 px-2 rounded-lg"><Trash2 class="w-3 h-3"/> Eliminación de Datos</a>
      </div>
    </aside>

    <!-- CONTENIDO LEGAL -->
    <div class="flex-1 space-y-12 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200">
      
      <!-- SECCIÓN 1 -->
      <section id="identidad" class="scroll-mt-8">
        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
          <Building2 class="w-5 h-5 text-indigo-500"/> 1. Identidad y Domicilio del Responsable
        </h2>
        <div class="prose prose-sm text-slate-600 leading-relaxed">
          <p>En cumplimiento con la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de los Estados Unidos Mexicanos, Inmublia (en adelante "El Sistema" o "Nosotros"), operado por Enrique Alzaga Vargas, con domicilio en Guadalajara, Jalisco, México, es el responsable del tratamiento, uso y protección de sus datos personales y profesionales.</p>
        </div>
      </section>

      <!-- SECCIÓN 2: META (El Core del problema de FB) -->
      <section id="datos-meta" class="scroll-mt-8">
        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
          <Database class="w-5 h-5 text-indigo-500"/> 2. Datos Recopilados de Meta (Facebook/Instagram)
        </h2>
        <div class="prose prose-sm text-slate-600 leading-relaxed">
          <p>Para la funcionalidad de "Marketing en Redes", Inmublia requiere integrarse con las APIs de Meta (Facebook e Instagram). Al conectar su cuenta, recopilamos <strong>exclusivamente</strong> los siguientes datos:</p>
          <ul class="list-disc pl-5 mt-2 space-y-1 font-medium text-slate-700">
            <li>Tokens de acceso OAuth 2.0 (cifrados de extremo a extremo en nuestras bases de datos).</li>
            <li>Identificadores públicos de su Página de Facebook y/o Cuenta Profesional de Instagram.</li>
            <li>El nombre de usuario público (handle) de sus perfiles comerciales.</li>
          </ul>
          <p class="mt-3"><strong>Uso de estos datos:</strong> Inmublia utiliza estos tokens con el único propósito de automatizar la publicación de sus propiedades inmobiliarias en sus perfiles, a petición expresa suya mediante un clic en la plataforma. <strong>Inmublia no lee, no descarga, ni almacena mensajes privados, comentarios, listas de amigos o datos personales ajenos al flujo de publicación.</strong></p>
        </div>
      </section>

      <!-- SECCIÓN 3: IA -->
      <section id="inteligencia" class="scroll-mt-8">
        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
          <BrainCircuit class="w-5 h-5 text-indigo-500"/> 3. Procesamiento mediante Inteligencia Artificial
        </h2>
        <div class="prose prose-sm text-slate-600 leading-relaxed">
          <p>Inmublia utiliza Infraestructura de Modelos de Lenguaje Grande (LLMs) aprovisionados a través de Cloudflare AI para la generación de textos de marketing y minutas. </p>
          <p>Usted acepta que los datos de las propiedades que ingrese serán procesados por estas entidades de forma temporal para generar las respuestas. <strong>Garantizamos que sus datos comerciales o la información de sus prospectos NO son utilizados para entrenar modelos de Inteligencia Artificial públicos ni privados.</strong></p>
        </div>
      </section>

      <!-- SECCIÓN 4: ELIMINACIÓN DE DATOS (Vital para Meta) -->
      <section id="eliminacion" class="scroll-mt-8 bg-rose-50 p-6 rounded-2xl border border-rose-100">
        <h2 class="text-lg font-black text-rose-900 flex items-center gap-2 mb-4">
          <Trash2 class="w-5 h-5 text-rose-500"/> 4. Instrucciones para la Eliminación de Datos (Data Deletion)
        </h2>
        <div class="prose prose-sm text-rose-800 leading-relaxed">
          <p>De acuerdo con las normativas de privacidad internacionales y las políticas de Meta Platforms, Inc., usted tiene el derecho absoluto de revocar el acceso y eliminar sus datos en cualquier momento. Puede hacerlo mediante dos vías:</p>
          
          <h3 class="font-bold mt-4 mb-1 text-rose-950">Vía A: Desde el CRM Inmublia</h3>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Inicie sesión en su cuenta de Inmublia.</li>
            <li>Navegue a <strong>Configuración > Redes</strong>.</li>
            <li>Haga clic en el botón <strong>"Desconectar"</strong> junto a su cuenta de Facebook/Instagram.</li>
            <li>Al hacerlo, nuestro sistema ejecutará una destrucción criptográfica inmediata de sus tokens en nuestra base de datos en Supabase.</li>
          </ol>

          <h3 class="font-bold mt-4 mb-1 text-rose-950">Vía B: Desde Facebook (Revocación Remota)</h3>
          <ol class="list-decimal pl-5 space-y-1">
            <li>Vaya al panel de Configuración y Privacidad de su cuenta de Facebook.</li>
            <li>Busque la sección <strong>"Apps y sitios web"</strong>.</li>
            <li>Localice la aplicación "Inmublia CRM" y haga clic en <strong>"Eliminar"</strong>.</li>
            <li>Al ejecutar esta acción, Meta invalidará los tokens automáticamente e Inmublia perderá todo acceso de forma irreversible.</li>
          </ol>
        </div>
      </section>

      <!-- SECCIÓN 5: DERECHOS ARCO -->
      <section id="contacto" class="scroll-mt-8 border-t border-slate-100 pt-8">
        <h2 class="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
          <Shield class="w-5 h-5 text-indigo-500"/> 5. Derechos ARCO y Contacto
        </h2>
        <div class="prose prose-sm text-slate-600 leading-relaxed">
          <p>Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal (Rectificación); que la eliminemos de nuestros registros (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición). </p>
          <p class="mt-4 flex items-center gap-2 font-bold text-slate-800">
            <Mail class="w-4 h-4 text-slate-400" /> Para ejercer sus derechos ARCO: <a href="mailto:enrique.alzaga@gmail.com" class="text-indigo-600 hover:underline">enrique.alzaga@gmail.com</a>
          </p>
        </div>
      </section>

    </div>
  </main>
</div>
