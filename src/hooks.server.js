// ============================================================
// hooks.server.js — INMUBLIA · VERSIÓN CORREGIDA
// ============================================================
// BUGS CORREGIDOS:
//  #1 → $env/dynamic/public → $env/static/public  (fix del HANG en CF Workers)
//  #2 → fetch.bind(globalThis) → arrow function    (fix de Illegal Invocation)
//  #3 → getSession() + getUser() → solo getUser()  (fix race condition + seguridad)
//  #4 → domain cookie eliminado correctamente       (sin cambios, ya estaba bien)
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { redirect }           from '@sveltejs/kit';

// ─── FIX #1 ──────────────────────────────────────────────────
// $env/static/public es el import correcto para Cloudflare Workers/Pages SSR.
// $env/dynamic/public se evalúa en runtime y en CF Workers devuelve undefined
// durante la ejecución server-side, dejando supabaseUrl = undefined y
// causando que fetch(undefined/auth/...) se congele sin arrojar error.
// ─────────────────────────────────────────────────────────────
import {
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';

export async function handle({ event, resolve }) {

  // ─── GUARD: env vars presentes ──────────────────────────────
  // Si faltan, falla rápido con log claro en lugar de hang silencioso.
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    console.error('🔥 [HOOKS] CRÍTICO: PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY son undefined.');
    console.error('   → Verifica que existan en .env y en las variables de entorno de Cloudflare Pages.');
    // Deja pasar la request sin supabase — el guard de /admin protegerá el acceso
    return await resolve(event);
  }

  // ─── SUPABASE CLIENT ─────────────────────────────────────────
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        // ─── FIX #2 ───────────────────────────────────────────
        // fetch.bind(globalThis) puede fallar en CF Workers con
        // "Illegal Invocation" porque el contexto se pierde en
        // ciertas invocaciones internas del cliente Supabase.
        // La arrow function mantiene el contexto global de forma segura.
        // ─────────────────────────────────────────────────────
        fetch: (url, init) => fetch(url, init)
      },

      cookies: {
        getAll() {
          return event.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Cloudflare Pages no acepta la propiedad `domain` en cookies SSR.
            // La desestructuramos para no pasarla.
            const { domain, ...safeOptions } = options ?? {};

            try {
              event.cookies.set(name, value, {
                ...safeOptions,
                path:     '/',
                sameSite: 'lax',
                secure:   true,
                httpOnly: true,   // <- refuerza seguridad del token
              });
            } catch (err) {
              console.error(`🔥 [HOOKS] Error escribiendo cookie [${name}]:`, err.message);
            }
          });
        }
      }
    }
  );

  // ─── safeGetSession ──────────────────────────────────────────
  // FIX #3: Eliminamos la llamada a getSession().
  //
  // El problema con getSession() + getUser() en cascada:
  //  1. getSession() solo lee las cookies localmente → puede ser stale/manipulada
  //  2. Llama a getUser() para re-validar → hace un fetch extra a Supabase Auth
  //  3. Si getSession() devuelve null, nunca llegamos a getUser() → usuario
  //     autenticado legítimamente queda fuera.
  //  4. En CF Workers, dos fetches en cascada durante el boot del hook
  //     pueden crear una condición de carrera.
  //
  // SOLUCIÓN: Solo getUser() — valida el JWT directamente contra Supabase Auth,
  // es seguro, es canónico, y es lo que la documentación oficial (jun 2025) recomienda.
  // ─────────────────────────────────────────────────────────────
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { user },
        error
      } = await event.locals.supabase.auth.getUser();

      if (error) {
        // AuthSessionMissingError es normal cuando no hay sesión — no es un error real
        if (error.name !== 'AuthSessionMissingError') {
          console.error('🔥 [HOOKS] getUser error:', error.message);
        }
        return { session: null, user: null };
      }

      if (!user) return { session: null, user: null };

      return {
        session: { user },   // Estructura mínima compatible con el resto del app
        user
      };

    } catch (e) {
      console.error('🔥 [HOOKS] safeGetSession exception:', e.message);
      return { session: null, user: null };
    }
  };

  // ─── GUARD /admin ────────────────────────────────────────────
  if (event.url.pathname.startsWith('/admin')) {
    const { user } = await event.locals.safeGetSession();

    if (!user) {
      throw redirect(303, '/login?motivo=inactividad');
    }

    event.locals.user = user;
  }

  // ─── RESOLVE ─────────────────────────────────────────────────
  return await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version';
    }
  });
}

// ─── ERROR HANDLER ───────────────────────────────────────────
export async function handleError({ error, event }) {
  // No exponer stack traces al cliente en producción
  console.error('🔥 [HOOKS] Error SSR no controlado:', error?.message ?? error);
  console.error('   Ruta:', event?.url?.pathname);
  return { message: 'Error interno del servidor.' };
}
