// src/routes/admin/salir-impersonacion/+server.js
import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export async function POST(event) {
    const shadowTenant = event.cookies.get('inmublia_shadow_tenant');
    const { user } = await event.locals.safeGetSession();

    // Eliminar la cookie instantáneamente
    event.cookies.delete('inmublia_shadow_tenant', { path: '/' });

    // Auditoría Inline
    if (shadowTenant && user) {
        const supabaseAdmin = createClient(publicEnv.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
        await supabaseAdmin.from('audit_logs').insert({
            agency_id: shadowTenant,
            actor_id: user.id,
            action_type: 'admin.impersonation.ended',
            status: 'success',
            metadata: { mensaje: 'Sesión de soporte finalizada manualmente.' }
        });
    }

    throw redirect(303, `/admin/operaciones/${shadowTenant || ''}`);
}
