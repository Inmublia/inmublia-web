import { supabaseAdmin } from './supabase-admin.js';

export function getRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

// ============================================================================
// INMUBLIA AI ENTITLEMENT ENGINE V6 (SRE CERTIFIED)
// ============================================================================

/**
 * Consulta el estado actual de los créditos del broker.
 * Devuelve el saldo disponible y la fecha de expiración del periodo.
 */
export async function getAiCreditStatus(brokerId) {
  const { data, error } = await supabaseAdmin.rpc('api_get_ai_credit_status', { 
    p_broker_id: brokerId 
  });
  
  if (error) return { ok: false, error: 'INTERNAL_ERROR' }; 
  return getRpcRow(data) ?? { ok: false, error: 'INTERNAL_ERROR' };
}

/**
 * Inicia una transacción idempotente. Reserva 1 crédito temporalmente
 * y registra la operación como 'running'.
 */
export async function reserveAiCredit(brokerId, requestId, actorUserId) {
  const { data, error } = await supabaseAdmin.rpc('api_reserve_ai_credit', { 
    p_broker_id: brokerId, 
    p_request_id: requestId, 
    p_actor_id: actorUserId 
  });
  
  if (error) return { ok: false, error: 'INTERNAL_ERROR' };
  return getRpcRow(data) ?? { ok: false, error: 'INTERNAL_ERROR' };
}

/**
 * Confirma atómicamente el consumo de la reserva.
 * Descuenta el saldo de forma definitiva y guarda el resultado de la IA.
 */
export async function confirmAiCredit(brokerId, requestId, aiResultJson) {
  const { data, error } = await supabaseAdmin.rpc('api_consume_ai_credit', { 
    p_broker_id: brokerId, 
    p_request_id: requestId, 
    p_result: aiResultJson 
  });
  
  if (error) return { ok: false, error: 'INTERNAL_ERROR' };
  return getRpcRow(data) ?? { ok: false, error: 'INTERNAL_ERROR' };
}

/**
 * Libera un crédito reservado si la IA falló formalmente.
 * Registra el código de error en la tabla de operaciones para auditoría.
 */
export async function releaseAiCredit(brokerId, requestId, errorCode = 'API_ERROR') {
  const { data, error } = await supabaseAdmin.rpc('api_release_ai_credit', { 
    p_broker_id: brokerId, 
    p_request_id: requestId, 
    p_error_code: errorCode 
  });
  
  if (error) return { ok: false, error: 'INTERNAL_ERROR' };
  return getRpcRow(data) ?? { ok: false, error: 'INTERNAL_ERROR' };
}

/**
 * AMBIGUITY RESOLVER (Motor de Resiliencia)
 * Consulta el estado real de una operación en caso de caída de red (HTTP 502).
 */
export async function getAiGenerationOperation(brokerId, requestId) {
  const { data, error } = await supabaseAdmin.rpc('api_get_ai_generation_operation', { 
    p_broker_id: brokerId, 
    p_request_id: requestId 
  });
  
  if (error) return { ok: false, error: 'INTERNAL_ERROR' }; 
  return getRpcRow(data) ?? { ok: false, error: 'INTERNAL_ERROR' };
}
