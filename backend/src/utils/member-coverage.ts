export function memberExpiration(member: { importedExpirationDate?: Date | null; payments?: {status:string;expirationDate:Date}[] }) {
  const dates=(member.payments || []).filter(p=>p.status==='PAID').map(p=>p.expirationDate.getTime());
  if(member.importedExpirationDate)dates.push(member.importedExpirationDate.getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
}
