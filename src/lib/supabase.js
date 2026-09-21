import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { building } from '$app/environment';

// 🛡️ BLINDAJE EDGE: 
// Si Cloudflare está en fase de compilación (building = true), anulamos la creación del cliente.
// Esto evita el crash de "supabaseUrl is required".
export const supabase = building 
    ? null 
    : createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
