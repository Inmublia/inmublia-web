// src/routes/admin/operaciones/[broker_id]/impersonar/+server.js
import { redirect, error } from '@sveltejs/kit';
import { logAuditEvent } from '$lib/server/audit'; 

export async function POST(event) {
    const brokerIdToImpersonate = event.params.broker_id;
    const { user } = await event.locals.safeGetSession();

    if (!event.locals.rol_interno) {
        throw error(403, 'No tienes permisos operativos para impersonar cuentas.');
    }

    event.cookies.set('inmublia_shadow_tenant', brokerIdToImpersonate, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15 // 15 minutos
    });

    logAuditEvent(event, {
        agencyId: brokerIdToImpersonate,
        actorId: user.id,
        actionType: 'admin.impersonation.started',
        status: 'warning',
        metadata: { mensaje: 'Sesión de soporte (Solo Lectura) iniciada por 15 minutos.' }
    });

    throw redirect(303, '/admin');
}
