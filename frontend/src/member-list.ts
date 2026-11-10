import type { Member } from './types';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Sin búsqueda se conserva el listado de activos. Al buscar se recuperan también las bajas.
export function filterMemberList(members: Member[], query: string) {
  const text = normalize(query.trim());
  return members.filter(member => text
    ? normalize(`${member.firstName} ${member.lastName} ${member.dni || ''} ${member.email || ''}`).includes(text)
    : member.status === 'ACTIVE');
}

// Día de prueba: alta sin pagos que no proviene del Excel. Deja de serlo al registrar su primer pago.
export function isTrialMember(member: Pick<Member, 'importKey' | 'payments' | '_count'>) {
  return !member.importKey && !(member._count?.payments ?? member.payments?.length);
}
