// Un socio en "día de prueba" es un alta sin plan ni pago. Se identifica sin columnas nuevas:
// no tiene pagos (ni cancelados) y no proviene de la importación del Excel.
// Al registrarle su primer pago deja de estar en prueba automáticamente.
export const TRIAL_MEMBER_WHERE = { importKey: null, payments: { none: {} } };

export function isTrialMember(member: { importKey?: string | null; payments?: unknown[] }) {
  return !member.importKey && !(member.payments?.length);
}
