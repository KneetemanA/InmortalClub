export function inputDate(value = new Date().toISOString()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(k => parts.find(p => p.type === k)!.value).join('-');
}
export const paymentMethodLabel = (method: string) => ({ CASH: 'Efectivo', TRANSFER: 'Transferencia', MIXED: 'Efectivo + transferencia' }[method] || method);

export function memberExpiration(member: { importedExpirationDate?: string | null; payments?: {status:string;expirationDate:string}[] }) {
  const dates=(member.payments || []).filter(p=>p.status==='PAID').map(p=>p.expirationDate);
  if(member.importedExpirationDate)dates.push(member.importedExpirationDate);
  return dates.sort((a,b)=>new Date(b).getTime()-new Date(a).getTime())[0];
}
