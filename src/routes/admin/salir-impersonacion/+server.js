import { redirect } from '@sveltejs/kit';
import { logAuditEvent } from '$lib/server/audit';

export async function POST(event) {
    const shadowTenant = event.cookies.get('inmublia_shadow_tenant');
    const { user } = await event.locals.safeGetSession();

    // Destruir la cookie de impersonación
    event.cookies.delete('inmublia_shadow_tenant', { path: '/' });

    // Registrar la salida en la auditoría del cliente
    if (shadowTenant && user) {
        logAuditEvent(event, {
            agencyId: shadowTenant,
            actorId: user.id,
            actionType: 'admin.impersonation.ended',
            status: 'success',
            metadata: { mensaje: 'Sesión de soporte finalizada manualmente.' }
        });
    }

    // Devolverte al Perfil 360 del broker que estabas viendo
    throw redirect(303, `/admin/operaciones/${shadowTenant || ''}`);
}
