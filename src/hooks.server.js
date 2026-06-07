import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

export async function handle({ event, resolve }) {
    // Variables desde SvelteKit o desde Cloudflare Pages
    const supabaseUrl =
        env.PUBLIC_SUPABASE_URL || event.platform?.env?.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
        env.PUBLIC_SUPABASE_ANON_KEY || event.platform?.env?.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error(
            '🔥 [ERROR ENV]: PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY no están definidas.'
        );
    }

    event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                const svelteKitCookies = event.cookies.getAll();

                if (svelteKitCookies && svelteKitCookies.length > 0) {
                    return svelteKitCookies;
                }

                // Fallback defensivo por si el runtime edge no expone aún bien las cookies
                const rawCookieHeader = event.request.headers.get('cookie') || '';
                const parsedCookies = [];

                rawCookieHeader.split(';').forEach((cookieStr) => {
                    const parts = cookieStr.split('=');

                    if (parts.length >= 2) {
                        const name = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        parsedCookies.push({ name, value });
                    }
                });

                return parsedCookies;
            },

            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                    // Quitamos `domain` para evitar rechazos silenciosos del navegador
                    const { domain, ...cleanOptions } = options;

                    event.cookies.set(name, value, {
                        ...cleanOptions,
                        path: '/'
                    });
                });
            }
        }
    });

    event.locals.safeGetSession = async () => {
        try {
            const {
                data: { session }
            } = await event.locals.supabase.auth.getSession();

            if (!session) {
                return { session: null, user: null };
            }

            const {
                data: { user },
                error
            } = await event.locals.supabase.auth.getUser();

            if (error || !user) {
                return { session: null, user: null };
            }

            return { session, user };
        } catch (err) {
            console.error('🔥 [safeGetSession]:', err);
            return { session: null, user: null };
        }
    };

    // Proteger solo /admin y subrutas reales de /admin
    const isAdminRoute =
        event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/');

    if (isAdminRoute) {
        const { user } = await event.locals.safeGetSession();

        if (!user) {
            throw redirect(303, '/login?motivo=inactividad');
        }

        event.locals.user = user;
    }

    const response = await resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        }
    });

    // Cabeceras mínimas de seguridad
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
}

export async function handleError({ error, event }) {
    console.error('🔥 [ERROR CRÍTICO SSR]:', {
        message: error instanceof Error ? error.message : error,
        path: event.url.pathname
    });

    return {
        message: 'Fallo interno del servidor.'
    };
}
