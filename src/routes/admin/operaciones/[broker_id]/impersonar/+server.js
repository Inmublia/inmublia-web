import { redirect, error } from '@sveltejs/kit';
import { logAuditEvent } from '$lib/server/audit'; // Asegúrate que esta ruta a tu audit.js sea correcta

export async function POST(event) {
    const brokerIdToImpersonate = event.params.broker_id;
    const { user } = await event.locals.safeGetSession();

    // Validar Rol Interno por seguridad
    if (!event.locals.rol_interno) {
        throw error(403, 'No tienes permisos operativos para impersonar cuentas.');
    }

    // Inyectar la cookie de Sesión Sombra (15 minutos de vida máxima)
    event.cookies.set('inmublia_shadow_tenant', brokerIdToImpersonate, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15 
    });

    // Auditoría Zero-Latency
    logAuditEvent(event, {
        agencyId: brokerIdToImpersonate,
        actorId: user.id,
        actionType: 'admin.impersonation.started',
        status: 'warning',
        metadata: { mensaje: 'Sesión de soporte (Solo Lectura) iniciada por 15 minutos.' }
    });

    // Te teletransporta al Dashboard Maestro, pero ahora viendo los datos del cliente
    throw redirect(303, '/admin');
}
