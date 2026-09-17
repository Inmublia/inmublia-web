// src/lib/server/audit.js
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const supabaseAdmin = createClient(
  publicEnv.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

export function logAuditEvent(event, params) {
  const { agencyId, actorId, actionType, resourceId = null, status = 'success', metadata = {} } = params;

  const ip = event.request.headers.get('cf-connecting-ip') || 'desconocida';
  const userAgent = event.request.headers.get('user-agent') || 'desconocido';
  const impersonatorId = event.locals.impersonator?.id || null;

  const logPayload = {
    agency_id: agencyId,
    actor_id: actorId,
    impersonator_id: impersonatorId,
    action_type: actionType,
    resource_id: resourceId,
    status,
    metadata: {
      ...metadata,
      network: { ip, userAgent }
    }
  };

  const insertPromise = supabaseAdmin
    .from('audit_logs')
    .insert(logPayload)
    .then(({ error }) => {
      if (error) console.error('[FATAL] Fallo al escribir Audit Log:', error);
    });

  if (event.platform?.context?.waitUntil) {
    event.platform.context.waitUntil(insertPromise);
  } else {
    insertPromise.catch(() => {});
  }
}
