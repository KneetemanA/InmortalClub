export class PaymentInputError extends Error { statusCode = 400; }
export function splitPayment(amount: number, method: string, cash?: number) {
  const total = Math.round(amount * 100);
  if (!Number.isFinite(total) || total < 0) throw new PaymentInputError('Monto inválido');
  if (method === 'CASH') return { cashAmount: total / 100, transferAmount: 0 };
  if (method === 'TRANSFER') return { cashAmount: 0, transferAmount: total / 100 };
  if (method !== 'MIXED') throw new PaymentInputError('Método de pago inválido');
  const cents = Math.round(Number(cash) * 100);
  if (!Number.isFinite(cents) || cents <= 0 || cents >= total) {
    throw new PaymentInputError('El efectivo debe ser mayor que cero y menor que el total del pago');
  }
  return { cashAmount: cents / 100, transferAmount: (total - cents) / 100 };
}
export function argentinaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = (key: string) => Number(parts.find(p => p.type === key)!.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}
export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new PaymentInputError('Mes inválido (AAAA-MM)');
  const [year, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(year, m - 1, 1, 3)), end: new Date(Date.UTC(year, m, 1, 3)) };
}
export function proratedMonth(price: number, now = new Date()) {
  const { year, month, day } = argentinaDate(now);
  if (day <= 15) throw new PaymentInputError('El proporcional está disponible para altas después del día 15');
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { amount: Math.round(price * (days - day + 1) / days * 100) / 100,
    expirationDate: new Date(Date.UTC(year, month, 1, 3) - 1) };
}
