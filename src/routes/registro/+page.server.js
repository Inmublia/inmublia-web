// src/routes/registro/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    
    const email = formData.get('email')?.toString().trim();
    const agencia = formData.get('agencia')?.toString().trim();
    const subdominio = formData.get('subdominio')?.toString().trim();
    const planId = formData.get('planId')?.toString().trim() || 'elite'; // Por defecto lo lanzamos a Elite

    if (!email || !agencia || !subdominio) {
      return fail(400, { error: 'Por favor completa todos los campos.' });
    }

    // 1. Generamos una clave provisional segura (Ej. Xk9#m2Pq)
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // 2. Creamos la cuenta en Supabase Auth
    const { data: authData, error: authError } = await locals.supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: { nombre_comercial: agencia }
      }
    });

    if (authError) {
      console.error("🔥 Error Auth:", authError);
      if (authError.message.includes('already registered')) {
        return fail(400, { error: 'Este correo ya tiene una cuenta. Inicia sesión.' });
      }
      return fail(500, { error: 'No pudimos crear tu cuenta de acceso. Intenta nuevamente.' });
    }

    // 3. Calculamos la fecha de expiración del Trial (14 días exactos)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // 4. Inyectamos el Tenant usando el Service Role para bypassear reglas RLS iniciales
    const db = createClient(publicEnv.PUBLIC_SUPABASE_URL, privateEnv.SUPABASE_SERVICE_ROLE_KEY);

    const { error: dbError } = await db.from('brokers').insert({
      auth_user_id: authData.user.id,
      email: email,
      nombre_comercial: agencia,
      subdominio: subdominio,
      plan_suscripcion: planId, // Le damos el plan que eligió (o Elite por defecto)
      status_suscripcion: 'trial', // 🚀 LA CLAVE MÁGICA: Estatus Trial
      trial_ends_at: trialEndsAt.toISOString()
    });

    if (dbError) {
      console.error("🔥 Error Creando Agencia:", dbError);
      // Si falla la DB por colisión de subdominio
      if (dbError.code === '23505') {
        return fail(400, { error: 'Alguien acaba de registrar este subdominio. Elige otro.' });
      }
      return fail(500, { error: 'Error al inicializar el espacio de tu agencia.' });
    }

    // 5. Redirección inmediata al dashboard. 
    // Pasamos la contraseña por URL solo esta primera vez para que la pantalla de bienvenida se la muestre.
    throw redirect(303, `/admin/bienvenida?pass=${encodeURIComponent(tempPassword)}`);
  }
};
