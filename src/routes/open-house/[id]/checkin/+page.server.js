// src/routes/open-house/[id]/checkin/+page.server.js
import { fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
  // Cargamos datos básicos del evento para que la pantalla de Check-in se vea personalizada
  const { data: event } = await locals.supabase
    .from('open_houses')
    .select('title')
    .eq('id', params.id)
    .single();

  return { 
    eventTitle: event?.title || 'Open House Exclusivo' 
  };
}

export const actions = {
  // Esta acción captura el POST del formulario y elimina el Error 405
  default: async ({ request, params, locals }) => {
    const formData = await request.formData();
    const phoneRaw = formData.get('phone');

    if (!phoneRaw) {
      return fail(400, { error: 'Por favor, ingresa tu número de WhatsApp para validar el pase.' });
    }

    // Limpieza estricta: nos quedamos solo con los números (elimina espacios, guiones, etc)
    const cleanPhone = phoneRaw.replace(/\D/g, '');

    if (cleanPhone.length < 8) {
      return fail(400, { error: 'El formato del número es muy corto. Verifica tu información.' });
    }

    // 🚀 Llamamos a la función "Guardia de Seguridad" (RPC) que creamos en el Paso 1
    const { data: isSuccess, error: rpcError } = await locals.supabase.rpc('prospect_checkin', {
      p_open_house_id: params.id,
      p_phone: cleanPhone
    });

    if (rpcError) {
      console.error("[Check-in RPC Error]:", rpcError.message);
      return fail(500, { error: 'Error interno de validación. Informa al anfitrión.' });
    }

    if (!isSuccess) {
      return fail(400, { error: 'Acceso denegado. Número no registrado en lista o el pase ya fue utilizado.' });
    }

    return { success: true };
  }
};
