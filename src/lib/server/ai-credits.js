export function getRpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

export async function reserveAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('reservar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const reservation = getRpcRow(data);
  if (error || !reservation?.reserved) return null;
  return reservation;
}

export async function confirmAiCredit(supabase, userId, requestId) {
  const { data, error } = await supabase.rpc('confirmar_consumo_credito_ia', { p_user_id: userId, p_request_id: requestId });
  const confirmation = getRpcRow(data);
  return !error && confirmation?.confirmed === true;
}

export async function refundAiCredit(supabase, userId, requestId) {
  const { error } = await supabase.rpc('reembolsar_credito_ia', { p_user_id: userId, p_request_id: requestId });
  if (error) console.error('[Refund Error]', { requestId, message: error.message });
}
