export const ETAPAS = {
  'nuevo': 'Nuevo — sin contacto previo',
  'contactado': 'En conversación — primer contacto realizado',
  'visita': 'Recorrido agendado o realizado',
  'negociacion': 'Negociación activa — evaluando condiciones',
  'cerrado': 'Trato cerrado',
  'descartado': 'Descartado'
};

export const etapaLegible = (estado) => ETAPAS[estado] ?? estado;
