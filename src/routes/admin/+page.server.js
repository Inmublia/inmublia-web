// src/routes/admin/+page.server.js
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  // 1. EL SELLO DE SEGURIDAD SVELTEKIT
  depends('supabase:auth');

  const { session, user } = await locals.safeGetSession();

  if (!user) {
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/admin/bienvenida')) return {};
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    // 2. EXTRACCIÓN DEL BROKER (Cargamos TODO con '*' para asegurar plan y estatus)
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    // 3. LA OPTIMIZACIÓN EXTREMA: Notas pendientes
    const now = new Date().toISOString();
    const { data: alertasPendientes, error: alertasError } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', now); 

    if (alertasError) console.error("Error cargando alertas:", alertasError);

    // 4. FIX CRÍTICO PARA EL PDF: Ampliamos el select para traer la descripción, métricas y la galería de fotos
    const { data: propiedades, error: propError } = await locals.supabase
      .from('propiedades')
      .select(`
        id, 
        titulo, 
        slug, 
        estatus, 
        precio, 
        operacion, 
        ubicacion, 
        imagen_url, 
        destacada,
        descripcion,
        recamaras,
        banos,
        medio_bano,
        estacionamientos,
        m2_construccion,
        m2_terreno,
        tipo,
        galeria_urls,
        open_houses(id, event_date, time_end)
      `)
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) console.error("Error cargando propiedades:", propError);

    // 5. RETORNO COMPLETO PARA LA VISTA
    return {
      session,
      user,
      broker,
      alertas: alertasPendientes || [],
      propiedades: propiedades || []
    };

  } catch (err) {
    console.error("Error en admin page server:", err);
    return { session, user, broker: null, alertas: [], propiedades: [] };
  }
}

// INYECCIÓN: ACCIÓN PARA ELIMINAR PROPIEDADES (Y BORRAR BASURA DE R2)
export const actions = {
  eliminar: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const idPropiedad = formData.get('id');

    if (!idPropiedad) {
      return fail(400, { error: 'ID de propiedad no proporcionado' });
    }

    // Seguridad: Verificar que la propiedad pertenece al broker actual
    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil de agencia no encontrado' });

    // Paso 1: Rescatar URLs para borrarlas del disco duro de R2
    const { data: propiedad } = await locals.supabase
      .from('propiedades')
      .select('imagen_url, galeria_urls')
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id)
      .single();

    if (propiedad && platform?.env?.INMUBLIA_BUCKET) {
      const keysToDelete = [];
      const cdnUrlBase = platform?.env?.CDN_URL || 'https://cdn.inmuvia.com';
      
      // Función para extraer el nombre real del archivo (la Key de R2)
      const extractKey = (url) => {
        if (!url) return null;
        try {
          // Si la url es https://cdn.inmuvia.com/broker_id/foto.webp
          // La Key real para R2 es "broker_id/foto.webp"
          const parsedUrl = new URL(url);
          // slice(1) quita la barra diagonal inicial
          return parsedUrl.pathname.slice(1);
        } catch(e) {
          return null;
        }
      };

      const heroKey = extractKey(propiedad.imagen_url);
      if (heroKey) keysToDelete.push(heroKey);

      if (propiedad.galeria_urls && Array.isArray(propiedad.galeria_urls)) {
        propiedad.galeria_urls.forEach(url => {
          const key = extractKey(url);
          if (key) keysToDelete.push(key);
        });
      }

      // Borrar de Cloudflare R2
      for (const key of keysToDelete) {
        try {
          await platform.env.INMUBLIA_BUCKET.delete(key);
        } catch (e) {
          console.error(`Fallo al borrar ${key} de R2:`, e);
        }
      }
    }

    // Paso 2: Borrar registro de Supabase
    const { error: deleteError } = await locals.supabase
      .from('propiedades')
      .delete()
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id);

    if (deleteError) {
      console.error("Error al eliminar propiedad SQL:", deleteError);
      return fail(500, { error: 'No se pudo eliminar la propiedad.' });
    }

    return { success: true };
  }
};
