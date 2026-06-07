import { fail } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public'; // Variables dinámicas para compatibilidad con Cloudflare

export const actions = {
  // Recibimos el objeto 'event' activo del request directamente de SvelteKit
  ingresar: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      return fail(400, { error: 'Faltan credenciales', email });
    }

    const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

    // 1. Instanciamos un cliente de Supabase local para la acción.
    // Esto es el FIX CRÍTICO: Garantiza que las cookies se escriban en la cola activa de SvelteKit de este request.
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return event.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { 
              ...options, 
              path: '/' 
            });
          });
        }
      }
    });

    // 2. Iniciamos sesión en Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return fail(400, { error: 'Correo o contraseña incorrectos', email });
    }

    // 3. Forzamos la lectura inmediata de la sesión recién creada para volcar las cookies
    await supabase.auth.getSession();

    // 4. Retornamos éxito de manera limpia con el destino de redirección
    return { success: true, redirectTo: '/admin' };
  },

  recuperar: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get('email');

    if (!email) {
      return fail(400, { error: 'Por favor, ingresa tu correo electrónico.' });
    }

    const supabaseUrl = env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return event.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { 
              ...options, 
              path: '/' 
            });
          });
        }
      }
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://inmublia.com/recuperar-acceso',
    });

    if (error) {
      return fail(400, { error: error.message });
    }

    return { success: true, message: 'Te hemos enviado un enlace al correo para recuperar tu contraseña.' };
  }
};
