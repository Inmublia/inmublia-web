import { fail, redirect } from '@sveltejs/kit';

export const actions = {
    ingresar: async (event) => {
        const formData = await event.request.formData();

        const email = String(formData.get('email') ?? '').trim();
        const password = String(formData.get('password') ?? '');

        // 1. Validación básica
        if (!email || !password) {
            return fail(400, {
                error: 'Faltan credenciales',
                email
            });
        }

        try {
            // ✅ 2. Usamos el cliente Supabase que ya vive en hooks.server.js
            const { error } = await event.locals.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                return fail(400, {
                    error: 'Correo o contraseña incorrectos',
                    email
                });
            }

            // ✅ 3. REDIRECT REAL del servidor (clave para que la sesión funcione)
            throw redirect(303, '/admin');

        } catch (err) {
            console.error('🔥 Login error:', err);

            return fail(500, {
                error: 'Error interno al iniciar sesión'
            });
        }
    },

    recuperar: async (event) => {
        const formData = await event.request.formData();
        const email = String(formData.get('email') ?? '').trim();

        // 1. Validación
        if (!email) {
            return fail(400, {
                error: 'Por favor, ingresa tu correo electrónico.'
            });
        }

        try {
            // ✅ usamos el mismo cliente SSR
            const { error } = await event.locals.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'https://inmublia.com/recuperar-acceso'
            });

            if (error) {
                return fail(400, {
                    error: error.message
                });
            }

            return {
                success: true,
                message: 'Te hemos enviado un enlace al correo para recuperar tu contraseña.'
            };

        } catch (err) {
            console.error('🔥 Recover error:', err);

            return fail(500, {
                error: 'Error interno al solicitar recuperación'
            });
        }
    }
};
