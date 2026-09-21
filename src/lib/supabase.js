import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// 🚀 EL SEÑUELO: Durante el "npm run build" las variables dinámicas son undefined.
// Si le damos un string falso, Vite pasa de largo sin crashear (adiós Error: supabaseUrl is required).
// En Producción (tiempo de ejecución), Cloudflare inyectará tus llaves reales y se conectará.
const supabaseUrl = env.PUBLIC_SUPABASE_URL || 'https://build-placeholder.supabase.co';
const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder-key';

// Retornamos el cliente completo para que SvelteKit no renderice tu pantalla negra de error
export const supabase = createClient(supabaseUrl, supabaseKey);
