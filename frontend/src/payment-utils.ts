export function inputDate(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}
export const paymentMethodLabel = (method: string) => ({ CASH: 'Efectivo', TRANSFER: 'Transferencia', MIXED: 'Efectivo + transferencia' }[method] || method);
