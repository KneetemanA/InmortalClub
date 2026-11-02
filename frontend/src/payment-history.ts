import type { Payment } from './types';

export type PaymentOrder = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'amount-desc' | 'amount-asc';
type Filters = { query: string; fromDate: string; toDate: string; dateField: 'paymentDate' | 'expirationDate'; order: PaymentOrder };
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim();
// Las fechas de las cuotas y su visualización usan el día calendario argentino.
const dayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' });
function day(value: string) {
  const parts = dayFormatter.formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key)!.value).join('-');
}

export function filterPayments(payments: Payment[], filters: Filters): Payment[] {
  const { query, fromDate, toDate, dateField, order } = filters;
  if (fromDate && toDate && fromDate > toDate) return [];
  const search = normalize(query);
  return payments.filter(payment => {
    const member = payment.member;
    if (!normalize(`${member?.firstName || ''} ${member?.lastName || ''} ${member?.dni || ''}`).includes(search)) return false;
    const date = day(payment[dateField]);
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate);
  }).sort((a, b) => {
    let comparison: number;
    if (order.startsWith('name')) {
      const name = (p: Payment) => `${p.member?.lastName || ''} ${p.member?.firstName || ''}`;
      comparison = name(a).localeCompare(name(b), 'es', { sensitivity: 'base' });
    } else if (order.startsWith('amount')) {
      comparison = Number(a.finalAmount) - Number(b.finalAmount);
    } else {
      comparison = new Date(a[dateField]).getTime() - new Date(b[dateField]).getTime();
    }
    return (order.endsWith('desc') ? -comparison : comparison) || a.id.localeCompare(b.id);
  });
}
