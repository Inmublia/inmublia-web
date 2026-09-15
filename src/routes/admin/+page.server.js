// src/routes/admin/+page.server.js
import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals, setHeaders, url, depends }) {
  depends('supabase:auth');

  const { session, user } = await locals.safeGetSession();

  if (!user) {
    if (url.pathname.startsWith('/login') || url.pathname.startsWith('/admin/bienvenida')) return {};
    throw redirect(303, '/login?motivo=inactividad');
  }

  try {
    const { data: broker, error: brokerError } = await locals.supabase
      .from('brokers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (brokerError || !broker) throw new Error("Broker no encontrado");

    const now = new Date();
    const nowIso = now.toISOString();

    const { data: alertasPendientes, error: alertasError } = await locals.supabase
      .from('lead_notas')
      .select('id, contenido, fecha_recordatorio, completado, leads(id, nombre)')
      .eq('broker_id', broker.id)
      .eq('tipo', 'recordatorio')
      .eq('completado', false)
      .lte('fecha_recordatorio', nowIso); 

    if (alertasError) console.error("Error cargando alertas:", alertasError);

    const { data: propiedadesRaw, error: propError } = await locals.supabase
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
        fecha_vendida,
        open_houses(id, event_date, time_end)
      `)
      .eq('broker_id', broker.id)
      .order('creado_en', { ascending: false });

    if (propError) console.error("Error cargando propiedades:", propError);

    // EL MOTOR DE FOMO: Filtramos propiedades vendidas hace más de 3 días
    const propiedades = (propiedadesRaw || []).filter(p => {
      if (p.estatus === 'Vendida' && p.fecha_vendida) {
        const fechaVendida = new Date(p.fecha_vendida);
        const diasTranscurridos = (now - fechaVendida) / (1000 * 60 * 60 * 24);
        return diasTranscurridos <= 3;
      }
      return true;
    });

    return {
      session,
      user,
      broker,
      alertas: alertasPendientes || [],
      propiedades: propiedades
    };

  } catch (err) {
    console.error("Error en admin page server:", err);
    return { session, user, broker: null, alertas: [], propiedades: [] };
  }
}

export const actions = {
  marcarVendida: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const idPropiedad = formData.get('id');

    if (!idPropiedad) return fail(400, { error: 'ID no proporcionado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'No autorizado' });

    const { error } = await locals.supabase
      .from('propiedades')
      .update({ 
        estatus: 'Vendida', 
        fecha_vendida: new Date().toISOString() 
      })
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id);

    if (error) return fail(500, { error: 'Fallo al actualizar estatus.' });
    return { success: true };
  },

  // 🚀 LA NUEVA ACCIÓN DE SEGURIDAD: Revertir a Activa
  deshacerVendida: async ({ request, locals }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const idPropiedad = formData.get('id');

    if (!idPropiedad) return fail(400, { error: 'ID no proporcionado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'No autorizado' });

    const { error } = await locals.supabase
      .from('propiedades')
      .update({ 
        estatus: 'Activa', 
        fecha_vendida: null // Borramos la fecha para resetear el reloj
      })
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id);

    if (error) return fail(500, { error: 'Fallo al revertir estatus.' });
    return { success: true };
  },

  eliminar: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(401, { error: 'No autorizado' });

    const formData = await request.formData();
    const idPropiedad = formData.get('id');

    if (!idPropiedad) return fail(400, { error: 'ID de propiedad no proporcionado' });

    const { data: broker } = await locals.supabase
      .from('brokers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!broker) return fail(403, { error: 'Perfil de agencia no encontrado' });

    const { data: propiedad } = await locals.supabase
      .from('propiedades')
      .select('imagen_url, galeria_urls')
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id)
      .single();

    if (propiedad && platform?.env?.INMUBLIA_BUCKET) {
      const keysToDelete = [];
      const extractKey = (url) => {
        if (!url) return null;
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.pathname.slice(1);
        } catch(e) { return null; }
      };

      const heroKey = extractKey(propiedad.imagen_url);
      if (heroKey) keysToDelete.push(heroKey);

      if (propiedad.galeria_urls && Array.isArray(propiedad.galeria_urls)) {
        propiedad.galeria_urls.forEach(url => {
          const key = extractKey(url);
          if (key) keysToDelete.push(key);
        });
      }

      for (const key of keysToDelete) {
        try { await platform.env.INMUBLIA_BUCKET.delete(key); } 
        catch (e) { console.error(`Fallo al borrar ${key} de R2:`, e); }
      }
    }

    const { error: deleteError } = await locals.supabase
      .from('propiedades')
      .delete()
      .eq('id', idPropiedad)
      .eq('broker_id', broker.id);

    if (deleteError) return fail(500, { error: 'No se pudo eliminar la propiedad.' });

    return { success: true };
  }
};
